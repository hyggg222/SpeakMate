import os
import torch
import librosa
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import logging

stt_model = None
stt_processor = None
device = "cuda:0" if torch.cuda.is_available() else "cpu"

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'whisper-small-local'))

def init_stt_model():
    global stt_model, stt_processor
    
    if stt_model is not None:
        logging.info("Model STT (Whisper) da duoc load.")
        return

    try:
        logging.info(f"Bat dau load model STT tu: {MODEL_PATH}")
        if not os.path.exists(MODEL_PATH) or not os.listdir(MODEL_PATH):
            logging.error(f"Thu muc model khong ton tai hoac bi trong: {MODEL_PATH}")
            logging.error("VUI LONG CHAY SCRIPT 'scripts/prepare_model.py' TRUOC KHI CHAY SERVER.")
            raise FileNotFoundError("Chua co model Whisper local.")
            
        stt_processor = AutoProcessor.from_pretrained(MODEL_PATH)
        stt_model = AutoModelForSpeechSeq2Seq.from_pretrained(MODEL_PATH).to(device)
        
        logging.info(f"Load model STT (Whisper) thanh cong. Dang chay tren: {device}")
        
    except Exception as e:
        logging.error(f"Loi nghiem trong khi load model STT: {e}")
        raise e

def transcribe_audio(wav_file_path):
    if stt_model is None or stt_processor is None:
        raise Exception("Model STT chua duoc khoi tao.")

    try:
        speech_array, sampling_rate = librosa.load(wav_file_path, sr=16000)
        
        input_features = stt_processor(speech_array, sampling_rate=16000, return_tensors="pt").input_features.to(device)

        predicted_ids = stt_model.generate(input_features) 
        
        transcription = stt_processor.batch_decode(predicted_ids, skip_special_tokens=True)
        
        return transcription[0].strip()
        
    except Exception as e:
        logging.error(f"Loi trong qua trinh transcribe: {e}")
        return f"[Loi STT: {e}]"
