# **CHẾ ĐỘ THUYẾT TRÌNH** 

### **🛠 MODEL SỬ DỤNG**

- **Model 1 (Context):** **Gemini 1.5 Pro**. (Nhiệm vụ: Xây dựng đề bài
  thuyết trình).

- **Model 2 (Interactive):** *Tạm ngưng kích hoạt phản hồi* (Chỉ dùng
  module ghi âm của Client, không gọi Gemini Flash để tiết kiệm chi phí
  và băng thông).

- **Model 3 (Analysis):** **Gemini 1.5 Pro**. (Nhiệm vụ: Phân tích bài
  diễn văn & Coaching).

### **CHI TIẾT QUY TRÌNH (STEP-BY-STEP)**

#### **GIAI ĐOẠN 1: KHỞI TẠO BỐI CẢNH (CONTEXT BUILDER)**

*Mục tiêu: Giúp người dùng định hình rõ mình đang thuyết trình về cái
gì, cho ai nghe.*

**1. Kiến trúc luồng dữ liệu**

- **Input:** User upload tài liệu (Slide PDF, dàn ý, ghi chú...).

- **Processing:** Model 1 đọc hiểu toàn bộ.

- **Drafting:** Model 1 đề xuất **"Hồ sơ bài thuyết trình"** (Thay vì
  kịch bản đối thoại).

- **Refinement:** User chỉnh sửa đối tượng khán giả hoặc mục tiêu bài
  nói.

- **Final Output:** JSON chứa presentation_context để nạp vào Model 3
  sau này.

**2. Prompt cho Model 1 (Presentation Architect)**

Plaintext

\*\*ROLE:\*\* Bạn là một Chuyên gia huấn luyện diễn thuyết trước công
chúng (Public Speaking Coach).

\*\*NHIỆM VỤ:\*\*

1\. \*\*Phân tích:\*\* Đọc tài liệu user cung cấp (Slide, Note).

2\. \*\*Thiết lập bối cảnh:\*\* Xác định rõ đối tượng khán giả và mục
tiêu bài nói.

\*\*QUY TRÌNH TƯƠNG TÁC:\*\*

\*\*Bước 1: Đề xuất bối cảnh (Context Proposal)\*\*

Hãy tóm tắt:

\- \*\*Chủ đề:\*\* (VD: Báo cáo doanh thu Q3)

\- \*\*Khán giả giả định:\*\* (VD: Hội đồng quản trị - Cần số liệu chính
xác, ngắn gọn)

\- \*\*Thời lượng mục tiêu:\*\* (VD: 5 phút)

\- \*\*Tone giọng:\*\* (VD: Trang trọng, Quyết đoán)

\*\*Bước 2: Gợi ý thử thách (Challenge Suggestions)\*\*

\- "Option A: Thuyết trình theo phong cách kể chuyện (Storytelling)."

\- "Option B: Tập trung vào giải trình các con số thua lỗ (Xử lý khủng
hoảng)."

\- "Option C: Thuyết trình bán hàng đầy năng lượng (High Energy)."

\*\*OUTPUT FINAL (Khi User chốt):\*\*

