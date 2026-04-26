#!/usr/bin/env python3
"""
VAD + STT Reliability Test
--------------------------
Captures mic audio, segments by voice activity (energy-based VAD),
plays back the captured segment so you can hear what was recorded,
then sends to Modal /transcribe endpoint and prints the transcript.

Requirements:
    pip install sounddevice soundfile numpy requests

Usage:
    python test_vad_stt.py
    python test_vad_stt.py --threshold 0.008   # lower = more sensitive
    python test_vad_stt.py --silence 0.6       # shorter pause to end segment
    python test_vad_stt.py --save              # also save each segment as seg_001.wav etc.
    python test_vad_stt.py --no-playback       # skip audio playback
"""

import argparse
import base64
import io
import os
import time

import numpy as np
import requests
import sounddevice as sd
import soundfile as sf

# ── Config ──────────────────────────────────────────────────────────────────
MODAL_TRANSCRIBE_URL = (
    "https://ptimindss5--speakmate-pipeline-v2-voicepipeline-transcribe.modal.run"
)
SAMPLE_RATE    = 16000
CHUNK_MS       = 30
SILENCE_SEC    = 0.7
MIN_SPEECH_SEC = 0.3
MAX_SPEECH_SEC = 12.0


def rms(chunk: np.ndarray) -> float:
    return float(np.sqrt(np.mean(chunk ** 2)))


def play_audio(audio: np.ndarray, sr: int) -> None:
    """Block until playback finishes."""
    sd.play(audio, samplerate=sr)
    sd.wait()


def transcribe(audio: np.ndarray, sr: int) -> str:
    buf = io.BytesIO()
    sf.write(buf, audio, sr, format="WAV", subtype="FLOAT")
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode()
    try:
        resp = requests.post(
            MODAL_TRANSCRIBE_URL,
            json={"audio_base64": b64},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("transcript", "(trống)")
    except Exception as exc:
        return f"[Lỗi: {exc}]"


def save_segment(audio: np.ndarray, sr: int, index: int) -> str:
    os.makedirs("vad_segments", exist_ok=True)
    path = f"vad_segments/seg_{index:03d}.wav"
    sf.write(path, audio, sr, subtype="PCM_16")
    return path


def measure_noise_floor(stream, chunk_samples: int, duration_sec: float = 1.5) -> float:
    """Record ambient noise and return the 95th-percentile RMS as noise floor."""
    n_chunks = int(duration_sec * SAMPLE_RATE / chunk_samples)
    levels = []
    for _ in range(n_chunks):
        chunk, _ = stream.read(chunk_samples)
        levels.append(rms(chunk.flatten()))
    noise_floor = float(np.percentile(levels, 95))
    return noise_floor


def main(threshold: float, silence_sec: float, playback: bool, save: bool):
    chunk_samples  = int(SAMPLE_RATE * CHUNK_MS / 1000)
    silence_chunks = int(silence_sec * 1000 / CHUNK_MS)
    min_chunks     = int(MIN_SPEECH_SEC * 1000 / CHUNK_MS)
    max_chunks     = int(MAX_SPEECH_SEC * 1000 / CHUNK_MS)

    print("─" * 60)

    audio_buf:    list[np.ndarray] = []
    trailing_sil: int              = 0
    recording:    bool             = False
    seg_index:    int              = 0

    with sd.InputStream(
        samplerate=SAMPLE_RATE, channels=1, dtype="float32",
        blocksize=chunk_samples,
    ) as stream:

        # ── Auto-calibrate threshold from ambient noise ──────────────
        if threshold == 0:
            print("🔇 Đo noise nền (giữ im lặng 1.5s)...", end="", flush=True)
            noise_floor = measure_noise_floor(stream, chunk_samples)
            # speech_threshold: 4× noise floor to trigger recording
            # silence_threshold: 1.5× noise floor — must drop THIS low to count as silence
            # Hysteresis gap prevents breathing/noise from resetting the silence counter
            speech_threshold  = max(noise_floor * 4.0, 0.005)
            silence_threshold = max(noise_floor * 1.5, 0.003)
            print(f" noise={noise_floor:.4f}  speech>={speech_threshold:.4f}  silence<={silence_threshold:.4f}")
        else:
            speech_threshold  = threshold
            silence_threshold = threshold * 0.5  # half of speech threshold

        print(f"  silence={silence_sec}s  playback={'on' if playback else 'off'}"
              f"  save={'on' if save else 'off'}")
        print("─" * 60)
        print("\n🎤 Đang lắng nghe...\n")
        while True:
            chunk, _ = stream.read(chunk_samples)
            chunk = chunk.flatten()
            level = rms(chunk)

            if level >= speech_threshold:
                # Clearly speaking — reset silence counter
                if not recording:
                    recording = True
                    audio_buf = []
                    trailing_sil = 0
                    print("▶ [VAD] Phát hiện tiếng nói ", end="", flush=True)
                trailing_sil = 0
                audio_buf.append(chunk)
            elif recording and level <= silence_threshold:
                # Clearly silent — accumulate silence counter
                trailing_sil += 1
                audio_buf.append(chunk)
            elif recording:
                # Middle zone (breath, soft noise) — keep buffering, don't change counter
                audio_buf.append(chunk)

            if recording and (trailing_sil >= silence_chunks or len(audio_buf) >= max_chunks):
                duration = len(audio_buf) * CHUNK_MS / 1000
                print(f"◼  ({duration:.1f}s)")
                recording = False

                if len(audio_buf) < min_chunks:
                    print("   → bỏ qua (quá ngắn)\n")
                else:
                    seg_index += 1
                    full = np.concatenate(audio_buf)

                    # 1. Play back what was captured
                    if playback:
                        print(f"   🔊 Playback segment {seg_index}...")
                        play_audio(full, SAMPLE_RATE)

                    # 2. Save to file
                    if save:
                        path = save_segment(full, SAMPLE_RATE, seg_index)
                        print(f"   💾 Saved: {path}")

                    # 3. Transcribe
                    print(f"   ⏳ Transcribing...", end="", flush=True)
                    t0 = time.time()
                    text = transcribe(full, SAMPLE_RATE)
                    latency = time.time() - t0
                    print(f"\r   📝 [{seg_index}] \"{text}\"  ({latency:.1f}s)\n")

                audio_buf = []
                trailing_sil = 0
                print("🎤 Đang lắng nghe...\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VAD + STT reliability test")
    parser.add_argument("--threshold", type=float, default=0,
        help="RMS energy threshold. Mặc định 0 = tự đo noise nền khi khởi động.")
    parser.add_argument("--silence", type=float, default=1.5,
        help="Giây im lặng để kết thúc đoạn (default: 1.5)")
    parser.add_argument("--no-playback", dest="playback", action="store_false",
        help="Tắt playback audio đã ghi")
    parser.add_argument("--save", action="store_true",
        help="Lưu mỗi segment vào vad_segments/seg_NNN.wav")
    parser.set_defaults(playback=True)
    args = parser.parse_args()

    try:
        main(threshold=args.threshold, silence_sec=args.silence,
             playback=args.playback, save=args.save)
    except KeyboardInterrupt:
        print("\n\nDừng test.")
