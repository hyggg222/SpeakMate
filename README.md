# SpeakMate - AI Speaking Coach

**SpeakMate** là một ứng dụng web mô phỏng môi trường luyện nói tiếng Anh thông minh, giúp người dùng tự tin hơn trong giao tiếp. Ứng dụng sử dụng các công nghệ AI tiên tiến để lắng nghe, phân tích và đưa ra phản hồi chi tiết cho người học.

![SpeakMate Banner](frontend/public/vite.svg) <!-- Có thể thay bằng ảnh screenshot sau này -->

## 🌟 Tính năng chính

1.  **Luyện nói tự do (Free Talk)**:
    *   Người dùng nhận chủ đề ngẫu nhiên từ AI hoặc nói về bất cứ điều gì.
    *   Giao diện ghi âm trực quan với hiệu ứng sóng âm.
2.  **Chuyển đổi giọng nói thành văn bản (STT)**:
    *   Sử dụng mô hình **Whisper** để nhận diện giọng nói chính xác.
3.  **Phản hồi thông minh (AI Feedback)**:
    *   Tự động phân tích ngữ pháp, từ vựng và sự trôi chảy.
    *   Đưa ra gợi ý sửa lỗi và cách diễn đạt tự nhiên hơn.
4.  **Tương tác giọng nói (TTS)**:
    *   AI phản hồi lại bằng giọng nói tự nhiên, tạo cảm giác như đang trò chuyện với người thật.

## 🛠️ Tech Stack (Công nghệ sử dụng)

Dự án được xây dựng với kiến trúc hiện đại, tách biệt rõ ràng giữa Frontend và Backend.

### Frontend
*   **Core**: HTML5, Vanilla JavaScript (ES6+).
*   **Build Tool**: [Vite](https://vitejs.dev/) - Tối ưu hóa tốc độ phát triển và build.
*   **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) - Thiết kế giao diện đẹp, hiện đại và responsive.
*   **Icons**: Phosphor Icons.
*   **Effects**: CSS Animations, Glassmorphism UI.

### Backend
*   **Language**: Python 3.x.
*   **Framework**: [Flask](https://flask.palletsprojects.com/) - Xử lý API và phục vụ ứng dụng.
*   **Security**: Quản lý biến môi trường với `python-dotenv`.

### AI & Machine Learning
*   **Speech-to-Text (STT)**: [OpenAI Whisper](https://github.com/openai/whisper) (Model `small` chạy local).
*   **Generative AI**: **Google Gemini 1.5/2.0** (qua Google GenAI SDK).
    *   Sinh chủ đề nói chuyện.
    *   Phân tích và chấm điểm bài nói.
*   **Text-to-Speech (TTS)**: Google Gemini Audio Capabilities hoặc gTTS (tùy cấu hình).

## 🚀 Cài đặt và Chạy dự án

### Yêu cầu tiên quyết
*   Node.js (v18+)
*   Python (v3.10+)
*   Git

### 1. Backend Setup
```bash
cd backend
# Tạo và kích hoạt virtual environment (khuyến nghị)
python -m venv venv
# Windows
.\venv\Scripts\activate

# Cài đặt thư viện
pip install -r ../requirements.txt

# Cấu hình biến môi trường
# Tạo file .env tại thư mục gốc và thêm các key:
# GEMINI_API_KEY_FEEDBACK=...
# GEMINI_API_KEY_TOPIC=...
# GEMINI_API_KEY_TTS=...

# Chạy server
python app.py
```
Server sẽ chạy tại: `http://localhost:5000`

### 2. Frontend Setup
```bash
cd frontend
# Cài đặt dependencies
npm install

# Chạy môi trường phát triển (Dev)
npm run dev
```
Truy cập web tại: `http://localhost:5173`

### 3. Build & Deploy
Để chạy chế độ Production (Backend phục vụ file tĩnh):
```bash
cd frontend
npm run build
cd ../backend
python app.py
```

## 📂 Cấu trúc dự án
```
AI_AGENT_TAPNOI/
├── backend/                # Source code Backend (Flask)
│   ├── models/             # Chứa model AI (Whisper, etc.)
│   ├── services/           # Logic xử lý AI (STT, Text, TTS)
│   ├── static/             # Chứa file build từ Frontend (Production)
│   ├── utils/              # Các hàm tiện ích
│   └── app.py              # File chính chạy server
├── frontend/               # Source code Frontend (Vite)
│   ├── public/             # Assets công khai
│   ├── src/                # Logic JS và CSS chính
│   ├── index.html          # Entry point
│   ├── tailwind.config.js  # Cấu hình Tailwind
│   └── vite.config.js      # Cấu hình Vite
└── requirements.txt        # Backend dependencies
```

## 👤 Tác giả
Phát triển bởi [hyggg222](https://github.com/hyggg222).
