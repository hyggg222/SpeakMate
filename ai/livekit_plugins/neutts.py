import numpy as np
from vieneu import Vieneu


class NeuTTS:
    def __init__(self):
        print("[NeuTTS] Loading VieNeu-TTS...", flush=True)
        self.tts = Vieneu()
        self._ref_codes_cache = {}
        print("[NeuTTS] Ready.", flush=True)

    def synthesize(self, text, reference_audio):
        if reference_audio not in self._ref_codes_cache:
            print(f"[NeuTTS] Encoding voice reference: {reference_audio}", flush=True)
            self._ref_codes_cache[reference_audio] = self.tts.encode_reference(reference_audio)

        ref_codes = self._ref_codes_cache[reference_audio]
        print(f"[NeuTTS] Generating speech for: {text[:50]}...", flush=True)
        audio = self.tts.infer(text=text, ref_codes=ref_codes)

        if not isinstance(audio, np.ndarray):
            audio = np.array(audio, dtype=np.float32)

        print(f"[NeuTTS] Generated {len(audio)} samples.", flush=True)
        return audio, 24000
