import requests
import base64
import json
import os

# Configuration
MODAL_URL = "https://optimindss4--speakmate-pipeline-v2-voicepipeline-interact.modal.run"
AUDIO_FILE = "sample1.wav"

def test_interact():
    if not os.path.exists(AUDIO_FILE):
        print(f"Error: {AUDIO_FILE} not found. Please ensure it exists in the current directory.")
        return

    print(f"Reading {AUDIO_FILE}...")
    with open(AUDIO_FILE, "rb") as f:
        audio_content = f.read()
    
    audio_base64 = base64.b64encode(audio_content).decode('utf-8')

    payload = {
        "audio_base64": audio_base64,
        "scenario_str": json.dumps({
            "interviewerPersona": "Người hướng dẫn tiếng Anh",
            "goals": ["Luyện tập chào hỏi"],
            "startingTurns": [{"speaker": "AI", "line": "Chào bạn, tôi là Ni. Bạn khỏe không?"}]
        }),
        "conversation_history_str": json.dumps([
            {"speaker": "AI", "line": "Chào bạn, tôi là Ni. Bạn khỏe không?"}
        ]),
        "user_name": "Người dùng"
    }

    print(f"Sending request to {MODAL_URL}...")
    try:
        response = requests.post(MODAL_URL, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        print("\n--- Server Response ---")
        print(f"User Transcript: {result.get('userTranscript')}")
        print(f"AI Response: {result.get('aiResponse')}")
        if 'botAudioUrl' in result:
            print("Bot Audio: Received (base64 data)")
        else:
            print("Bot Audio: Not received")
            
        if 'error' in result:
            print(f"Server-side Error: {result['error']}")

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_interact()
