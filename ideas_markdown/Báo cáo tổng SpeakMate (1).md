**SPEAKMATE: TRỢ LÍ HỖ TRỢ HỌC SINH LUYỆN TẬP GIAO TIẾP**

## **<u>PHẦN A. KIẾN TRÚC VÀ CÔNG NGHỆ</u>**

SpeakMate được thiết kế là một **Coach sân khấu chuyên biệt (Ni)** cho
học sinh THPT Việt Nam. Kiến trúc hệ thống được nâng cấp sử dụng hệ sinh
thái Gemini để tối ưu hóa khả năng xử lý đa phương thức và tương tác
thời gian thực.

Hệ thống phân tách thành các module AI chuyên biệt theo chức năng:

**1. AI 1: AI Thiết lập & Phân tích (The Architect & The Judge)**

- **Model sử dụng:** **Gemini 1.5 Pro**.

- **Nhiệm vụ:** Xử lý tài liệu lớn, hiểu ngữ cảnh sâu và phân tích
  logic.

- **Chức năng Áp dụng:**

  1.  **Thiết lập Ngữ cảnh (Pha 1):** Đọc/Nghe dữ liệu hỗn hợp (Audio,
      PDF, Text) từ người dùng, tổng hợp thành "Hồ sơ bối cảnh", đề xuất
      kịch bản và tạo System Instruction cho AI 2.

  2.  **Phân tích & Đánh giá (Pha 3 & 4):** Nghe file ghi âm hoàn chỉnh
      (Native Audio Analysis), chấm điểm theo 4 rubric và đưa ra gợi ý
      cải thiện nội dung chi tiết.

**2. AI 2: AI Tương tác Real-time (The Voice)**

- **Model sử dụng:** **Gemini 1.5 Flash (qua Multimodal Live API)**.

- **Nhiệm vụ:** Duy trì phản xạ giao tiếp với độ trễ thấp và chi phí tối
  ưu.

- **Chức năng Áp dụng:**

  1.  **Mô phỏng (Pha 2 - Chế độ Giao tiếp):** Đóng vai nhân vật trong
      tình huống, phản hồi người dùng qua WebSocket.

  2.  *(Lưu ý: Ở Chế độ Thuyết trình, AI 2 tạm ngưng kích hoạt để người
      dùng ghi âm liền mạch).*

3\. Điểm Yếu và Rủi ro Chiến lược

Việc chuyển giao (Handoff) ngữ cảnh từ AI 1 (Pro) sang AI 2 (Flash) cần
đảm bảo tính nhất quán cao. Prompt được sinh ra bởi AI 1 phải đủ chi
tiết để AI 2 không bị "thoát vai" trong quá trình hội thoại thời gian
thực.

## **<u>PHẦN B. TÍNH NĂNG VÀ LUỒNG SỬ DỤNG</u>**

Luồng tương tác được điều chỉnh để tích hợp hai chế độ luyện tập riêng
biệt với cơ chế xử lý khác nhau.

### **1. Pha 1 (AI 1): Khởi tạo Bối cảnh (Context Builder)**

*Cập nhật: AI đọc hiểu dữ liệu đa phương thức để đề xuất kịch bản, mang
tính chất hợp tác (Co-creation).*

<table style="width:94%;">
<colgroup>
<col style="width: 11%" />
<col style="width: 54%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr>
<th><strong>Bước</strong></th>
<th><strong>Mô tả Chi tiết</strong></th>
<th><strong>Yêu cầu Công nghệ/Tính năng</strong></th>
</tr>
<tr>
<th><strong>Bước 1</strong></th>
<th>Người dùng bấm "Bắt đầu Tình huống Mới" và chọn chế độ:
<strong>Thuyết trình</strong> hoặc <strong>Đối thoại/Giao
tiếp</strong>.</th>
<th></th>
</tr>
<tr>
<th><strong>Bước 2</strong></th>
<th><strong>Nạp dữ liệu:</strong> Người dùng upload tài liệu (Slide,
PDF), file ghi âm mẫu hoặc nhập text yêu cầu.</th>
<th>Hỗ trợ Multimodal Input.</th>
</tr>
<tr>
<th><strong>Bước 3</strong></th>
<th><p><strong>AI 1 (Gemini 1.5 Pro)</strong> đọc/nghe toàn bộ dữ liệu
và <strong>Tổng hợp Bối cảnh</strong>:</p>
<p>- Giới thiệu vai trò, đối tượng khán giả/đối tác.</p>
<p>- Đề xuất 2-3 hướng kịch bản/thử thách khác nhau.</p></th>
<th>Model 1 xử lý tài liệu lớn.</th>
</tr>
<tr>
<th><strong>Bước 4</strong></th>
<th><strong>Lựa chọn &amp; Tinh chỉnh:</strong> Người dùng chọn một bối
cảnh hoặc yêu cầu chỉnh sửa (VD: "Làm khách hàng khó tính hơn"). AI cập
nhật lại bối cảnh theo ý người dùng.</th>
<th>Tương tác Chat Text thông thường.</th>
</tr>
<tr>
<th><strong>Bước 5</strong></th>
<th>Người dùng bấm "Bắt đầu Luyện tập" (Start).</th>
<th>Hệ thống chuyển dữ liệu (System Instruction) sang Pha 2.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### **2. Pha 2 (AI 2): Mô phỏng Tương tác (Simulation)**

