import modal
import os

app = modal.App("test-volume")
vol = modal.Volume.from_name("speakmate-valtec-models")

@app.function(volumes={"/valtec_models": vol})
def check():
    print("--- Volume Check ---")
    for root, dirs, files in os.walk("/valtec_models"):
        for name in files:
            print(f"FILE: {os.path.join(root, name)}")
        for name in dirs:
            print(f"DIR: {os.path.join(root, name)}")

@app.local_entrypoint()
def main():
    check.remote()
