# SpeakMate — Script Demo End-to-End cho AI Young Guru 2026

**Bối cảnh:** Cuộc thi AI Young Guru 2026 — Vòng thực chiến. Pitch 10 phút, demo tối đa 2-2.5 phút. BGK mix kỹ thuật + business. Đội: Huy + Lâm. App đã deploy, demo live.

---

## A. Mapping Tech Stack → Điểm Demo

| Công nghệ | Vai trò trong hệ thống | User thấy gì | Câu nói demo |
|-----------|----------------------|--------------|-------------|
| **Gemini 2.0 Flash (The Brain)** | Sinh kịch bản JSON từ input user | Bối cảnh xuất hiện trong 1-2 giây sau khi user mô tả mục tiêu | "Các bạn thấy không — vừa gõ xong, kịch bản đã xuất hiện. Agent đầu tiên — The Brain — phân tích yêu cầu và tạo bối cảnh phỏng vấn hoàn chỉnh." |
| **Silero VAD** | Phát hiện bắt đầu/kết thúc giọng nói, kích hoạt barge-in | User ngắt lời AI giữa chừng, AI dừng ngay | "Tôi vừa ngắt lời AI giữa câu — nó dừng ngay lập tức. Đó là nhờ Silero VAD phát hiện giọng nói theo thời gian thực." |
| **PhoWhisper (VinAI)** | STT tiếng Việt, CTranslate2 chạy cục bộ trên GPU | User nói tiếng Việt, transcript hiện lên dưới 1 giây | "Giọng nói đi qua PhoWhisper của VinAI — mô hình nhận diện tiếng Việt chạy cục bộ, nên dưới 1 giây đã có text." |
| **Gemma 4 (The Voice)** | LLM gọn chạy cục bộ, duy trì hội thoại realtime | AI phản hồi tự nhiên, đúng ngữ cảnh, không phải chờ lâu | "Model Gemma 4 chạy local trên GPU — không gọi API nên zero latency cho phần suy luận hội thoại." |
| **NeuTTS (Air-Vi)** | Tổng hợp giọng nói tiếng Việt tự nhiên | AI nói tiếng Việt có cảm xúc, nghe tự nhiên | "Giọng nói đó là NeuTTS — mô hình giọng Việt với cảm xúc tự nhiên, không phải giọng robot." |
| **LiveKit Cloud SFU + WebRTC** | Truyền audio 48kHz qua WebRTC, latency < 1s | Cuộc hội thoại mượt, không delay đáng kể | "Toàn bộ audio truyền qua WebRTC với LiveKit — latency tính bằng mili giây, giống gọi điện thoại." |
| **Gemini 2.0 Pro (The Analyst)** | Phân tích toàn bộ transcript, sinh báo cáo chi tiết | Báo cáo đánh giá với điểm số, radar chart, trích dẫn cụ thể | "Agent thứ ba — The Analyst — vừa mổ xẻ toàn bộ cuộc hội thoại. Các bạn thấy nó trích dẫn chính xác câu tôi nói ở phút thứ 2." |
| **Modal.com (Serverless GPU L4)** | Chạy Voice Pipeline trên GPU đám mây, trả tiền theo giây | Phòng tập luôn sẵn sàng trong 2 giây | *Không demo trực tiếp — nhắc bằng lời:* "Toàn bộ pipeline chạy trên GPU serverless — chỉ tốn tiền khi có học sinh thực sự luyện tập." |
| **Next.js 16 (App Router)** | Frontend hiện đại, SSR + Streaming | Giao diện load nhanh, chuyển trang mượt | *Không demo trực tiếp — visible qua tốc độ app.* |
| **Supabase (Auth + DB + Storage)** | Xác thực, lưu trữ dữ liệu, audio tạm | Đăng nhập nhanh, lịch sử phiên được lưu | *Không demo trực tiếp — nhắc bằng lời nếu cần:* "Dữ liệu lưu trên Supabase, audio tự hủy sau 1 giờ — Privacy First." |
| **Zustand (State Management)** | Quản lý trạng thái, State Isolation giữa các chế độ | Chuyển giữa các phòng không bị lẫn dữ liệu | *Không demo được — nhắc trong slide kiến trúc nếu có thời gian.* |
| **TypeScript 5.x + Zod** | Type safety, Validation Gate cho JSON AI output | Kịch bản luôn đúng format, không bao giờ crash | *Nhắc bằng lời:* "Mọi output từ AI đều đi qua Validation Gate — nếu sai format, hệ thống tự retry." |
| **Express 5 (Control Plane)** | Backend xác thực, quản lý phiên | API phản hồi nhanh | *Không demo trực tiếp.* |
| **Tailwind CSS + shadcn/ui** | Giao diện đẹp, responsive | UI sạch, hiện đại | *Visible trong suốt demo — không cần nhắc riêng.* |
| **Framer Motion** | Animation mượt | Chuyển cảnh, hiệu ứng thinking | *Visible — không cần nhắc riêng.* |
| **Recharts** | Radar chart trong báo cáo | Biểu đồ đánh giá trực quan | "Biểu đồ radar 5 chiều — từ ngữ pháp đến khả năng phản biện." |