*Cập nhật: Xóa bỏ giới hạn thời gian. Phân tách rõ hành vi của 2 chế
độ.*

**Quy định chung:**

- **Thời lượng:** **Không giới hạn** (Unlimited). Người dùng tự quyết
  định khi nào dừng.

- **Giao diện:** Hiển thị sóng âm (Waveform) trực quan.

**Chi tiết từng chế độ:**

<table style="width:94%;">
<colgroup>
<col style="width: 12%" />
<col style="width: 40%" />
<col style="width: 40%" />
</colgroup>
<thead>
<tr>
<th><strong>Đặc điểm</strong></th>
<th><strong>Chế độ Thuyết trình</strong></th>
<th><strong>Chế độ Đối thoại/Giao tiếp</strong></th>
</tr>
<tr>
<th><strong>Cơ chế AI</strong></th>
<th><strong>Silent Recording:</strong> AI không phản hồi âm thanh. Chỉ
ghi âm để người dùng tập trung trình bày mạch lạc.</th>
<th><strong>Real-time Interaction:</strong> AI 2 (Gemini Flash) phản hồi
tức thì, đóng vai đối tác hội thoại, tranh luận hoặc hỏi đáp.</th>
</tr>
<tr>
<th><strong>Nút chức năng</strong></th>
<th><p><strong>Nút "Ghi âm lại" (Restart):</strong></p>
<p>Xóa toàn bộ bài nói hiện tại để bắt đầu lại từ đầu (0:00). Dùng khi
người dùng cảm thấy bài nói hỏng hoàn toàn.</p></th>
<th><p><strong>Nút "Nói lại" (Redo):</strong></p>
<p>Hủy bỏ <strong>lượt nói gần nhất</strong> (câu vừa nói) để nói lại
câu đó. Dùng để sửa lỗi phản xạ tức thời.</p></th>
</tr>
<tr>
<th><strong>Kết thúc</strong></th>
<th>Người dùng bấm "Hoàn tất".</th>
<th>Người dùng bấm "Dừng cuộc gọi".</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### **3. Pha 3 (Hệ thống): Xử lý & Phân tích (AI Processing) - *MỚI BỔ SUNG***

*Giai đoạn chuyển tiếp, xử lý dữ liệu ngầm trước khi trả về kết quả.*

- **Chế độ Thuyết trình:**

  1.  Client đóng gói file âm thanh bài nói (presentation_full.wav).

  2.  Upload lên Server cùng với Context (đã chốt ở Pha 1).

  3.  **AI 1 (Gemini 1.5 Pro)** nghe toàn bộ file, phân tích cấu trúc
      (Mở/Thân/Kết) và phi ngôn ngữ (ngắt nghỉ, tone giọng).

- **Chế độ Đối thoại/Giao tiếp:**

  1.  Client đóng gói file âm thanh tổng hợp (session_audio.wav) và Log
      Transcript (chat_log.json).

  2.  Upload lên Server.

  3.  **AI 1 (Gemini 1.5 Pro)** map audio với transcript để đánh giá
      từng lượt thoại: Phản xạ đúng trọng tâm không? Thái độ tự tin
      không?

### **4. Pha 4 (AI 1): Kết quả & Đánh giá (Assessment)**

