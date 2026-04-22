# Test PhoWhisper

Thư mục này chứa script độc lập để test thử model STT **PhoWhisper** (`kiendt/PhoWhisper-large-ct2`) bằng thư viện `faster-whisper` mà không cần chạy toàn bộ pipeline của dự án (LiveKit/Modal).

## Cài đặt

1. Mở terminal tại thư mục này (`d:\SpeakMate\test_phowhisper`)
2. Khuyến nghị tạo một virtual environment mới nếu bạn chưa cài `faster-whisper` trong môi trường hệ thống.
3. Cài đặt thư viện:

```bash
pip install -r requirements.txt
```

*(Lưu ý: Để chạy được GPU CUDA trên Windows, hệ thống cần cài sẵn CUDA Toolkit và cuDNN tương thích. Nếu không script sẽ tự động fallback về chạy trên CPU).*

## Cú pháp chạy

Bạn có 2 cách chạy tuỳ vào môi trường:

### Cách 1: Chạy trực tiếp trên Cloud Modal (Khuyến nghị nếu máy không có CUDA)
Script sẽ tải file audio lên server L4 GPU của Modal và trả về kết quả, tránh lỗi PyTorch win127.

```bash
# Chạy mặc định với data/voice_samples/voice1.wav
modal run test_stt_modal.py

# Chỉ định file chuyên biệt
modal run test_stt_modal.py --audio-path "duong/dan/toi/file.wav"
```

### Cách 2: Chạy tại máy tính cá nhân (Cần GPU/CUDA)
Chạy kịch bản test mặc định:

```bash
python test_stt.py
```

Hoặc chỉ định rõ file âm thanh muốn test:

```bash
python test_stt.py --audio "duong/dan/toi/file_am_thanh.wav"
```

## Giải thích script
- Sử dụng `faster-whisper.WhisperModel`
- Hỗ trợ chạy VAD (`vad_filter=True`) trước khi đưa qua STT để bỏ qua các đoạn im lặng và cải thiện hiệu năng.
- Tự động download weight của `kiendt/PhoWhisper-large-ct2` (khoảng 3GB) từ HuggingFace nên lần chạy đầu sẽ mất một chút thời gian tải.
- Không có bất kì sự phụ thuộc nào vào code chính trong app, đảm bảo an toàn.
