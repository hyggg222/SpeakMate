import modal
import os

# Removed _download_zeroshot_model as Valtec is replaced by NeuTTS


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "espeak-ng")
    .pip_install(
        "torch",
        "torchaudio",
        "faster-whisper",
        "fastapi",
        "python-multipart",
        "hf_transfer",
        "soundfile",
        "librosa",
        "viphoneme",
        "vinorm",
        "underthesea",
        "eng_to_ipa",
        "scipy",
        "transformers",
        "neucodec",
        "phonemizer",
        "nvidia-cublas-cu12",
        "google-genai",
        "livekit-agents",
        "livekit-plugins-google",
        "livekit-plugins-silero",
        "huggingface_hub",
        "httpx",
    )
    .run_commands("git clone https://github.com/tronghieuit/valtec-tts.git /root/valtec-tts")
    .add_local_dir("ai/livekit_plugins", "/root/livekit_plugins", copy=True)
    .add_local_dir("ai", "/root/ai", copy=True)
    .env({
        "PYTHONPATH": "/root/valtec-tts:/root",
        "LD_LIBRARY_PATH": (
            "/usr/local/lib/python3.11/site-packages/nvidia/cu13/lib:"
            "/usr/local/lib/python3.11/site-packages/nvidia/cublas/lib"
        ),
    })
)
