"""
LiveKitAgentWorker — long-running Modal worker connecting to LiveKit Cloud SFU.
Prewarms models in subprocess, then runs ManualBridgeAgent per session.

TTSChar1 / TTSChar2 — always-on TTS containers, one per character voice.
keep_warm=1 eliminates cold-start latency. Each container pre-loads its own voice ref.
"""
import os
import modal
from pydantic import BaseModel

from ai.modal.app import app, volumes
from ai.modal.image import image
from ai.agents.bridge_agent import ManualBridgeAgent


# ---------------------------------------------------------------------------
# Always-on TTS containers — 1 per voice, no cold start
# ---------------------------------------------------------------------------

class TTSRequest(BaseModel):
    text: str


def _synthesize_wav(tts, text: str, voice_ref: str) -> dict:
    """Shared synthesis helper: NeuTTS → WAV base64."""
    import io, base64
    import numpy as np
    import soundfile as sf

    audio_np, sr = tts.synthesize(text, reference_audio=voice_ref)
    audio_int16 = (audio_np * 32767).astype(np.int16)
    buf = io.BytesIO()
    sf.write(buf, audio_int16, sr, format="WAV", subtype="PCM_16")
    return {"audio_base64": base64.b64encode(buf.getvalue()).decode(), "mimeType": "audio/wav"}


@app.cls(
    image=image,
    gpu="L4",
    volumes=volumes,
    min_containers=1,  # always-on: no cold start for character 1
    timeout=300,
)
class TTSChar1:
    """Always-on TTS for character 1 (voice1.wav). Falls back to voice2.mp3 if not uploaded yet."""
    VOICE_REF  = "/valtec_models/voice_clone/voice1.wav"
    FALLBACK   = "/valtec_models/voice_clone/voice2.mp3"

    @modal.enter()
    def load(self):
        os.environ["HF_HUB_CACHE"] = "/hf_cache"
        from ai.livekit_plugins.neutts import NeuTTS
        self.tts = NeuTTS()
        self.ref = self.VOICE_REF if os.path.exists(self.VOICE_REF) else self.FALLBACK
        self.tts.synthesize("Xin chào.", self.ref)   # pre-encode ref codes
        print(f"[TTSChar1] Ready — ref={self.ref}", flush=True)

    @modal.fastapi_endpoint(method="POST")
    def tts(self, req: TTSRequest):
        return _synthesize_wav(self.tts, req.text, self.ref)


@app.cls(
    image=image,
    gpu="L4",
    volumes=volumes,
    min_containers=1,  # always-on: no cold start for character 2
    timeout=300,
)
class TTSChar2:
    """Always-on TTS for character 2 (voice2.mp3)."""
    VOICE_REF = "/valtec_models/voice_clone/voice2.mp3"

    @modal.enter()
    def load(self):
        os.environ["HF_HUB_CACHE"] = "/hf_cache"
        from ai.livekit_plugins.neutts import NeuTTS
        self.tts = NeuTTS()
        self.tts.synthesize("Xin chào.", self.VOICE_REF)   # pre-encode ref codes
        print(f"[TTSChar2] Ready — ref={self.VOICE_REF}", flush=True)

    @modal.fastapi_endpoint(method="POST")
    def tts(self, req: TTSRequest):
        return _synthesize_wav(self.tts, req.text, self.VOICE_REF)


@app.cls(
    image=image,
    gpu="L4",
    memory=16384,
    volumes=volumes,
    secrets=[
        modal.Secret.from_name("gemini-api-key"),
        modal.Secret.from_name("livekit-keys"),
        modal.Secret.from_name("backend-internal-key"),
    ],
    scaledown_window=600,
    timeout=86400,
)
class LiveKitAgentWorker:
    @modal.enter()
    def load_models(self):
        """Pre-download models so subprocess loads are fast (cached on volume)."""
        os.environ["HF_HUB_CACHE"] = "/hf_cache"
        print("[LiveKit] Pre-downloading VieNeu-TTS models...", flush=True)

    @modal.method()
    def run(self):
        import sys
        import logging
        import warnings

        logging.getLogger("livekit.agents").setLevel(logging.WARNING)
        logging.getLogger("livekit").setLevel(logging.WARNING)
        # Suppress repetitive memory warnings
        logging.getLogger("livekit.agents").addFilter(
            type("MemFilter", (), {"filter": lambda self, r: "memory usage" not in r.getMessage()})()
        )
        for name in ("hpack", "httpcore", "httpx", "huggingface_hub", "huggingface_hub.utils._http"):
            logging.getLogger(name).setLevel(logging.ERROR)
        warnings.filterwarnings("ignore", category=FutureWarning)
        os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"

        print("Starting LiveKit Agent Worker...", flush=True)
        sys.argv = ['modal_livekit', 'start']

        _real_exit = sys.exit
        sys.exit = lambda code=0: (_ for _ in ()).throw(SystemExit(code)) if code != 0 else None

        from livekit import agents
        try:
            agents.cli.run_app(
                agents.WorkerOptions(
                    entrypoint_fnc=_livekit_entrypoint,
                    prewarm_fnc=_livekit_prewarm,
                    num_idle_processes=1,
                    initialize_process_timeout=120,
                )
            )
        except SystemExit as e:
            if e.code != 0:
                sys.exit = _real_exit
                raise
        finally:
            sys.exit = _real_exit

        print("LiveKit agent exited cleanly.", flush=True)