---

## B. Mapping User Flow → Thứ tự Demo

### User flow toàn bộ:

```
Đăng nhập → Dashboard
├── Story Bank (Chuẩn bị 30%)
│   ├── Tạo story mới (chat với Ni → cấu trúc hóa STAR → lưu)
│   ├── Quản lý stories (filter, tag, trạng thái)
│   └── Ôn story trước phiên gym (tag matching)
├── Phòng gym (Luyện tập 70%)
│   ├── Chọn chế độ (Đối thoại / Thuyết trình / Tranh biện)
│   ├── Mô tả mục tiêu → The Brain sinh kịch bản
│   ├── Story Bank gợi ý (modal trước phiên)
│   ├── Luyện tập voice realtime (VAD + PhoWhisper + Gemma + NeuTTS)
│   ├── Barge-in (ngắt lời AI)
│   └── Kết thúc → Evaluation
├── Evaluation
│   ├── Báo cáo Analyst (điểm + radar + trích dẫn)
│   ├── Story Bank Coverage (story nào đã dùng, phần nào bỏ sót)
│   └── CTA → Challenge / Luyện lại / Story Bank
├── Bridge to Reality
│   ├── Challenge card (sinh từ điểm yếu)
│   ├── User thực hiện ngoài đời
│   └── Feedback (voice/form) → Ni phân tích
├── Mentor Ni Chat (accessible mọi lúc)
│   ├── Query dữ liệu cá nhân (Story Bank, lịch sử, XP)
│   ├── Action → chuyển phòng (pre-fill data)
│   └── Support → tâm sự, hỗ trợ tâm lý
└── Gamification
    ├── XP system (thưởng cả thất bại)
    ├── Streak (tuần liên tiếp)
    └── Badges (3/7/15 streak)
```

### Đường đi demo được chọn (~2 phút 20 giây):

**Lý do chọn đường này:** Cover nhiều tech nhất (Brain, VAD, PhoWhisper, Gemma, NeuTTS, LiveKit, Analyst), có 2 điểm wow (barge-in + báo cáo trích dẫn), kể câu chuyện liền mạch, bối cảnh meta (luyện pitch chính SpeakMate cho cuộc thi).

```
Dashboard → Phòng gym (chọn Đối thoại) → Tạo bối cảnh (The Brain)
→ Luyện tập voice 3-4 lượt (barge-in ở lượt 2)
→ Kết thúc → Báo cáo Analyst (radar + trích dẫn)
→ Flash qua Story Bank + Challenge card
```

---

## C. Script Demo End-to-End (~2 phút 20 giây)

### Mở đầu (5 giây)

*[Màn hình: Dashboard SpeakMate, đã đăng nhập sẵn]*

> "Đây là SpeakMate. Tôi sẽ demo một buổi luyện tập hoàn chỉnh — từ tạo bối cảnh đến nhận báo cáo."

---

### Bước 1: Tạo bối cảnh — The Brain sinh kịch bản (15 giây)

*[Bấm "Bắt đầu" ở chế độ Đối thoại → gõ vào ô mô tả: "Mình muốn luyện giới thiệu dự án AI cho một nhà đầu tư khó tính" → bấm Tạo bối cảnh]*

> "Tôi gõ mục tiêu — luyện pitch cho nhà đầu tư khó tính..."

*[Kịch bản hiện ra trong 1-2 giây: vai trò, tông giọng, mục tiêu hội thoại]*

> "Xong. Agent đầu tiên — The Brain — dùng Gemini 2.0 Flash phân tích yêu cầu và sinh bối cảnh hoàn chỉnh dưới dạng JSON. Mọi thứ đi qua Validation Gate, nên không bao giờ ra output lỗi."

