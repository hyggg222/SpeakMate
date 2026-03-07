"""
Upload voice clone reference audio files to Modal persistent volume.
Run this ONCE before deploying the pipeline (or when adding new voice files):
    python scripts/upload_voice_to_modal.py

Uploads:
  voice1.wav  → char1 voice (character index 0 in dual-char mode)
  voice2.mp3  → char2 voice (character index 1 in dual-char mode)
"""
import modal
import os

VOLUME_NAME = "speakmate-valtec-models"
REMOTE_DIR = "voice_clone"

VOICE_FILES = [
    {
        "local": os.path.join(os.path.dirname(__file__), "..", "data", "voice_samples", "sample1", "voice1.wav"),
        "remote": "voice1.wav",
        "desc": "char1 voice (voice index 0)",
    },
    {
        "local": os.path.join(os.path.dirname(__file__), "..", "data", "voice_samples", "sample2", "voice2.mp3"),
        "remote": "voice2.mp3",
        "desc": "char2 voice (voice index 1)",
    },
]


def main():
    vol = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)
    uploaded = []
    skipped = []

    for vf in VOICE_FILES:
        local_path = os.path.normpath(vf["local"])
        remote_path = f"/{REMOTE_DIR}/{vf['remote']}"

        if not os.path.exists(local_path):
            print(f"SKIP: {local_path} not found — {vf['desc']}")
            skipped.append(vf["remote"])
            continue

        size_mb = os.path.getsize(local_path) / 1024 / 1024
        print(f"Uploading {local_path} ({size_mb:.1f} MB) → {remote_path} ...")
        with vol.batch_upload() as batch:
            batch.put_file(local_path, remote_path)
        print(f"  ✓ {vf['remote']} uploaded ({vf['desc']})")
        uploaded.append(vf["remote"])

    print()
    print(f"Done. Uploaded: {uploaded}" + (f" | Skipped: {skipped}" if skipped else ""))
    print("Now deploy: modal deploy modal_pipeline.py")
    if skipped:
        print(f"Note: {skipped} not found — dual-char char1 will fall back to voice2 until uploaded.")


if __name__ == "__main__":
    main()
