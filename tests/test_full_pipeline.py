import requests
import json
import os
import base64

def test_full_cloud_pipeline():
    # URL của Unified Cloud Pipeline (STT + LLM + TTS)
    url = "https://hyggg222--speakmate-pipeline-v2-voicepipeline-interact.modal.run"
    audio_path = "d:/SpeakMate/sample1.wav"
    
    if not os.path.exists(audio_path):
        print(f"❌ Error: Không tìm thấy file {audio_path}. Bạn hãy chuẩn bị 1 file wav để test nhé!")
        return

    print(f"--- [START] UNIFIED CLOUD PIPELINE TEST ---")
    
    # Đọc và mã hóa audio
    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")

    # Dữ liệu giả lập
    scenario = {
        "interviewerPersona": "Một người bạn thân thiết, vui vẻ.",
        "goals": ["Hỏi thăm sức khỏe", "Tán gẫu về công nghệ"]
    }
    history = [] # Trống cho lượt đầu tiên

    data = {
        'audio_base64': audio_b64,
        'scenario_str': json.dumps(scenario),
        'conversation_history_str': json.dumps(history),
        'speaker': 'NF' # Giọng nữ SOTA
    }

    print(f"Step 1: Gửi request lên Modal Cloud (STT -> LLM -> TTS)...")
    try:
        response = requests.post(url, json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ PIPELINE SUCCESSFUL!")
            print(f"🎤 Bạn đã nói: {result.get('userTranscript')}")
            print(f"🤖 Ni trả lời: {result.get('aiResponse')}")
            
            audio_url = result.get('botAudioUrl', '')
            if audio_url.startswith('data:audio'):
                print(f"🔊 Audio nhận được: (Base64 string, độ dài {len(audio_url)} ký tự)")
                # Lưu file kết quả để nghe thử
                with open("d:/SpeakMate/test_full_output.wav", "wb") as out:
                    # Bỏ phần tiền tố 'data:audio/wav;base64,'
                    header, data_b64 = audio_url.split(',')
                    out.write(base64.b64decode(data_b64))
                print(f"💾 Kết quả đã được lưu tại: d:/SpeakMate/test_full_output.wav")
            
        else:
            print(f"❌ Cloud Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Kết nối thất bại: {e}")

if __name__ == "__main__":
    test_full_cloud_pipeline()
