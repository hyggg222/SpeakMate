import asyncio
from livekit.agents import stt
from livekit import rtc
import tempfile
import os

class WhisperSTT(stt.STT):
    """Wraps in-process Faster-Whisper model as LiveKit STT plugin."""

    def __init__(self, model):
        super().__init__(capabilities=stt.STTCapabilities(streaming=False, interim_results=False))
        self._model = model

    async def _recognize_impl(self, buffer, *, language: str | None = None, **kwargs) -> stt.SpeechEvent:
        try:
            import numpy as np
            import soundfile as sf

            # LiveKit passes rtc.AudioFrame: int16 PCM, typically 48kHz mono
            audio_np = np.frombuffer(buffer.data, dtype=np.int16).astype(np.float32) / 32767.0
            sr = buffer.sample_rate

            fd, tmp_path = tempfile.mkstemp(suffix=".wav")
            os.close(fd)
            sf.write(tmp_path, audio_np, sr)

            def _transcribe():
                segments, _ = self._model.transcribe(
                    tmp_path,
                    language=language or "vi",
                    beam_size=5,
                    vad_filter=False,  # Silero VAD already filtered upstream
                )
                valid_segments = []
                for seg in segments:
                    if seg.no_speech_prob < 0.6:  # filter hallucinations
                        valid_segments.append(seg.text.strip())
                text = " ".join(valid_segments).strip()
                return text if text else "(Không nghe rõ)"

            transcript = await asyncio.to_thread(_transcribe)

        except Exception as e:
            print(f"[WhisperSTT] Transcribe error: {e}")
            transcript = "(Không nghe rõ)"
        finally:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.unlink(tmp_path)

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[stt.SpeechData(text=transcript, language=language or "vi")]
        )
