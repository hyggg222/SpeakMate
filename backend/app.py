import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import logging

from services import speech_to_text, generative_text, text_to_speech
from utils import audio_utils

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)
logging.basicConfig(level=logging.INFO)

GEMINI_API_KEY_FEEDBACK = os.getenv("GEMINI_API_KEY_FEEDBACK")
GEMINI_API_KEY_TOPIC = os.getenv("GEMINI_API_KEY_TOPIC")
GEMINI_API_KEY_TTS = os.getenv("GEMINI_API_KEY_TTS")

if not (GEMINI_API_KEY_FEEDBACK and GEMINI_API_KEY_TOPIC and GEMINI_API_KEY_TTS):
    print("LOI: Chua thiet lap du 3 API key trong file .env:")
    print("- GEMINI_API_KEY_FEEDBACK")
    print("- GEMINI_API_KEY_TOPIC")
    print("- GEMINI_API_KEY_TTS")
else:
    try:
        speech_to_text.init_stt_model()
        
        generative_text.init_genai_models(
            feedback_api_key=GEMINI_API_KEY_FEEDBACK,
            topic_api_key=GEMINI_API_KEY_TOPIC
        )
        text_to_speech.init_tts_model(GEMINI_API_KEY_TTS)
        
        print("\n--- Tat ca model da duoc load. Server san sang! ---")
    except Exception as e:
        print(f"LOI KHOI DONG: Khong the load model. Kiem tra lai API key hoac file model. Loi: {e}")

@app.route('/api/generate-topic', methods=['GET'])
def generate_topic_endpoint():
    logging.info("Nhan yeu cau GET /api/generate-topic")
    try:
        topic = generative_text.generate_new_topic()
        return jsonify({"topic": topic})
    except Exception as e:
        logging.error(f"Loi khi tao topic: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/process-speech', methods=['POST'])
def process_speech_endpoint():
    logging.info("Nhan yeu cau POST /api/process-speech")
    
    if 'audio' not in request.files:
        return jsonify({"error": "Khong tim thay file audio"}), 400

    audio_file = request.files['audio']
    
    try:
        wav_file_path = audio_utils.save_and_convert_audio(audio_file)
    except Exception as e:
        logging.error(f"Loi xu ly file audio: {e}")
        return jsonify({"error": f"Loi xu ly file audio: {e}"}), 500

    try:
        transcript = speech_to_text.transcribe_audio(wav_file_path)
        if not transcript:
            raise Exception("Mo hinh STT khong the nhan dien duoc giong noi.")
            
        logging.info(f"Transcript: {transcript}")

        feedback_text = generative_text.get_feedback_on_speech(transcript)
        logging.info(f"Feedback Text: {feedback_text[:50]}...")

        feedback_audio_base64 = text_to_speech.generate_audio_feedback(feedback_text)
        logging.info("Da tao audio feedback (base64).")

        return jsonify({
            "transcript": transcript,
            "feedback_text": feedback_text,
            "feedback_audio_base64": feedback_audio_base64
        })

    except Exception as e:
        logging.error(f"Loi trong qua trinh AI pipeline: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        audio_utils.cleanup_file(wav_file_path)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