def _livekit_prewarm(proc: object):
    """Called in each agent subprocess to load English stack before any job arrives.

    Loads:
      - faster-whisper large-v3-turbo (STT)  ← /models/whisper
      - F5-TTS v1 Base + Vocos (TTS)         ← /models/f5tts
      - Gemma 4 E2B via vLLM (LLM)           ← /models/gemma4-e2b
    """
    import logging
    import warnings
    import traceback

    try:
        logging.getLogger().setLevel(logging.ERROR)
        warnings.filterwarnings("ignore")
        os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
        os.environ["HF_HUB_CACHE"] = "/hf_cache"
        pid = os.getpid()

        # ── 1. Whisper STT ───────────────────────────────────────────────────
        print(f"[LiveKit pid={pid}] Loading faster-whisper from /models/whisper...", flush=True)
        from faster_whisper import WhisperModel
        proc.userdata["stt_model"] = WhisperModel(
            "/models/whisper",
            device="cuda",
            compute_type="float16",
        )

        # ── 2. F5-TTS ────────────────────────────────────────────────────────
        print(f"[LiveKit pid={pid}] Loading F5-TTS from /models/f5tts...", flush=True)
        from ai.livekit_plugins.f5tts import F5TTSEngine
        proc.userdata["tts_model"] = F5TTSEngine(
            ckpt_file="/models/f5tts/F5TTS_v1_Base/model_1250000.safetensors",
            vocab_file="/models/f5tts/F5TTS_v1_Base/vocab.txt",
            device="cuda",
        )
        # Pre-encode voice reference (warm cache)
        voice_ref = "/models/voice_refs/voice_en.wav"
        if os.path.exists(voice_ref):
            proc.userdata["tts_model"].synthesize("Hello.", voice_ref)
        proc.userdata["voice_ref"] = voice_ref

        # ── 3. Gemma 4 E2B via vLLM ─────────────────────────────────────────
        # Prefer local volume copy; fall back to HF download (cached on volume)
        gemma_local = "/models/gemma4-e2b"
        gemma_source = gemma_local if (os.path.isdir(gemma_local) and os.listdir(gemma_local)) else "google/gemma-4-E2B-it"
        print(f"[LiveKit pid={pid}] Loading Gemma 4 E2B via vLLM from {gemma_source}...", flush=True)
        from vllm import LLM
        from ai.llm import GemmaClient
        gemma_engine = LLM(
            model=gemma_source,
            dtype="bfloat16",
            max_model_len=4096,
            gpu_memory_utilization=0.55,   # leave room for Whisper + F5-TTS
            enforce_eager=True,             # faster startup, slightly slower inference
            download_dir="/hf_cache",       # cache HF download to persistent volume
        )
        proc.userdata["llm_client"] = GemmaClient(backend="vllm", vllm_engine=gemma_engine)

        print(f"[LiveKit pid={pid}] Subprocess ready (Whisper + F5-TTS + Gemma loaded).", flush=True)

    except Exception as e:
        print(f"[LiveKit Subprocess] CRITICAL ERROR during prewarm: {e}", flush=True)
        traceback.print_exc()
        raise e


@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def wake_livekit_agent():
    """
    HTTP endpoint để backend trigger LiveKit worker khởi động.
    Trả về ngay lập tức; worker chạy ở background.
    Gọi từ createLivekitSession khi user tạo session mới.
    """
    LiveKitAgentWorker().run.spawn()
    return {"status": "starting"}


async def _livekit_entrypoint(ctx):
    """Module-level entrypoint (picklable) for LiveKit agent jobs."""
    import asyncio
    from livekit.plugins import silero

    tts_model  = ctx.proc.userdata["tts_model"]
    voice_ref  = ctx.proc.userdata["voice_ref"]
    stt_model  = ctx.proc.userdata["stt_model"]
    llm_client = ctx.proc.userdata["llm_client"]
    vad_model  = silero.VAD.load()

    agent = ManualBridgeAgent(
        ctx,
        vad_model=vad_model,
        tts_model=tts_model,
        voice_ref=voice_ref,
        stt_model=stt_model,
        llm_client=llm_client,
    )
    await agent.start()
    await asyncio.Future()  # keep alive until framework cancels
