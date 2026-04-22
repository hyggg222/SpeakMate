# PROMPT: Phân tích Tech Stack & User Flow → Tạo Script Demo End-to-End

## Vai trò
Bạn là một Product Marketing Engineer — người hiểu sâu cả kỹ thuật lẫn cách trình bày sản phẩm trước khán giả. Nhiệm vụ:
1. Đọc và hiểu toàn bộ kiến trúc kỹ thuật của SpeakMate
2. Đọc và hiểu user flow qua tất cả các tính năng
3. Tạo script demo end-to-end cho buổi pitch 10 phút, trong đó mỗi bước demo gắn liền với tech stack phía sau

---

## Input 1: Hồ sơ dự án

[DÁN TOÀN BỘ HỒ SƠ DỰ ÁN VÀO ĐÂY — bao gồm tất cả các phần từ Phần 0 đến Phần 5]

## Input 2: Các Feature Specs

[DÁN NỘI DUNG CÁC SPEC SAU (nếu có):
- Story Bank Spec
- Story Creation Flow Spec  
- Bridge to Reality Spec
- Mentor Ni Chat Spec
]

## Input 3: Bối cảnh buổi pitch

- Cuộc thi: AI Young Guru 2026 — Vòng thực chiến
- Thời gian pitch: 10 phút (bao gồm demo)
- Thời gian dành cho demo: tối đa 2-2.5 phút
- Ban giám khảo: mix giữa người kỹ thuật và người business
- Đội thi: 2 người (Nguyễn Lê Gia Huy, Nguyễn Phạm Hoàng Lâm)
- Sản phẩm đã deploy: có app chạy thật, demo live

---

## Yêu cầu phân tích

### A. Mapping Tech Stack → Điểm demo

Tạo bảng mapping: mỗi công nghệ trong tech stack → nó thể hiện ở đâu trong app → user thấy gì → câu nói nào trong demo.

Format:

```
| Công nghệ | Vai trò trong hệ thống | User thấy gì | Câu nói demo |
|-----------|----------------------|--------------|-------------|
| Gemini 2.0 Flash (The Brain) | Sinh kịch bản JSON | Bối cảnh được tạo trong 1-2 giây | "Agent đầu tiên — The Brain — cào toàn bộ yêu cầu rồi sinh kịch bản..." |
| PhoWhisper (VinAI) | STT tiếng Việt | User nói, text hiện lên | "Giọng nói đi qua PhoWhisper của VinAI..." |
| ... | ... | ... | ... |
```

Yêu cầu:
- Cover TẤT CẢ công nghệ trong tech stack, không bỏ sót
- Mỗi công nghệ phải có ít nhất 1 điểm demo visible cho khán giả
- Nếu một công nghệ không visible (ví dụ: Zustand state management), ghi rõ "không demo được" và đề xuất cách nhắc đến bằng lời
- Ưu tiên công nghệ nào TẠO ẤN TƯỢNG MẠNH NHẤT khi demo live (tốc độ phản hồi, barge-in, báo cáo chi tiết...)

### B. Mapping User Flow → Thứ tự demo

Vẽ toàn bộ user flow của SpeakMate qua tất cả các phòng/tính năng:

```
Đăng nhập → Dashboard
├── Story Bank
│   ├── Tạo story mới (chat với Ni → cấu trúc hóa → lưu)
│   ├── Quản lý stories
│   └── Ôn story trước phiên gym
├── Phòng gym
│   ├── Chọn chế độ (Đối thoại / Thuyết trình / Tranh biện)
│   ├── Tạo bối cảnh → The Brain sinh kịch bản
│   ├── Gợi ý Story Bank (modal trước phiên)
│   ├── Luyện tập voice realtime (The Voice + PhoWhisper + NeuTTS + VAD)
│   └── Kết thúc → Evaluation
├── Evaluation
│   ├── Báo cáo Analyst (The Analyst)
│   ├── Mentor Ni comment
│   ├── Story Bank Coverage
│   └── CTA → Challenge / Luyện lại / Story Bank
├── Bridge to Reality
│   ├── Challenge card
│   ├── User thực hiện ngoài đời
│   └── Feedback (voice/form) → Ni phân tích
├── Mentor Ni Chat (accessible mọi lúc)
│   ├── Query dữ liệu cá nhân
│   ├── Action → chuyển phòng
│   └── Support → tâm sự
└── Gamification
    ├── XP system
    ├── Streak
    └── Badges
```

