"""
Upload Valtec-TTS pretrained weights to Modal persistent volume.
Run this ONCE before deploying the pipeline:
    python upload_models_to_modal.py
"""
import modal
import os

VOLUME_NAME = "speakmate-valtec-models"
LOCAL_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "valtec-tts-pretrained")
REMOTE_DIR = "valtec-tts-pretrained"

FILES_TO_UPLOAD = ["G.pth", "config.json"]

def main():
    if not os.path.exists(LOCAL_MODEL_DIR):
        print(f"ERROR: Local model directory not found at {LOCAL_MODEL_DIR}")
        return

    vol = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

    print(f"Checking files in {LOCAL_MODEL_DIR}...")
    
    with vol.batch_upload() as batch:
        for filename in FILES_TO_UPLOAD:
            local_path = os.path.join(LOCAL_MODEL_DIR, filename)
            if os.path.exists(local_path):
                print(f"Uploading {filename} ({(os.path.getsize(local_path)/1024/1024):.2f} MB) ...")
                batch.put_file(local_path, f"/{REMOTE_DIR}/{filename}")
            else:
                print(f"WARNING: {filename} not found locally. Skipping.")

    print(f"\nUpload complete! Models are in /valtec_models/{REMOTE_DIR}/ inside the Modal container.")
    print("You can now deploy: modal deploy modal_pipeline.py")

if __name__ == "__main__":
    main()
