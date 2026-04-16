import modal
import os

def main():
    vol = modal.Volume.from_name("speakmate-valtec-models")
    local_base = r"D:\SpeakMate\models\valtec-tts-pretrained"
    
    files = ["G.pth", "config.json"]
    for f in files:
        local_path = os.path.join(local_base, f)
        remote_path = f"/valtec-tts-pretrained/{f}"
        print(f"Uploading {f} to {remote_path}...")
        with open(local_path, "rb") as fh:
            vol.write_file(remote_path, fh)
    
    vol.commit()
    print("Upload and commit complete!")

if __name__ == "__main__":
    main()
