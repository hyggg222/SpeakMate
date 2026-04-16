"""
LiveKitAgentWorker — long-running Modal worker connecting to LiveKit Cloud SFU.
Prewarms models in subprocess, then runs ManualBridgeAgent per session.
"""
import os
import modal

from ai.modal.app import app, volumes
from ai.modal.image import image
from ai.agents.bridge_agent import ManualBridgeAgent


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
        import sys, io
        os.environ["HF_HUB_CACHE"] = "/hf_cache"
        _real_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            from huggingface_hub import snapshot_download
            snapshot_download("dinhthuan/neutts-air-vi")
            snapshot_download("neuphonic/neucodec")
            snapshot_download("kiendt/PhoWhisper-large-ct2")
        finally:
            sys.stdout = _real_stdout

    @modal.method()
    def run(self):
        import sys
        import logging
        import warnings

        logging.getLogger("livekit.agents").setLevel(logging.ERROR)
        logging.getLogger("livekit").setLevel(logging.ERROR)
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
    """Called in each agent subprocess to load models before any job arrives."""
    import sys
    import logging
    import warnings
    import traceback

    try:
        logging.getLogger().setLevel(logging.ERROR)
        warnings.filterwarnings("ignore")
        os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
        os.environ["HF_HUB_CACHE"] = "/hf_cache"

        if "/root/ai/livekit_plugins" not in sys.path:
            sys.path.append("/root/ai/livekit_plugins")
            
        from faster_whisper import WhisperModel
        from ai.livekit_plugins.neutts import NeuTTS
        import io

        print("[LiveKit] Loading models...", flush=True)

        _real_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            # Initialize PyTorch models FIRST to prevent CTranslate2 from fragmenting VRAM
            proc.userdata["tts_model"] = NeuTTS(
                checkpoint_path="dinhthuan/neutts-air-vi",
                codec_model="neuphonic/neucodec"
            )

            proc.userdata["stt_model"] = WhisperModel(
                "kiendt/PhoWhisper-large-ct2", device="cuda", compute_type="float16"
            )
        finally:
            sys.stdout = _real_stdout

        voice_ref = "/valtec_models/voice_clone/voice2.mp3"
        if not os.path.exists(voice_ref):
            print(f"[LiveKit] WARNING: voice ref NOT FOUND: {voice_ref}", flush=True)
        proc.userdata["voice_ref"] = voice_ref
        print("[LiveKit] Ready.", flush=True)

    except Exception as e:
        print(f"[LiveKit Subprocess] CRITICAL ERROR during prewarm: {e}", flush=True)
        traceback.print_exc()
        raise e


async def _livekit_entrypoint(ctx):
    """Module-level entrypoint (picklable) for LiveKit agent jobs."""
    import asyncio
    from livekit.plugins import silero
    from google import genai

    stt_model    = ctx.proc.userdata["stt_model"]
    tts_model    = ctx.proc.userdata["tts_model"]
    voice_ref    = ctx.proc.userdata["voice_ref"]
    genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    vad_model    = silero.VAD.load(threshold=0.65, min_speech_duration=0.1)

    agent = ManualBridgeAgent(ctx, vad_model, stt_model, tts_model, voice_ref, genai_client)
    await agent.start()
    await asyncio.Future()  # keep alive until framework cancels
