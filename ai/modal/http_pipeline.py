"""
VoicePipeline — HTTP endpoints for legacy round-trip mode.
/interact, /transcribe, /generate
"""
import os
import modal
from pydantic import BaseModel
from typing import Optional

from ai.modal.app import app, volumes
from ai.modal.image import image


class TranscriptionRequest(BaseModel):
    audio_base64: str


class GenerateRequest(BaseModel):
    text: str
    speaker: Optional[str] = "NF"


class InteractRequest(BaseModel):
    audio_base64: str
    scenario_str: str
    conversation_history_str: str
    speaker: Optional[str] = "NF"
    user_name: Optional[str] = "bạn"


@app.cls(
    image=image,
    gpu="L4",
    volumes=volumes,
    secrets=[modal.Secret.from_name("gemini-api-key")],
    scaledown_window=600,
)
class VoicePipeline:
    @modal.enter()
    def load_models(self):
        print("--- [Pipeline] Loading Models on L4 GPU ---")
        os.environ["HF_HUB_CACHE"] = "/hf_cache"

        from faster_whisper import WhisperModel
        print("Initializing Whisper v3-Large...")
        self.stt_model = WhisperModel("kiendt/PhoWhisper-large-ct2", device="cuda", compute_type="float16")

        import sys
        if "/root/ai/livekit_plugins" not in sys.path:
            sys.path.append("/root/ai/livekit_plugins")

        from ai.livekit_plugins.neutts import NeuTTS
        print("Initializing NeuTTS (Voice Clone Mode)...")

        self.tts_model = NeuTTS(
            checkpoint_path="dinhthuan/neutts-air-vi",
            codec_model="neuphonic/neucodec"
        )
        self.voice_ref_path = "/valtec_models/voice_clone/voice2.mp3"
        if not os.path.exists(self.voice_ref_path):
            print(f"WARNING: Voice clone reference not found at {self.voice_ref_path}")

        from google import genai
        print("Initializing Gemini API Client...")
        self.genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

        print("--- [Pipeline] Ready! ---")

    @staticmethod
    def _sanitize(text: str, user_name: str = "bạn") -> str:
        import re
        result = re.sub(
            r'\[(?:tên của bạn|tên bạn|tên người dùng|your name|tên|name|họ tên|user name|người dùng)[^\]]*\]',
            user_name, text, flags=re.IGNORECASE
        )
        result = re.sub(r'\[[^\]]{1,40}\]', '', result)
        return re.sub(r'\s{2,}', ' ', result).strip()

    @modal.fastapi_endpoint(method="POST")
    async def interact(self, request: InteractRequest):
        import base64, tempfile, json, io, soundfile as sf

        audio_bytes = base64.b64decode(request.audio_base64)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            print(f"[Interact] 1. STT Transcribing...")
            segments, _ = self.stt_model.transcribe(tmp_path, language="vi", beam_size=5, vad_filter=True)
            transcript = " ".join([seg.text.strip() for seg in segments])

            if not transcript.strip():
                transcript = "(Không nghe rõ)"
                ai_response = "Xin lỗi, Ni chưa nghe thấy bạn nói gì. Bạn có thể nói lại được không?"
            else:
                print(f"[Interact] 2. LLM Reasoning for: {transcript[:30]}...")
                scenario = json.loads(request.scenario_str)
                history  = json.loads(request.conversation_history_str)

                user_name      = request.user_name or 'bạn'
                persona        = scenario.get('interviewerPersona', 'Người hướng dẫn')
                goals          = ', '.join(scenario.get('goals', []))
                starting_turns = scenario.get('startingTurns', [])
                system_prompt  = (
                    f"Bạn là đối tác hội thoại trong một kịch bản luyện tập giao tiếp.\n"
                    f"Nhân vật của bạn: {persona}\n"
                    f"Mục tiêu: {goals}\n"
                    f"Người bạn đang nói chuyện tên là: {user_name}\n\n"
                    f"Tuân thủ nghiêm ngặt nhân vật. Không thoát vai.\n"
                    f"Trả lời cực kỳ ngắn gọn (tối đa 2 câu, dưới 20 từ).\n"
                    f"TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [] hoặc placeholder.\n"
                    f"Bối cảnh kịch bản: {json.dumps(starting_turns, ensure_ascii=False)}"
                )

                messages = [
                    {"role": "model" if h['speaker'] == 'AI' else "user", "parts": [{"text": h['line']}]}
                    for h in history
                ]
                messages.append({"role": "user", "parts": [{"text": transcript}]})
                while messages and messages[0]['role'] == 'model':
                    messages.pop(0)

                response   = self.genai_client.models.generate_content(
                    model="gemini-2.0-flash", contents=messages,
                    config={"system_instruction": system_prompt}
                )
                ai_response = self._sanitize(response.text, user_name)

            print(f"[Interact] 3. TTS Generating (Voice Clone): {ai_response[:30]}...")
            audio_obj, sr = self.tts_model.synthesize(ai_response, reference_audio=self.voice_ref_path)
            buffer = io.BytesIO()
            sf.write(buffer, audio_obj, sr, format="WAV")
            buffer.seek(0)

            return {
                "userTranscript": transcript,
                "aiResponse":     ai_response,
                "botAudioUrl":    f"data:audio/wav;base64,{base64.b64encode(buffer.read()).decode('utf-8')}"
            }
        except Exception as e:
            print(f"[Interact] Error: {e}")
            return {"error": str(e)}
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    @modal.fastapi_endpoint(method="POST")
    async def transcribe(self, request_data: TranscriptionRequest):
        import base64, tempfile
        audio_bytes = base64.b64decode(request_data.audio_base64)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            segments, _ = self.stt_model.transcribe(tmp_path, language="vi", beam_size=5, vad_filter=True)
            return {"transcript": " ".join([seg.text.strip() for seg in segments])}
        finally:
            if os.path.exists(tmp_path): os.unlink(tmp_path)

    @modal.fastapi_endpoint(method="POST")
    async def generate(self, request_data: GenerateRequest):
        import io, base64, soundfile as sf
        audio_obj, sr = self.tts_model.synthesize(request_data.text, reference_audio=self.voice_ref_path)
        buffer = io.BytesIO()
        sf.write(buffer, audio_obj, sr, format="WAV")
        buffer.seek(0)
        return {"audio_base64": base64.b64encode(buffer.read()).decode("utf-8")}
