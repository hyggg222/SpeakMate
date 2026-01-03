import google.generativeai as genai
import logging
import base64

tts_model = None
SAMPLE_RATE = 24000

def init_tts_model(api_key):
    global tts_model
    try:
        logging.info("Dang khoi tao model TTS (Gemini)...")
        genai.configure(api_key=api_key) 
        
        tts_model = genai.GenerativeModel('gemini-2.5-flash-preview-tts')
        logging.info("Khoi tao model GenAI (TTS) thanh cong.")
    except Exception as e:
        logging.error(f"Loi khi khoi tao model GenAI (TTS): {e}")
        raise

def generate_audio_feedback(text_to_speak, voice="Kore"):
    if not tts_model:
        logging.error("Loi TTS: Model TTS chua duoc khoi tao.")
        return None

    try:
        logging.info(f"Bat dau tao TTS cho text: {text_to_speak[:30]}...")
        prompt = f"Nói một cách rõ ràng và thân thiện: {text_to_speak}"
        
        response = tts_model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_modalities=["AUDIO"],
                speech_config=genai.SpeechConfig(
                    voice_config=genai.VoiceConfig(
                        prebuilt_voice_config=genai.PrebuiltVoiceConfig(
                            voice_name=voice
                        )
                    )
                )
            )
        )
        
        part = response.candidates[0].content.parts[0]
        if 'inline_data' in part:
            audio_data = part.inline_data.data
            mime_type = part.inline_data.mime_type
            
            base64_string = base64.b64encode(audio_data).decode('utf-8')
            data_uri = f"data:{mime_type}; rate={SAMPLE_RATE};base64,{base64_string}"
            
            logging.info("Tao file TTS thanh cong.")
            return data_uri
        else:
            logging.error("Loi TTS: API khong tra ve inline_data.")
            return None
            
    except Exception as e:
        logging.error(f"Loi trong qua trinh goi API Gemini TTS: {e}")
        return None