*(Tech highlight: Gemini 2.0 Flash, Zod Validation Gate)*

---

### Bước 2: Xác nhận bối cảnh + vào phòng tập (5 giây)

*[Xem nhanh bối cảnh → bấm "Xác nhận bối cảnh"]*

> "Bối cảnh ổn. Vào luyện tập."

*[Chờ agent sẵn sàng ~2 giây, transcript "Agent ready" hiện lên]*

*(Tech highlight: LiveKit WebRTC — phòng tập kết nối qua WebRTC)*

---

### Bước 3: Luyện tập voice — 3 lượt hội thoại (50 giây)

**Lượt 1: AI mở đầu + User trả lời (~20 giây)**

*[AI bắt đầu nói: "Chào bạn, tôi là..." — transcript hiện realtime]*

> *(Presenter nói vào micro — trả lời bằng tiếng Việt, giới thiệu dự án)*

*[Transcript của presenter hiện lên gần như ngay lập tức]*

> *(Sau khi AI phản hồi)* "Các bạn thấy transcript hiện ngay — đó là PhoWhisper của VinAI chạy cục bộ trên GPU, dưới 1 giây."

*(Tech highlight: PhoWhisper STT, NeuTTS)*

**Lượt 2: BARGE-IN — điểm wow (~15 giây)**

*[AI đang nói giữa chừng — Presenter CỐ TÌNH nói chen vào]*

> *(Presenter ngắt lời AI)*

*[AI DỪNG ngay lập tức, lắng nghe presenter]*

> "Tôi vừa ngắt lời AI giữa câu. Nó dừng ngay — không phải chờ hết câu. Đó là Silero VAD phát hiện giọng nói tức thì và gửi tín hiệu ngắt. Giống hệt cuộc trò chuyện thật."

*(Tech highlight: Silero VAD barge-in, WebRTC realtime)*

**Lượt 3: AI hỏi ngược + User trả lời (~15 giây)**

*[AI hỏi câu hỏi khó — presenter trả lời]*

> *(Trả lời tự nhiên, không cần hoàn hảo — để Analyst có gì phân tích)*

*(Tech highlight: Gemma 4 local LLM duy trì ngữ cảnh)*

---

### Bước 4: Kết thúc → Báo cáo Analyst (30 giây)

*[Bấm "Hoàn thành" → chờ 3-5 giây → Báo cáo hiện ra]*

> "Kết thúc phiên. Agent thứ ba — The Analyst — đang phân tích toàn bộ transcript..."

*[Báo cáo hiện: điểm số, radar chart 5 chiều, danh sách điểm mạnh/điểm yếu]*

> "Biểu đồ radar 5 chiều — từ ngữ pháp, từ vựng, đến khả năng phản biện."

*[Scroll xuống phần trích dẫn]*

> "Và đây là phần thú vị nhất: nó trích dẫn CHÍNH XÁC câu tôi vừa nói — 'câu này bạn dùng từ chưa chính xác, thay bằng...' Không phải nhận xét chung chung. Bằng chứng thật, từ lời nói thật."

*(Tech highlight: Gemini 2.0 Pro — cross-check bằng transcript thật)*

---

### Bước 5: Flash qua Story Bank + Bridge to Reality (15 giây)

*[Chuyển nhanh sang tab Story Bank — đã có sẵn 2-3 stories]*

> "Đây là Story Bank — nơi bạn chuẩn bị 'chất liệu' trước khi luyện. AI giúp cấu trúc hóa trải nghiệm thô thành mẫu chuyện sẵn sàng dùng."

*[Chỉ vào Challenge card trên dashboard]*

> "Và đây — Bridge to Reality. Sau mỗi buổi tập, hệ thống giao nhiệm vụ NGOÀI ĐỜI THỰC. Ví dụ: 'Tuần này, hãy hỏi giảng viên một câu phản biện.' SpeakMate không giữ bạn trong app — nó đẩy bạn ra ngoài."

*(Tech highlight: Mentor Ni sinh challenge cá nhân hóa)*

---

### Kết demo (20 giây)

> "Tóm lại — ba Agent, ba vai trò: The Brain tạo bối cảnh, The Voice luyện tập realtime, The Analyst đánh giá bằng bằng chứng. Tất cả điều phối bởi Mentor Ni — người đồng hành AI luôn ở bên."

> "Toàn bộ Voice Pipeline chạy cục bộ trên GPU serverless — chỉ tốn tiền khi có học sinh thực sự luyện. Và dữ liệu? Audio tự hủy sau 1 giờ. Privacy First."

