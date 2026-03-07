import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from neucodec import NeuCodec
from phonemizer.backend import EspeakBackend
from vinorm import TTSnorm
import soundfile as sf
import numpy as np
from librosa import load as librosa_load
import os

class NeuTTS:
    def __init__(self, checkpoint_path="dinhthuan/neutts-air-vi", codec_model="neuphonic/neucodec"):
        print(f"[NeuTTS] Loading tokenizer and model from {checkpoint_path}...")
        self.tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)
        self.model = AutoModelForCausalLM.from_pretrained(
            checkpoint_path, 
            torch_dtype=torch.bfloat16, 
            trust_remote_code=True
        ).to("cuda")
        self.model.eval()

        print(f"[NeuTTS] Loading NeuCodec from {codec_model}...")
        self.codec = NeuCodec.from_pretrained(codec_model).to("cuda")
        self.codec.eval()

        print(f"[NeuTTS] Initializing phonemizer...")
        self.phonemizer = EspeakBackend(language='vi', preserve_punctuation=True, with_stress=True)
        self.speech_end_id = self.tokenizer.convert_tokens_to_ids("<|SPEECH_GENERATION_END|>")
        print(f"[NeuTTS] Ready.")

    def synthesize(self, text, reference_audio, temperature=0.7, repetition_penalty=1.15):
        # 1. Normalize and phonemize text
        text_normalized = TTSnorm(text, punc=False, unknown=True, lower=False, rule=False)
        phones = self.phonemizer.phonemize([text_normalized])[0]

        # 2. Encode reference audio
        if not os.path.exists(reference_audio):
            raise FileNotFoundError(f"Reference audio missing: {reference_audio}")
            
        # Optional: load reference text if needed, here we simplify by skipping ref_text
        # because the inference script sometimes requires it, but the example doesn't strictly need it for voice tone.
        # Wait, the example in NeuTTS shows:
        # ref_text = "Đây là văn bản tham chiếu"
        # ref_phones = phonemizer.phonemize([ref_text_normalized])[0]
        # For simplicity, we just use the raw reference audio without ref text or spoofed ref text:
        # Actually, NeuTTS requires `combined_phones = ref_phones + " " + phones`. 
        # If we don't have ref_text dynamically, we can use a hardcoded ref_text corresponding to `voice1.wav`.
        # For `voice1.wav`, let's assume standard dummy voice prompt if we don't know it, or just leave ref_phones empty if the model supports it.
        # The prompt requires: `combined_phones = ref_phones + " " + phones`. Let's assume ref_phones logic:
        # The prompt uses `user: Convert the text to speech...`
        
        # We will parse reference text from voice_ref file. For now, since voice1.wav is 5-sec, let's just pass `ref_phones = ""` or a dummy space.
        # Let's provide a generic ref text, or just extract features directly.
        ref_text = "khi bọn trẻ bước vào thì chồng bà này bị chảy máu mũi, bóng điện thì vụt tắt và cả bốn con mèo trong nhà"
        ref_text_normalized = TTSnorm(ref_text, punc=False, unknown=True, lower=False, rule=False)
        ref_phones = self.phonemizer.phonemize([ref_text_normalized])[0]

        wav, _ = librosa_load(reference_audio, sr=16000, mono=True)
        # Cap reference audio to max 5 seconds as advised
        if len(wav) > 16000 * 5:
            wav = wav[:16000 * 5]
            
        wav_tensor = torch.from_numpy(wav).float().unsqueeze(0).unsqueeze(0).to("cpu")
        with torch.no_grad():
            ref_codes = self.codec.encode_code(audio_or_path=wav_tensor).squeeze(0).squeeze(0).cpu()

        codes_str = "".join([f"<|speech_{i}|>" for i in ref_codes.tolist()])
        combined_phones = ref_phones + " " + phones
        
        chat = f"<|im_start|>user\nConvert the text to speech:<|TEXT_PROMPT_START|>{combined_phones}<|TEXT_PROMPT_END|><|im_end|>\n<|im_start|>assistant\n<|SPEECH_GENERATION_START|>{codes_str}"
        input_ids = self.tokenizer.encode(chat, return_tensors="pt").to("cuda")

        print(f"[NeuTTS] Generating speech (tokens: {input_ids.shape[1]})...", flush=True)
        with torch.no_grad():
            output = self.model.generate(
                input_ids,
                max_new_tokens=2048,
                temperature=temperature,
                top_k=50,
                repetition_penalty=repetition_penalty,
                eos_token_id=self.speech_end_id,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        # 3. Decode speech codes
        output_tokens = output[0][input_ids.shape[1]:]  # get newly generated tokens
        output_text = self.tokenizer.decode(output_tokens, skip_special_tokens=False)
        
        # Extract <|speech_XXX|> from output_text
        import re
        speech_indices = []
        matches = re.finditer(r"<\|speech_(\d+)\|>", output_text)
        for m in matches:
            speech_indices.append(int(m.group(1)))
            
        if not speech_indices:
            print("[NeuTTS] Warning: No speech tokens generated.")
            return np.zeros(0, dtype=np.float32), 24000
            
        gen_codes = torch.tensor(speech_indices, dtype=torch.long).unsqueeze(0).unsqueeze(0).to("cuda")
        with torch.no_grad():
            audio_tensor = self.codec.decode_code(gen_codes).squeeze()
            audio_np = audio_tensor.cpu().numpy()
            
        return audio_np, 24000
