import asyncio
from livekit.agents import tts
from livekit import rtc
import numpy as np

class ValtecTTS(tts.TTS):
    """Wraps in-process Valtec ZeroShotTTS as LiveKit TTS plugin."""
    
    def __init__(self, model, voice_ref_path: str):
        super().__init__(capabilities=tts.TTSCapabilities(streaming=False))
        self._model = model
        self._voice_ref = voice_ref_path
    
    def synthesize(self, text: str) -> tts.ChunkedStream:
        return _ValtecChunkedStream(text, self._model, self._voice_ref, self)

class _ValtecChunkedStream(tts.ChunkedStream):
    def __init__(self, text: str, model, voice_ref_path: str, tts_instance: ValtecTTS):
        super().__init__(tts_instance, text)
        self.text = text
        self._model = model
        self._voice_ref = voice_ref_path

    async def _run(self):
        try:
            def _synthesize():
                return self._model.synthesize(self.text, reference_audio=self._voice_ref)
                
            audio_np, sr = await asyncio.to_thread(_synthesize)
            
            # Convert float32 [-1,1] to int16 PCM for LiveKit AudioFrame
            if audio_np.dtype != np.int16:
                audio_np = np.clip(audio_np, -1.0, 1.0)
                peak = np.abs(audio_np).max()
                if peak > 0:
                    audio_np = audio_np * (0.95 / peak)
                audio_int16 = (audio_np * 32767).astype(np.int16)
            else:
                audio_int16 = audio_np

            # Create rtc.AudioFrame. LiveKit agents wait for SynthesizedAudio
            frame = rtc.AudioFrame(
                data=audio_int16.tobytes(),
                sample_rate=sr,
                num_channels=1,
                samples_per_channel=len(audio_int16)
            )
            
            # Put the audio event
            self._event_ch.send_nowait(
                tts.SynthesizedAudio(text=self.text, data=frame)
            )
        except Exception as e:
            print(f"[ValtecTTS] Synthesize error: {e}")