Từ flow trên, chọn ra MỘT ĐƯỜNG ĐI DUY NHẤT cho demo 2-2.5 phút. Đường đi phải:
- Cover nhiều công nghệ nhất có thể
- Có điểm "wow" rõ ràng (tốc độ phản hồi voice, barge-in, báo cáo chi tiết)
- Kể được một câu chuyện liền mạch (không nhảy lung tung)
- Bối cảnh demo phải THỰC TẾ với cuộc thi (ví dụ: luyện pitch sản phẩm cho hackathon)

### C. Tạo Script Demo

Viết script demo hoàn chỉnh theo format sau:

```
## Script Demo End-to-End (~2 phút X giây)

### Mở đầu
[Hành động trên app]
> "Câu nói của presenter"
(Tech highlight: công nghệ nào đang chạy phía sau)

### Bước 1: [Tên bước]
[Hành động trên app]
> "Câu nói..."
(Tech highlight: ...)

### Bước 2: ...

### Kết demo
> "Câu nói tổng kết..."
```

Quy tắc viết script:
1. **User thấy trước, giải thích sau.** Không nói "hệ thống dùng PhoWhisper" rồi mới demo. Demo trước, rồi nói "tốc độ đó là nhờ PhoWhisper chạy local."
2. **Mỗi bước chỉ highlight 1-2 tech.** Không liệt kê cả stack trong một câu.
3. **Bối cảnh phải liên quan đến cuộc thi.** Ví dụ: luyện giới thiệu SpeakMate cho đội khác trong hackathon.
4. **Có ít nhất 1 điểm bất ngờ** mà khán giả không ngờ tới. Ví dụ: ngắt lời AI giữa chừng (barge-in), hoặc báo cáo trích dẫn chính xác lời vừa nói.
5. **Không quá 2.5 phút.** Ước tính thời gian mỗi bước.
6. **Kết demo bằng 1 câu gói gọn kiến trúc** — "Ba Agent, ba vai trò..." kiểu tóm tắt.
7. **Tone tự nhiên** — không đọc bài, nói như đang show cho bạn xem.

### D. Backup plan

Demo live luôn có rủi ro. Đề xuất:

1. **Nếu app bị lag / timeout:**
   - Câu nào nói để cover?
   - Có video backup không?
   - Chuyển sang slide tĩnh nào?

2. **Nếu AI phản hồi kém chất lượng (hallucination, off-topic):**
   - Xử lý thế nào trên sân khấu?
   - Nói gì để biến lỗi thành điểm demo? (ví dụ: "đây chính là lý do chúng tôi có Validation Gate")

3. **Nếu thiếu thời gian (phần trước kéo dài):**
   - Bước nào trong demo có thể cắt?
   - Bước nào KHÔNG THỂ cắt (phải có để demo có ý nghĩa)?

### E. Checklist trước demo

Liệt kê checklist mà presenter phải kiểm tra trước khi lên sân khấu:

```
□ App đã deploy và truy cập được
□ Account demo đã đăng nhập sẵn
□ Story Bank đã có sẵn 2-3 stories (không tạo mới trên sân khấu)
□ Internet ổn định (có hotspot backup?)
□ Micro hoạt động (test voice input trước 5 phút)
□ Màn hình project/share đã setup
□ ...
```

---

## Quy tắc output

- Script phải ĐỌC THÀNH TIẾNG ĐƯỢC — không dùng câu quá dài, không dùng thuật ngữ mà BGK business không hiểu
- Tech highlight phải tự nhiên, không gượng — "nhờ PhoWhisper chạy local nên dưới 1 giây" chứ không phải "chúng tôi sử dụng mô hình PhoWhisper kiến trúc Large CTranslate2 chạy cục bộ trên Modal.com"
- Ước tính thời gian mỗi bước phải thực tế — tính cả thời gian chờ AI phản hồi, chuyển màn hình
- Bối cảnh demo phải meta (liên quan đến cuộc thi) nếu có thể
- Output bằng tiếng Việt
