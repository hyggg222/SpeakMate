import modal

def upload_config():
    print("Uploading correct config.json directly to volume...")
    vol = modal.Volume.from_name("speakmate-valtec-models")
    with open("config.json", "rb") as f:
        data = f.read()
        
    print("Writing bytes wrapper...")
    import io
    vol.write_file("valtec-tts-pretrained/config.json", io.BytesIO(data))
    vol.commit()
    print("Done!")

if __name__ == "__main__":
    upload_config()
