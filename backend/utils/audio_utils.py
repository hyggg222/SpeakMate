import os
import uuid
from pydub import AudioSegment
import logging

UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logging.info(f"Da tao thu muc uploads tai: {UPLOAD_FOLDER}")

def save_and_convert_audio(audio_file):
    try:
        original_filename = f"{uuid.uuid4()}_{audio_file.filename}"
        original_path = os.path.join(UPLOAD_FOLDER, original_filename)
        
        audio_file.save(original_path)
        logging.info(f"Da luu file goc: {original_path}")
        
        wav_filename = f"{uuid.uuid4()}.wav"
        wav_path = os.path.join(UPLOAD_FOLDER, wav_filename)
        
        sound = AudioSegment.from_file(original_path)
        
        sound = sound.set_frame_rate(16000).set_channels(1)
        sound.export(wav_path, format="wav")
        
        logging.info(f"Da chuyen doi sang WAV: {wav_path}")
        
        cleanup_file(original_path)
        
        return wav_path
        
    except Exception as e:
        logging.error(f"Loi khi luu/chuyen doi file: {e}")
        if 'original_path' in locals() and os.path.exists(original_path):
             cleanup_file(original_path)
        if 'wav_path' in locals() and os.path.exists(wav_path):
            cleanup_file(wav_path)
        raise e

def cleanup_file(file_path):
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            logging.info(f"Da xoa file tam: {file_path}")
    except Exception as e:
        logging.warning(f"Khong the xoa file tam: {file_path}. Loi: {e}")
