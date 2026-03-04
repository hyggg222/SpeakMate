"""
SpeakMate LiveKit Plugins
Contains custom wrappers for STT (Faster-Whisper) and TTS (Valtec ZeroShotTTS) to integrate with LiveKit Agents SDK.
"""
from .whisper_stt import WhisperSTT
from .valtec_tts import ValtecTTS

__all__ = ["WhisperSTT", "ValtecTTS"]
