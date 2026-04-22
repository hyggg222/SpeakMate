import os
import modal

app = modal.App("test-phowhisper")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("faster-whisper", "nvidia-cublas-cu12")
    .env({
        "LD_LIBRARY_PATH": (
            "/usr/local/lib/python3.11/site-packages/nvidia/cu13/lib:"
            "/usr/local/lib/python3.11/site-packages/nvidia/cublas/lib"
        ),
    })
)

volume = modal.Volume.from_name("speakmate-hf-cache", create_if_missing=True)

@app.function(image=image, gpu="L4", timeout=600, volumes={"/hf_cache": volume})
def run_phowhisper(audio_bytes: bytes, model_size="kiendt/PhoWhisper-large-ct2"):
    import time
    from faster_whisper import WhisperModel
    import tempfile
    
    print(f"Loading model: {model_size} on GPU...")
    start_time = time.time()
    
    # Save audio to temp file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        temp_audio_path = f.name
        
    try:
        model = WhisperModel(
            model_size, 
            device="cuda", 
            compute_type="float16",
            download_root="/hf_cache"
        )
        print(f"Model loaded in {time.time() - start_time:.2f} seconds")
        
        print("Transcribing...")
        start_time = time.time()
        segments, info = model.transcribe(
            temp_audio_path,
            language="vi",
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        print(f"Detected language '{info.language}' with probability {info.language_probability:.2f}")
        
        results = []
        for segment in segments:
            text = f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}"
            print(text)
            results.append(text)
            
        print(f"Transcription completed in {time.time() - start_time:.2f} seconds")
        return "\n".join(results)
    finally:
        os.unlink(temp_audio_path)

@app.local_entrypoint()
def main(audio_path: str = "../data/voice_samples/voice1.wav", model_size: str = "kiendt/PhoWhisper-large-ct2"):
    if not os.path.exists(audio_path):
        print(f"Error: Internal audio path '{audio_path}' not found.")
        return
        
    print(f"Sending '{audio_path}' to Modal for processing...")
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
        
    print("Running remote inference...")
    result = run_phowhisper.remote(audio_bytes, model_size)
    print("\n--- RESULTS ---")
    print(result)
