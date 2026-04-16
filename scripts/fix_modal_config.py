import os
from huggingface_hub import hf_hub_download
import modal

def fix_config():
    print("Downloading correct config.json for ZeroShot TTS from HuggingFace...")
    config_path = hf_hub_download(
        repo_id="valtecAI-team/valtec-zeroshot-voice-cloning",
        filename="pretrained/zeroshot/config.json",
        repo_type="space"
    )

    print(f"Downloaded to {config_path}. Saving copy to local drive...")
    
    import shutil
    shutil.copy(config_path, "zeroshot_config.json")
    print("Saved to zeroshot_config.json")
    
    print("Now run: modal volume put speakmate-valtec-models zeroshot_config.json valtec-tts-pretrained/config.json")
        
if __name__ == "__main__":
    fix_config()
