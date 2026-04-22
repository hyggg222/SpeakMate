# Entry point for `modal deploy modal_pipeline.py`
# Logic is split under ai/:
#   ai/modal/image.py       — container image
#   ai/modal/app.py         — modal.App + volumes
#   ai/modal/livekit_worker.py — LiveKitAgentWorker (WebRTC mode)
#   ai/agents/bridge_agent.py  — ManualBridgeAgent (VAD→STT→LLM→TTS)

from ai.modal.app import app  # noqa: F401 — registers modal.App
from ai.modal.livekit_worker import LiveKitAgentWorker  # noqa: F401


@app.local_entrypoint()
def test():
    print("SpeakMate Modal App loaded. Use 'modal serve modal_pipeline.py' for development.")
