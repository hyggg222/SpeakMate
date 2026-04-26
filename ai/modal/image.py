import modal
import os

# Removed _download_zeroshot_model as Valtec is replaced by NeuTTS

# --- Main image for LiveKit voice pipeline (English stack) ---
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "espeak-ng", "libsndfile1")
    .pip_install(
        # Core ML
        "torch==2.5.1",
        "torchaudio==2.5.1",
        "nvidia-cublas-cu12",
        # English STT + TTS (new — Whisper + F5-TTS)
        "faster-whisper>=1.2.0",
        "ctranslate2>=4.5.0",
        "f5-tts>=1.1.7",
        # English LLM serving (Gemma 4 E2B via vLLM)
        "vllm>=0.7.3",
        # Vietnamese TTS (kept as fallback)
        "vieneu",
        # LiveKit + plugins
        "livekit-agents",
        "livekit-plugins-google",
        "livekit-plugins-silero",
        # API + utils
        "fastapi[standard]",
        "python-multipart",
        "hf_transfer",
        "soundfile",
        "librosa",
        "scipy",
        "google-genai",         # legacy fallback (will be deprecated)
        "huggingface_hub",
        "httpx",
    )
    .add_local_dir("ai", "/root/ai", copy=True)
    .env({
        "PYTHONPATH": "/root",
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
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