> "SpeakMate không phải phòng chat ảo. Nó là bệ phóng — từ luyện tập an toàn, đến thực chiến ngoài đời thực."

---

## D. Backup Plan

### 1. Nếu app bị lag / timeout:

- **Câu nói cover:** "Hệ thống đang khởi động GPU serverless — bình thường mất 2 giây, hôm nay internet hội trường hơi chậm."
- **Video backup:** Quay sẵn 1 video 2 phút demo hoàn chỉnh trên máy local, lưu trên điện thoại. Nếu bị lag > 10 giây, chuyển sang video: "Để tôi show đoạn đã quay sẵn với chất lượng tốt hơn."
- **Slide tĩnh:** Chuẩn bị 3 slide screenshot: (1) Kịch bản vừa tạo, (2) Màn hình luyện tập, (3) Báo cáo Analyst. Nói: "Đây là kết quả thực tế từ phiên luyện chiều nay."

### 2. Nếu AI phản hồi kém (hallucination, off-topic):

- **Xử lý:** Không hoảng. Nói: "Đây chính là lý do chúng tôi có Validation Gate — trong production, output sai sẽ bị reject và retry tự động."
- **Biến thành điểm demo:** "Các bạn vừa thấy AI có thể mắc lỗi. Nhưng The Analyst sẽ phát hiện — nó chấm dựa trên logic, không phải AI tự khen AI."
- **Nếu barge-in không hoạt động:** Skip bước này, nói: "Tính năng barge-in cho phép ngắt lời AI giữa chừng — giống cuộc trò chuyện thật. Hôm nay mình demo trên loa ngoài nên VAD nhạy hơn bình thường."

### 3. Nếu thiếu thời gian (phần trước kéo dài):

- **CẮT ĐƯỢC:**
  - Bước 5 (Story Bank + Bridge to Reality) → giảm thành 1 câu: "Ngoài phòng gym, còn Story Bank chuẩn bị chất liệu và Bridge to Reality giao nhiệm vụ ngoài đời."
  - Lượt 3 của hội thoại → chỉ demo 2 lượt là đủ
  
- **KHÔNG THỂ CẮT (bắt buộc phải có):**
  - Bước 1: Tạo bối cảnh (show The Brain hoạt động)
  - Bước 3 lượt 2: Barge-in (điểm wow duy nhất không thể nói suông)
  - Bước 4: Báo cáo Analyst (show trích dẫn — khác biệt cốt lõi)
  
- **Phiên bản rút gọn (~1 phút 30 giây):** Bước 1 (10s) → Bước 2 (3s) → 2 lượt thoại + barge-in (30s) → Analyst (25s) → Kết (15s)

---

## E. Checklist Trước Demo

```
□ App đã deploy và truy cập được từ browser trên máy demo
□ Account demo đã đăng nhập sẵn (không login trên sân khấu)
□ Modal worker đang chạy (check: modal app list)
□ LiveKit agent đã kết nối (test 1 phiên thử trước 15 phút)
□ Story Bank đã có sẵn 2-3 stories (không tạo mới trên sân khấu)
□ Dashboard có ít nhất 1 challenge card hiển thị
□ Internet ổn định — có hotspot điện thoại 4G backup
□ Micro laptop/headset đã test voice input trước 5 phút
□ Micro hội trường không gây interference với VAD (test barge-in)
□ Màn hình project/share đã setup, resolution đủ đọc text
□ Browser zoom đúng (125-150% để BGK đọc từ xa)
□ Tắt thông báo, notification trên máy demo
□ Video backup 2 phút đã sẵn sàng trên điện thoại / USB
□ 3 slide screenshot backup đã có trong deck
□ Tab browser đã mở sẵn đúng trang Dashboard (không gõ URL trên sân khấu)
□ Đã clear cache browser (tránh state cũ)
□ Kiểm tra GPU warmup — chạy 1 phiên dummy để model đã load
□ Presenter đã diễn tập script 2-3 lần, nắm thời gian mỗi bước
□ Cả 2 thành viên biết ai nói phần nào (Huy demo, Lâm hỗ trợ hoặc ngược lại)
□ Có plan B nếu 1 người bị mất giọng / mic hỏng
```

---

*Tổng thời gian ước tính: ~2 phút 20 giây (có buffer 10 giây cho chờ AI phản hồi)*
