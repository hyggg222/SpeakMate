"""
ManualBridgeAgent — LiveKit real-time voice pipeline.
VAD → STT → LLM → TTS, with turn persistence via Internal API.

Class is assembled from focused mixins:
  AudioMixin       — audio capture + VAD + barge-in detection
  ContextMixin     — sliding-window history + background summarization
  TurnMixin        — per-turn STT → LLM → TTS pipeline
  TTSMixin         — audio streaming + interruption signalling
  PersistenceMixin — Internal API turn persistence
"""

import asyncio
import json
import os

from .audio_handler import AudioMixin
from .context_manager import ContextMixin
from .persistence import PersistenceMixin
from .tts_streamer import TTSMixin
from .turn_processor import TurnMixin


def _extract_text(content) -> str:
    """Extract plain string from livekit-agents ChatMessage.content (list in v1.5.2)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
            elif hasattr(item, "text"):
                parts.append(str(item.text))
        return " ".join(parts).strip()
    return str(content)


class ManualBridgeAgent(ContextMixin, AudioMixin, TurnMixin, TTSMixin, PersistenceMixin):
    def __init__(
        self,
        ctx,
        vad_model,
        tts_model,
        voice_ref,
        genai_client=None,
        stt_model=None,
        llm_client=None,
    ):
        """
        Args:
            ctx:           LiveKit JobContext
            vad_model:     Silero VAD instance
            tts_model:     Engine with .synthesize(text, reference_audio) → (audio_np, sr)
                           (NeuTTS for VI, F5TTSEngine for EN)
            voice_ref:     Path to reference WAV for voice cloning
            genai_client:  (legacy) Gemini API client — used if stt_model/llm_client are None
            stt_model:     faster-whisper WhisperModel — local STT (preferred over Gemini audio)
            llm_client:    GemmaClient or any obj with .generate(prompt) → str
        """
        self.ctx = ctx
        self.vad = vad_model
        self.tts_model = tts_model
        self.voice_ref = voice_ref
        self.genai_client = genai_client      # kept for legacy summarization fallback
        self.stt_model = stt_model            # new — faster-whisper
        self.llm_client = llm_client          # new — Gemma 4 (or any LLM client)

        # Audio pipeline state
        self.audio_source = None        # created in start() after TTS warm-up
        self.tts_sr = 22050             # overwritten in start()
        self.audio_buffer = []
        self.is_user_speaking = False
        self.vad_stream = None
        self.vad_task = None

        # Session context
        self.scenario = {}
        self.history = []
        self.user_name = "bạn"
        self.system_prompt = ""
        self.session_id = ""
        self.turn_counter = 0
        self.context_summary = ""

        # Barge-in tracking
        self._current_tts_task: asyncio.Task | None = None
        self._tts_cancelled = False
        self._current_ai_turn_idx: int = -1
        self._chars_delivered: int = 0

        self.ctx.room.on("track_subscribed", self.on_track_subscribed)

    async def start(self):
        from livekit import rtc

        # Warm-up TTS: discovers real sample rate + pre-loads CUDA kernels
        print("[Bridge] Warming up TTS...", flush=True)
        try:
            def _warmup():
                _, sr = self.tts_model.synthesize("Xin chào.", reference_audio=self.voice_ref)
                return sr
            self.tts_sr = await asyncio.wait_for(asyncio.to_thread(_warmup), timeout=120)
        except asyncio.TimeoutError:
            print("[Bridge] TTS warm-up TIMEOUT (120s), defaulting to 24000 Hz", flush=True)
            self.tts_sr = 24000
        except Exception as e:
            print(f"[Bridge] TTS warm-up failed ({e}), defaulting to 24000 Hz", flush=True)
            self.tts_sr = 24000
        print(f"[Bridge] TTS sample rate: {self.tts_sr}", flush=True)

        # Create AudioSource and publish track to LiveKit room
        self.audio_source = rtc.AudioSource(self.tts_sr, 1)
        await self.ctx.connect()
        track = rtc.LocalAudioTrack.create_audio_track("agent-mic", self.audio_source)
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        pub = await self.ctx.room.local_participant.publish_track(track, options)
        print(f"[Bridge] Audio track published: {pub.sid}", flush=True)

        # Wait for participant then fetch session context
        participant = await self.ctx.wait_for_participant()
        print(f"[Bridge] Participant joined: {participant.identity}", flush=True)
        try:
            meta = json.loads(participant.metadata or "{}")
            meta_version = meta.get("v", 1)

            if meta_version >= 2:
                session_id = meta.get("session_id", "")
                self.session_id = session_id
                backend_url = os.environ.get("BACKEND_URL", "").rstrip("/")
                internal_key = os.environ.get("INTERNAL_API_KEY", "")
                if session_id and backend_url:
                    import httpx
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        resp = await client.get(
                            f"{backend_url}/api/internal/sessions/{session_id}/context",
                            headers={"Authorization": f"Bearer {internal_key}"},
                        )
                    if resp.status_code == 200:
                        ctx_data = resp.json()
                        self.scenario      = ctx_data.get("scenario", {})
                        self.history       = ctx_data.get("history", [])
                        self.user_name     = ctx_data.get("userName", "bạn")
                        self.system_prompt = ctx_data.get("systemPrompt", "")
                        print(f"[Bridge] Context: {len(self.history)} turns, user={self.user_name}", flush=True)
                    else:
                        print(f"[Bridge] Context fetch HTTP {resp.status_code}: {resp.text[:200]}", flush=True)
                else:
                    print(f"[Bridge] Missing session_id or BACKEND_URL — session_id={session_id!r}", flush=True)
            else:
                # Legacy v1 metadata (session context embedded directly)
                self.scenario  = meta.get("scenario", {})
                self.history   = meta.get("history", [])
                self.user_name = meta.get("userName", "bạn")
                print(f"[Bridge] Legacy metadata (v1). User: {self.user_name}", flush=True)
        except Exception as e:
            print(f"[Bridge] Context fetch error: {e}", flush=True)
            import traceback; traceback.print_exc()

        if not self.system_prompt:
            self.system_prompt = self._build_system_prompt()
        print(f"[Bridge] Ready. User: {self.user_name}", flush=True)

        # Signal frontend to unblock the loading overlay
        try:
            await self.ctx.room.local_participant.publish_data(
                json.dumps({"type": "agent_ready"}).encode(),
                reliable=True,
            )
            print("[Bridge] agent_ready sent.", flush=True)
        except Exception as e:
            print(f"[Bridge] agent_ready send FAILED: {e}", flush=True)

    def _build_system_prompt(self) -> str:
        """Fallback: construct system prompt from scenario when backend doesn't provide one."""
        persona        = self.scenario.get("interviewerPersona", "Người hướng dẫn")
        goals          = ", ".join(self.scenario.get("goals", []))
        starting_turns = self.scenario.get("startingTurns", [])
        return (
            f"Bạn là đối tác hội thoại trong một kịch bản luyện tập giao tiếp.\n"
            f"Nhân vật của bạn: {persona}\n"
            f"Mục tiêu: {goals}\n"
            f"Người bạn đang nói chuyện tên là: {self.user_name}\n\n"
            f"Tuân thủ nghiêm ngặt nhân vật. Không thoát vai.\n"
            f"Trả lời cực kỳ ngắn gọn (tối đa 2 câu, dưới 20 từ).\n"
            f"TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [] hoặc placeholder.\n"
            f"Luôn dùng tên \"{self.user_name}\" hoặc \"bạn\".\n\n"
            f"Bối cảnh kịch bản: {json.dumps(starting_turns, ensure_ascii=False)}"
        )