<table style="width:94%;">
<colgroup>
<col style="width: 25%" />
<col style="width: 42%" />
<col style="width: 26%" />
</colgroup>
<thead>
<tr>
<th><strong>Thành phần Đánh giá</strong></th>
<th><strong>Mô tả Chi tiết</strong></th>
<th><strong>Căn cứ</strong></th>
</tr>
<tr>
<th><strong>4 Rubric Cố định</strong></th>
<th>Chấm điểm theo thang 1-10: Rõ ràng, Tự tin, Hấp dẫn, Đúng thời
gian.</th>
<th>Prompt Model 3 (Gemini 1.5 Pro).</th>
</tr>
<tr>
<th><strong>Timeline Feedback</strong></th>
<th>Nhận xét chi tiết gắn liền với mốc thời gian (VD: "Tại 0:45 bạn nói
quá nhanh").</th>
<th>Phân tích Native Audio.</th>
</tr>
<tr>
<th><strong>Gợi ý Cải tiến Nội dung (Content Refinement)</strong></th>
<th><p><strong>(Thay thế tính năng "Viết lại cho gọn" cũ)</strong></p>
<p>AI tự động trích xuất các câu nói chưa tốt và <strong>đề xuất phiên
bản viết lại (Rewrite)</strong> hay hơn, chuyên nghiệp hơn tùy theo ngữ
cảnh (Thuyết trình hoặc Giao tiếp).</p></th>
<th>Logic "Content Improvement" trong Prompt Model 3.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### **5. Pha 5 (Vòng lặp Luyện tập)**

Bao gồm các nút hành động:

- "Tập lại Chính xác Tình huống này".

- "Luyện tập theo Gợi ý của Ni" (Bài tập nhỏ khắc phục lỗi vừa gặp).

- "Bắt đầu Chủ đề mới".

- *(Đã loại bỏ nút "Viết lại cho gọn" độc lập).*

## **<u>PHẦN C. ĐẶC TẢ GIAO DIỆN (UI/UX)</u>**

### **1. Màn hình Thiết lập (Pha 1)**

- **Input Area:** Khu vực kéo thả file (PDF, Audio) và ô nhập text lớn.

- **Scenario Cards:** Hiển thị các đề xuất bối cảnh của AI dưới dạng thẻ
  để người dùng chọn.

- **Chatbox:** Nơi người dùng trao đổi với Ni để tinh chỉnh bối cảnh
  trước khi chốt.

### **2. Màn hình Mô phỏng Tương tác (Pha 2)**

- **Chế độ Thuyết trình:**

  - Trung tâm: Đồng hồ đếm giờ + Sóng âm.

  - Nút chính: "Hoàn tất".

  - Nút phụ: **"Ghi âm lại" (Icon Refresh)** - Có cảnh báo "Hành động
    này sẽ xóa bài nói hiện tại".

- **Chế độ Đối thoại:**

  - Trung tâm: Icon Micro (Trạng thái User nói/AI nói).

  - Nút chính: "Dừng cuộc gọi".

  - Nút phụ: **"Nói lại" (Icon Undo)** - Chỉ sáng lên sau khi User vừa
    dứt lời.

### **3. Màn hình Chờ Xử lý (Pha 3) - *CẬP NHẬT MỚI***

- **Trạng thái:** Hiển thị dòng chữ: **“Ni đang phân tích và đánh
  giá...”**.

- **Loading:** Thanh Progress Bar chạy mượt mà hoặc vòng tròn loading ở
  mỗi đoạn chờ.

- **Visual:** Có thể hiển thị các tip ngắn về giao tiếp trong lúc chờ
  đợi.

### **4. Màn hình Kết quả (Pha 4)**

- **Khu vực Điểm số:** Hiển thị 4 Rubric.

- **Khu vực "Cải tiến Nội dung":** Giao diện so sánh trực quan:

  - ❌ **Bạn nói:** "Thì năm nay lỗ chút xíu..."

  - ✅ **Ni gợi ý:** "Năm nay chúng ta đối mặt mức thâm hụt..."

  - 💡 **Lý do:** Giải thích ngắn gọn tại sao nên sửa như vậy.

## **<u>PHẦN D. PHƯƠNG HƯỚNG PHÁT TRIỂN TRONG TƯƠNG LAI (ROADMAP)</u>**

Chúng tôi sẽ tập trung mở rộng khả năng Coaching Sân khấu bằng cách tích
hợp phân tích kỹ năng phi ngôn ngữ, chuyển đổi SpeakMate thành nền tảng
Video Agent.

**1. Tính năng Phân tích Video (Non-verbal Analysis)**

- **Mục tiêu:** Bật camera trong Pha 2 để phân tích phong thái, ánh mắt,
  và cử chỉ tay.

- **Mở rộng:**

  - *Ánh mắt (Eye Contact):* Tỷ lệ nhìn vào camera/khán giả.

  - *Cử chỉ tay (Gestures):* Tần suất và độ mở của tay.

  - *Phong thái (Demeanor):* Biểu cảm khuôn mặt.

- **Công nghệ:** Tích hợp module Vision của Gemini 1.5 Pro.

**2. Tăng cường Quản lý Lớp học**

- Tiếp tục phát triển tính năng Giám sát cho giáo viên để truy cập lịch
  sử luyện tập và báo cáo tiến bộ của học sinh.
