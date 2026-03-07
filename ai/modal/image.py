import modal
import os

# Removed _download_zeroshot_model as Valtec is replaced by NeuTTS

# --- Main image for LiveKit voice pipeline ---
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "espeak-ng")
    .pip_install(
        "torch",
        "torchaudio",
        "vieneu",
        "fastapi[standard]",
        "python-multipart",
        "hf_transfer",
        "soundfile",
        "librosa",
        "scipy",
        "nvidia-cublas-cu12",
        "google-genai",
        "livekit-agents",
        "livekit-plugins-google",
        "livekit-plugins-silero",
        "huggingface_hub",
        "httpx",
    )
    .add_local_dir("ai", "/root/ai", copy=True)
    .env({
        "PYTHONPATH": "/root",
        "LD_LIBRARY_PATH": (
            "/usr/local/lib/python3.11/site-packages/nvidia/cu13/lib:"
            "/usr/local/lib/python3.11/site-packages/nvidia/cublas/lib"
        ),
    })
)

# --- Gemma vLLM image for Mentor Ni Chat ---
gemma_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "vllm",
        "huggingface_hub",
        "hf_transfer",
        "fastapi[standard]",
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
    })
)
