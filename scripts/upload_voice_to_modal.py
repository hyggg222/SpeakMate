"""
Upload voice clone reference audio to Modal persistent volume.
Run this ONCE before deploying the pipeline:
    python upload_voice_to_modal.py
"""
import modal
import os

VOLUME_NAME = "speakmate-valtec-models"
LOCAL_VOICE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "voice_samples", "sample2", "voice2.mp3")
REMOTE_DIR = "voice_clone"
REMOTE_FILENAME = "voice2.mp3"

def main():
    if not os.path.exists(LOCAL_VOICE_PATH):
        print(f"ERROR: Voice sample not found at {LOCAL_VOICE_PATH}")
        return

    vol = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

    print(f"Uploading {LOCAL_VOICE_PATH} -> /{REMOTE_DIR}/{REMOTE_FILENAME} ...")

    with open(LOCAL_VOICE_PATH, "rb") as f:
        voice_data = f.read()

    with vol.batch_upload() as batch:
        batch.put_file(LOCAL_VOICE_PATH, f"/{REMOTE_DIR}/{REMOTE_FILENAME}")

    print(f"Upload complete! Voice sample is at /valtec_models/{REMOTE_DIR}/{REMOTE_FILENAME} inside the Modal container.")
    print("You can now deploy: modal deploy modal_pipeline.py")

if __name__ == "__main__":
    main()
