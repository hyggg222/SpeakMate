import os
import time

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("Please install faster-whisper: pip install faster-whisper")
    exit(1)

def test_phowhisper(audio_path: str, model_size="kiendt/PhoWhisper-large-ct2"):
    print(f"Loading model: {model_size}...")
    start_time = time.time()
    
    # Initialize the model
    # On Windows, try to use cuda if available, otherwise cpu
    device = "cuda"
    compute_type = "float16" # or int8_float16, int8
    
    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print(f"Model loaded on GPU in {time.time() - start_time:.2f} seconds")
    except Exception as e:
        print(f"Failed to load on GPU, falling back to CPU. Error: {e}")
        device = "cpu"
        compute_type = "int8"
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print(f"Model loaded on CPU in {time.time() - start_time:.2f} seconds")

    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found at {audio_path}")
        return

    print(f"\nTranscribing {audio_path}...")
    start_time = time.time()
    
    segments, info = model.transcribe(
        audio_path,
        language="vi",
        beam_size=5,
        vad_filter=True, # enable standard silero vad in faster-whisper
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    print(f"Detected language '{info.language}' with probability {info.language_probability:.2f}")
    
    transcription = []
    for segment in segments:
        print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
        transcription.append(segment.text)
        
    print(f"\nTranscription completed in {time.time() - start_time:.2f} seconds")
    print("-" * 50)
    print(" ".join(transcription).strip())
    print("-" * 50)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Test PhoWhisper STT Model")
    parser.add_argument("--audio", type=str, default="../data/voice_samples/voice1.wav", help="Path to the audio file")
    parser.add_argument("--model", type=str, default="kiendt/PhoWhisper-large-ct2", help="Model size or path")
    
    args = parser.parse_args()
    
    # Check if the default audio file exists, if not just inform the user
    if args.audio == "../data/voice_samples/voice1.wav" and not os.path.exists(args.audio):
        print("Note: Default audio file 'data/voice_samples/voice1.wav' not found.")
        print("Please provide a valid audio file using the --audio argument.")
        print("Example: python test_stt.py --audio path/to/your/audio.wav\n")
    
    test_phowhisper(args.audio, args.model)