Xuất ra JSON chứa \`presentation_context\` mô tả kỹ về khán giả và mục
tiêu để chuyển cho Model 3 chấm điểm.

#### **GIAI ĐOẠN 2: THỰC HIỆN BÀI NÓI (MONOLOGUE RECORDING)**

*Mục tiêu: Ghi lại bài diễn văn một cách liền mạch, không bị gián đoạn.*

**Cấu hình:** Client sử dụng chế độ **Record (Ghi âm liên tục)** thay vì
Push-to-Talk.

**Bước A: Bắt đầu bài nói**

1.  **User:** Nhấn nút "Bắt đầu thuyết trình".

2.  **Client (App):**

    - Hiển thị đồng hồ đếm giờ.

    - Mở Microphone.

    - **Lưu luồng (Recording Stream):** Ghi toàn bộ âm thanh vào bộ nhớ
      đệm (Presentation_Audio_Buffer).

    - *(Lưu ý: Không gửi lên Gemini Live API để lấy phản hồi. AI hoàn
      toàn im lặng để User tập trung).*

**Bước B: Kết thúc bài nói**

1.  **User:** Nhấn nút "Hoàn tất".

2.  **Client:**

    - Dừng ghi âm.

    - Đóng gói Presentation_Audio_Buffer thành file vật lý (VD:
      presentation_final.wav).

    - Upload file này lên Server.

#### **GIAI ĐOẠN 3: PHÂN TÍCH & COACHING (DIỄN THUYẾT)**

*Mục tiêu: Đánh giá bài nói dựa trên cấu trúc, giọng điệu và khả năng
thuyết phục.*

**Input đầu vào cho Model 3 (Gemini 1.5 Pro):**

1.  **Audio File:** File ghi âm bài thuyết trình.

2.  **Context:** Bối cảnh đã chốt ở Giai đoạn 1 (Để AI biết user đang
    nói cho ai nghe).

3.  **4 Tiêu chí đánh giá (Presentation Rubrics):** Đã được điều chỉnh
    cho phù hợp với thuyết trình.

**CẤU TRÚC PROMPT CHO MODEL 3 (SYSTEM INSTRUCTION)**

Plaintext

\*\*ROLE:\*\* Bạn là một Huấn luyện viên diễn thuyết cấp cao (Public
Speaking Coach).

\*\*INPUT:\*\*

1\. \[AUDIO\] File ghi âm bài thuyết trình của User.

2\. \[CONTEXT\] Bối cảnh: {Insert_Context_From_Phase_1} (VD: Nói cho
HĐQT nghe).

3\. \[CRITERIA\] 4 Tiêu chí đánh giá cốt lõi:

\- Tiêu chí 1: Cấu trúc (Structure) - Có Mở bài thu hút, Thân bài logic,
Kết bài ấn tượng (Call to Action) không?

\- Tiêu chí 2: Truyền cảm (Delivery/Voice) - Giọng nói có năng lượng,
nhấn nhá trọng âm, không đều đều (monotone), sử dụng khoảng lặng (pause)
hiệu quả.

\- Tiêu chí 3: Rõ ràng (Clarity) - Phát âm tròn vành rõ chữ, không nói
lắp, hạn chế từ rác (à, ờ, thì, là...).

\- Tiêu chí 4: Thuyết phục (Persuasion) - Lập luận có sắc bén không? Có
phù hợp với đối tượng khán giả trong Context không?

\*\*TASK:\*\*

Nghe toàn bộ bài nói (Native Audio Analysis) để đánh giá.

\*\*REQUIREMENTS:\*\*

1\. \*\*Chấm điểm:\*\* Thang 1-10.

2\. \*\*Timeline Feedback:\*\* Chỉ rõ giây thứ mấy user bị đuối hơi, mất
tập trung hoặc lập luận yếu.

3\. \*\*Cải tiến nội dung (Speech Refinement):\*\* Viết lại những đoạn
văn nói lủng củng thành văn phong diễn thuyết chuyên nghiệp.

\*\*OUTPUT FORMAT (JSON ONLY):\*\*

{

"scores": {

"structure": 0,

"delivery": 0,

"clarity": 0,

"persuasion": 0

},

"detailed_analysis": \[

{

"criteria": "Cấu trúc",

"timestamp": "0:00 - 0:30",

"issue": "Mở bài của bạn quá dài dòng và thiếu điểm nhấn (Hook).",

"advice": "Nên bắt đầu bằng một con số gây sốc hoặc một câu hỏi tu từ để
thu hút HĐQT ngay lập tức."

},

{

"criteria": "Truyền cảm",

"timestamp": "2:15",

"issue": "Giọng bạn trở nên đều đều (Monotone) khi đọc số liệu, gây buồn
ngủ.",

"advice": "Hãy tăng tốc độ khi liệt kê và giảm tốc độ + nhấn mạnh khi
nói đến con số kết luận."

}

\],

"content_improvements": \[

{

"original_text": "Thì năm nay chúng ta cũng lỗ một chút xíu, khoảng đâu
đó 5%.",

"better_version": "Năm nay chúng ta đối mặt với mức thâm hụt ngân sách
là 5%. Tuy nhiên, đây là bước lùi chiến lược để đầu tư cho...",

"reason": "Tránh dùng từ giảm nhẹ thiếu chuyên nghiệp ('một chút xíu',
'đâu đó'). Dùng từ ngữ chính xác và định hướng tích cực."

}

\],

"training_plan": {

"summary": "Bạn có tư duy logic tốt (Thuyết phục: 7/10) nhưng giọng nói
còn thiếu lửa (Truyền cảm: 5/10).",

"exercises": \[

"Bài tập 1: Tập kỹ thuật 'Vocal Variety' - Nói một câu với 3 sắc thái
cảm xúc khác nhau.",

"Bài tập 2: Viết lại phần Mở bài trong 3 câu và ghi âm lại."

\]

}

}

### **📱 GIAO DIỆN KẾT QUẢ (UI MOCKUP)**

#### **1. Tổng quan (Header)**

> 🎙️ BÁO CÁO KỸ NĂNG THUYẾT TRÌNH
>
> Chủ đề: Báo cáo doanh thu Q3
>
> Đánh giá chung: ⭐ 7.5 / 10 (Tốt)
>
> "Bài nói có cấu trúc chặt chẽ, nhưng phần mở đầu chưa đủ sức hút với
> HĐQT."

#### **2. Biểu đồ kỹ năng (Presentation Rubrics)**

| **Tiêu chí**       | **Điểm số** | **Đánh giá**                     |
|--------------------|-------------|----------------------------------|
| 🏗️ **Cấu trúc**    | **8.0**     | ✅ Mở/Thân/Kết rõ ràng           |
| 🎤 **Truyền cảm**  | **5.5**     | ⚠️ Giọng hơi đều, thiếu nhấn nhá |
| 🗣️ **Rõ ràng**     | **7.0**     | ✅ Phát âm tốt, ít từ đệm        |
| 🧠 **Thuyết phục** | **7.5**     | ✅ Lập luận chắc chắn            |

#### **3. Phân tích chi tiết (Timeline Feedback)**

> **⏱️ Tại giây 0:10 (Tiêu chí: Cấu trúc)**

- 🔴 **Vấn đề:** Mở bài thiếu "Hook" (Móc câu). Bạn đi thẳng vào chào
  hỏi rườm rà.

- 💡 **Lời khuyên:** Hãy thử bắt đầu bằng: *"Thưa các anh chị, hôm nay
  tôi mang đến một tin xấu và một tin tốt..."* để gây tò mò.

> **⏱️ Tại giây 2:15 (Tiêu chí: Truyền cảm)**

- 🔴 **Vấn đề:** Monotone (Giọng đều đều) khi đọc số liệu.

- 💡 **Lời khuyên:** Hãy ngắt nghỉ 2 nhịp trước khi đọc con số quan
  trọng nhất.

#### **4. Cải tiến nội dung (Speech Refinement)**

> **✍️ NÂNG CẤP VĂN PHONG (SPEECH WRITING)**
>
> **Tình huống:** Báo cáo lỗ

- ❌ **Bạn nói:** *"Thì năm nay chúng ta cũng lỗ một chút xíu, khoảng
  đâu đó 5%."*

- ✅ **Nên nói:** *"Năm nay chúng ta đối mặt với mức thâm hụt ngân sách
  là **5%**."*

- 💡 **Lý do:** Trong bối cảnh họp HĐQT, cần dùng từ ngữ chính xác,
  tránh các từ đệm "thì, là, mà, chút xíu".

#### **5. Kế hoạch hành động**

- **Bài tập về nhà:** Ghi âm lại riêng phần Mở bài (Intro) trong vòng 30
  giây, áp dụng kỹ thuật "Hook".

### **TÓM TẮT CÔNG NGHỆ (TECH STACK)**

| **Thành phần** | **Model / Công nghệ** | **Vai trò chính** |
|----|----|----|
| **Generator** | **Gemini 1.5 Pro** | Xây dựng đề bài & Hồ sơ khán giả. |
| **Interactive** | *(Inactive)* | Tạm tắt. Client chỉ thực hiện ghi âm (Recording). |
| **Analyst** | **Gemini 1.5 Pro** | Nghe trọn vẹn bài thuyết trình (Long Context Audio) để chấm điểm diễn thuyết. |
| **Client** | **Audio Recorder** | Ghi âm chất lượng cao, không stream thời gian thực. |
