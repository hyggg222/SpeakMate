**Model sử dụng:**

- **Model 1 (Context):** Gemini 1.5 Pro (Xử lý tài liệu lớn).

- **Model 2 (Interactive):** Gemini 1.5 Flash (qua Multimodal Live API).

- **Model 3 (Analysis):** Gemini 1.5 Pro (Nghe native audio & Logic).

### **CHI TIẾT QUY TRÌNH (STEP-BY-STEP)**

#### **GIAI ĐOẠN 1: KHỞI TẠO & HUẤN LUYỆN (PRE-PROCESSING)**

### **1. Kiến trúc luồng dữ liệu (Scenario Builder Workflow)**

Khác với các bước trước, bước này mang tính chất **Hợp tác
(Co-creation)** giữa Người dùng và AI.

1.  **Input:** User upload "một đống" dữ liệu hỗn độn (File ghi âm mẫu,
    PDF tài liệu sản phẩm, Note text yêu cầu...).

2.  **Processing:** Model 1 đọc/nghe tất cả.

3.  **Drafting:** Model 1 tóm tắt và đề xuất 2-3 kịch bản (Scenario) khả
    thi.

4.  **Refinement (Vòng lặp chỉnh sửa):**

    - User chọn 1 kịch bản.

    - User yêu cầu sửa (VD: "Làm khó hơn chút").

    - AI gợi ý thêm (VD: "Dựa trên tài liệu, tôi thấy khách hay hỏi về
      giá, có nên thêm yếu tố khách chê đắt không?").

5.  **Final Output:** Khi user chốt, Model 1 xuất ra đoạn
    system_instruction chuẩn để nạp vào Model 2.

### **2. Prompt cho Model 1 (Scenario Architect)**

Đây là "bộ não" để Model 1 biết cách đọc dữ liệu và tư vấn cho người
dùng.

<span class="mark">\*\*ROLE:\*\* Bạn là một Chuyên gia thiết kế kịch bản
đào tạo (Scenario Architect).  
\*\*NHIỆM VỤ:\*\*  
1. \*\*Phân tích dữ liệu:\*\* Đọc/Nghe tất cả các file đính kèm (PDF,
Audio, Text) để hiểu sản phẩm, khách hàng mục tiêu và phong cách giao
tiếp.  
2. \*\*Tổng hợp bối cảnh:\*\* Tạo ra một bản tóm tắt kịch bản nhập vai
(Roleplay Scenario) dễ hiểu cho người dùng.  
3. \*\*Tư vấn & Gợi ý:\*\* Chủ động đề xuất các tình huống thú vị hoặc
thử thách dựa trên dữ liệu.  
  
\*\*QUY TRÌNH TƯƠNG TÁC:\*\*  
\*\*Bước 1: Giới thiệu bối cảnh (Scenario Proposal)\*\*  
Dựa trên dữ liệu, hãy tóm tắt ngắn gọn:  
- \*\*Vai trò của User:\*\* (VD: Nhân viên Sales BĐS)  
- \*\*Đối tượng User sẽ gặp (AI đóng vai):\*\* (VD: Khách hàng đầu tư
khó tính tên Hùng)  
- \*\*Mục tiêu:\*\* (VD: Thuyết phục khách chốt cọc)  
- \*\*Độ khó đề xuất:\*\* (Dễ/Trung bình/Khó)  
\*\*Bước 2: Gợi ý chỉnh sửa (Smart Suggestions)\*\*  
Luôn đưa ra 3 gợi ý để người dùng chọn nhanh, ví dụ:  
- "Option A: Thêm tình huống khách hàng so sánh giá với đối thủ."  
- "Option B: Tăng độ khó, khách hàng sẽ liên tục ngắt lời."  
- "Option C: Tập trung vào xử lý từ chối về tính năng."  
\*\*OUTPUT FORMAT (Khi giao tiếp với User):\*\*  
Hãy dùng ngôn ngữ tự nhiên, thân thiện.  
\*\*OUTPUT FINAL (Khi User chốt - Quan trọng):\*\*</span>  
  
Nếu User nói "Bắt đầu" hoặc "Chốt", hãy xuất ra định dạng JSON chứa
\`system_instruction\` để hệ thống nạp vào AI tiếp theo.  
  
**3. Ví dụ Minh họa Trải nghiệm Người dùng (UX)  **
Đây là những gì người dùng sẽ thấy trên màn hình:  
  
**Giai đoạn 1: Nạp dữ liệu  **
*User upload 1 file PDF "Chính sách bán hàng" và 1 file ghi âm "Cuộc gọi
mẫu".  *
**User:** "Dựa trên mấy cái này, tạo cho tôi bối cảnh luyện tập nhé."  
  
**Giai đoạn 2: AI phân tích & Giới thiệu (Model 1)**

> AI (Model 1):
>
> "Đã rõ. Dựa trên file ghi âm và tài liệu anh gửi, tôi hiểu anh đang
> muốn luyện tập bán gói Premium cho khách hàng doanh nghiệp.
>
> Tôi đề xuất kịch bản như sau:

- **Bối cảnh:** Cuộc gọi lạnh (Cold Call) tới Giám đốc Marketing.

- **Nhân vật AI:** Tên Tuấn, 40 tuổi, đang bận rộn và hơi khó chịu vì bị
  làm phiền.

- **Mục tiêu của anh:** Xin được một cuộc hẹn Demo trong vòng 3 phút.

> Anh có muốn giữ kịch bản này không? Hay anh muốn thử:

1.  💡 *Gợi ý:* Chuyển sang tình huống khách hàng đã quan tâm nhưng chê
    giá đắt?

2.  💡 *Gợi ý:* Thêm yếu tố khách hàng hỏi vặn vẹo về thông số kỹ thuật
    (dựa trên trang 5 file PDF)?"

**Giai đoạn 3: Chỉnh sửa & Tinh chỉnh**

> **User:** "Chọn kịch bản đầu tiên đi, nhưng cho ông Tuấn này dễ tính
> hơn một chút, và cho ông ấy hỏi nhiều về chế độ bảo hành."
>
> AI (Model 1):  
>   
> "Ok, tôi đã điều chỉnh: Ông Tuấn sẽ cởi mở hơn, nhưng sẽ soi kỹ về
> Chương 3 (Bảo hành) trong tài liệu anh gửi.
>
> Anh đã sẵn sàng bắt đầu chưa?"

**Giai đoạn 4: Chốt (Start)**

> **User:** "Bắt đầu đi."
>
> *(Lúc này Model 1 âm thầm xuất ra đoạn code lệnh để khởi động Model 2,
> User không nhìn thấy đoạn này, chỉ thấy màn hình chuyển sang giao diện
> gọi điện).*

### **4. Xử lý kỹ thuật (Technical Handling)**

Làm sao để nối Model 1 (Kiến trúc sư) sang Model 2 (Diễn viên)?

- **Trạng thái "Draft Mode":** Khi người dùng đang chat với Model 1 để
  sửa kịch bản, đây là chat text bình thường.

- **Trạng thái "Handover":** Khi Model 1 phát hiện ý định chốt (qua từ
  khóa hoặc nút bấm "Start Simulation"), nó sẽ generate ra một JSON đặc
  biệt.

**Ví dụ JSON Output từ Model 1:**

{  
"action": "START_SIMULATION",  
"system_instruction_for_model_2": "Bạn là Tuấn, 40 tuổi, Giám đốc
Marketing. Tính cách: Cởi mở nhưng kỹ tính. Bạn đang quan tâm sản phẩm
nhưng đặc biệt chú ý đến chế độ bảo hành (Chương 3 trong tài liệu). Nếu
người dùng giải thích sai về bảo hành 24 tháng, hãy bắt bẻ ngay. Mục
tiêu của bạn là xem người dùng có trung thực không...",  
"session_settings": {  
"difficulty": "Medium",  
"duration_limit": "5 minutes"  
}  
}

- **Hệ thống (Backend):** Bắt lấy JSON này \$\rightarrow\$ Lấy chuỗi
  system_instruction_for_model_2 \$\rightarrow\$ Nạp vào cấu hình của
  **Gemini Live API** \$\rightarrow\$ Kích hoạt cuộc gọi.

#### **GIAI ĐOẠN 2: HỘI THOẠI THỜI GIAN THỰC (INTERACTION LOOP)**

*Mục tiêu: Tốc độ nhanh nhất, lưu trữ đầy đủ nhất.*

**Cấu hình:** Client sử dụng **Push-to-Talk (PTT)**.

**Bước A: Khi người dùng Nhấn nút & Nói**

1.  **Client (App):** Mở Microphone.

2.  **Tách luồng (Split Stream):** Audio từ mic được chia làm 2 nhánh
    song song:

    - **Nhánh 1 (Gửi đi):** Stream chunks qua WebSocket tới **Gemini
      Multimodal Live API (Model 2 - Flash)**.

    - **Nhánh 2 (Lưu lại):** Ghi (Append) các chunks vào biến nhớ tạm
      User_Audio_Buffer.

**Bước B: Khi Server phản hồi (Model 2 - Gemini 1.5 Flash)**

1.  **Gemini Server:**

    - Nhận Audio -\> Hiểu ngữ cảnh -\> Sinh phản hồi.

    - Trả về gói tin chứa: Audio (để phát) + Text (metadata).

2.  **Client (App):**

    - **Phát loa:** Phát ngay lập tức stream Audio nhận được (Low
      Latency).

    - **Lưu Log:** Lưu Text vào biến Session_Transcript (VD: {"role":
      "model", "text": "Dạ em nghe..."}).

    - *(Tùy chọn)*: Lưu Audio phản hồi vào AI_Audio_Buffer (nếu cần phân
      tích giọng AI).

**Bước C: Khi người dùng Thả nút (Kết thúc lượt nói)**

1.  **Client:**

    - Đóng gói User_Audio_Buffer thành file vật lý (VD:
      turn_1_user.wav).

    - Tạm thời lưu file này ở Local hoặc upload nền (background upload)
      lên Cloud Storage.

### **GIAI ĐOẠN 3: PHÂN TÍCH & COACHING NGƯỜI DÙNG**

**Mục tiêu:** Model 3 đóng vai trò là "Huấn luyện viên cá nhân" (Coach).
Nó nghe giọng, hiểu nội dung và đưa ra bài tập cải thiện cụ thể cho
người dùng.

**Input đầu vào cho Model 3 (Gemini 1.5 Pro):**

1.  **User Audio File:** File .wav tổng hợp giọng nói của người dùng
    (quan trọng nhất để bắt ngữ điệu, sự tự tin).

2.  **Transcript Ngữ cảnh:** Toàn bộ log text (AI hỏi gì - User trả lời
    gì) để Model 3 hiểu user có trả lời đúng trọng tâm không.

3.  **4 Tiêu chí đánh giá (Criteria):** (Ví dụ: Sự tự tin, Nội dung
    logic, Ngữ pháp/Từ vựng, Tốc độ nói).

### **CẤU TRÚC PROMPT CHO MODEL 3 (SYSTEM INSTRUCTION) - Mẫu**

Bạn sẽ gửi kèm prompt này cùng với file Audio và Transcript lên Gemini
1.5 Pro.

<span class="mark">\*\*ROLE:\*\* Bạn là một Huấn luyện viên giao tiếp
chuyên nghiệp (Communication Coach) với khả năng phân tích tâm lý và
ngôn ngữ sắc bén.</span>

<span class="mark">\*\*INPUT:\*\*</span>

<span class="mark">1. \[AUDIO\] File ghi âm giọng nói của học viên
(User).</span>

<span class="mark">2. \[TRANSCRIPT\] Nội dung text cuộc hội thoại giữa
AI (đối tác) và User.</span>

<span class="mark">3. \[CRITERIA\] 4 Tiêu chí đánh giá cốt lõi
(Rubrics):</span>

<span class="mark">- Tiêu chí 1: Rõ ràng (Clarity) - Phát âm chuẩn, diễn
đạt mạch lạc, dễ hiểu, không dùng từ tối nghĩa.</span>

<span class="mark">- Tiêu chí 2: Tự tin (Confidence) - Giọng nói chắc
chắn, không run, hạn chế từ đệm (à, ờ, ừm), kiểm soát tốt khoảng
lặng.</span>

<span class="mark">- Tiêu chí 3: Hấp dẫn (Engagement) - Ngữ điệu
(intonation) lên xuống thu hút, có cảm xúc, dùng từ vựng đắt giá, không
nói giọng đều đều (monotone).</span>

<span class="mark">- Tiêu chí 4: Đúng thời gian (Timing) - Tốc độ nói
vừa phải (không quá nhanh/chậm), trả lời súc tích, đi thẳng vào vấn đề,
không lan man dài dòng.</span>

<span class="mark">\*\*TASK:\*\*</span>

<span class="mark">Hãy nghe kỹ file âm thanh (để bắt ngữ điệu) và đọc
transcript (để bắt nội dung), sau đó phân tích màn thể hiện của
User.</span>

<span class="mark">\*\*REQUIREMENTS (YÊU CẦU ĐẦU RA):\*\*</span>

<span class="mark">1. \*\*Chấm điểm:\*\* Thang 1-10 cho từng tiêu chí
trên.</span>

<span class="mark">2. \*\*Nhận xét chi tiết:\*\* Chỉ ra điểm mạnh/yếu cụ
thể dựa trên timestamp (giây thứ mấy).</span>

<span class="mark">3. \*\*Cải tiến nội dung (Content Refinement):\*\*
Hãy tìm những câu User nói chưa hay, chưa gãy gọn và \*\*VIẾT LẠI
(Rewrite)\*\* câu đó thành một phiên bản chuyên nghiệp hơn, hay
hơn.</span>

<span class="mark">4. \*\*Bài tập:\*\* Đưa ra phương pháp luyện tập cụ
thể.</span>

<span class="mark">\*\*OUTPUT FORMAT (JSON ONLY - Không thêm bất kỳ text
nào ngoài JSON):\*\*</span>

<span class="mark">{</span>

<span class="mark">"scores": {</span>

<span class="mark">"clarity": 0,</span>

<span class="mark">"confidence": 0,</span>

<span class="mark">"engagement": 0,</span>

<span class="mark">"timing": 0</span>

<span class="mark">},</span>

<span class="mark">"detailed_analysis": \[</span>

<span class="mark">{</span>

<span class="mark">"criteria": "Tự tin",</span>

<span class="mark">"timestamp": "0:15",</span>

<span class="mark">"issue": "Giọng bạn bị run và nhỏ dần ở cuối câu khi
nhắc đến giá cả.",</span>

<span class="mark">"advice": "Hãy giữ cột hơi ổn định, nói to hơn ở các
từ khóa quan trọng."</span>

<span class="mark">},</span>

<span class="mark">{</span>

<span class="mark">"criteria": "Đúng thời gian",</span>

<span class="mark">"timestamp": "0:45",</span>

<span class="mark">"issue": "Bạn giải thích vòng vo mất 30 giây cho một
ý chỉ cần 5 giây.",</span>

<span class="mark">"advice": "Nên đi thẳng vào kết luận trước, sau đó
mới diễn giải."</span>

<span class="mark">}</span>

<span class="mark">\],</span>

<span class="mark">"content_improvements": \[</span>

<span class="mark">{</span>

<span class="mark">"original_text": "Cái này thì... nói chung là nó cũng
giúp ích được cho công việc của anh á.",</span>

<span class="mark">"better_version": "Giải pháp này sẽ tối ưu hóa trực
tiếp hiệu suất làm việc của anh.",</span>

<span class="mark">"reason": "Bỏ các từ thừa ('cái này thì', 'nói chung
là'), dùng từ vựng mạnh hơn ('tối ưu hóa', 'hiệu suất')."</span>

<span class="mark">},</span>

<span class="mark">{</span>

<span class="mark">"original_text": "Em nghĩ là giá nó cũng không đắt
đâu.",</span>

<span class="mark">"better_version": "Mức giá này hoàn toàn cạnh tranh
so với những giá trị mà anh nhận được.",</span>

<span class="mark">"reason": "Thay vì dùng phủ định ('không đắt'), hãy
dùng khẳng định mang tính giá trị ('cạnh tranh', 'giá trị')."</span>

<span class="mark">}</span>

<span class="mark">\],</span>

<span class="mark">"training_plan": {</span>

<span class="mark">"summary": "Bạn có chất giọng tốt (Hấp dẫn: 8/10)
nhưng cách diễn đạt còn rườm rà (Rõ ràng: 5/10).",</span>

<span class="mark">"exercises": \[</span>

<span class="mark">"Bài tập 1: Luyện đọc to các câu mẫu trong phần 'Cải
tiến nội dung' 5 lần.",</span>

<span class="mark">"Bài tập 2: Tập trả lời câu hỏi 'Sản phẩm này là gì'
gói gọn trong đúng 10 giây."</span>

<span class="mark">\]</span>

<span class="mark">}</span>

<span class="mark">}</span>

### **QUY TRÌNH KỸ THUẬT (WORKFLOW)**

1.  **Kết thúc Session:**

    - Client upload file user_audio.wav và chat_log.json lên server.

2.  **Gọi Model 3 (Gemini 1.5 Pro):**

    - Server gọi API: models/gemini-1.5-pro:generateContent.

    - Body bao gồm: System Instruction (ở trên) + user_audio.wav (dạng
      Blob/URI) + chat_log.

3.  **Nhận kết quả (JSON):**

    - Server nhận chuỗi JSON từ Gemini.

    - Client hiển thị lên màn hình giao diện "Kết quả luyện tập" (Report
      Card).

### 

### **📱 GIAO DIỆN KẾT QUẢ (UI MOCKUP)**

#### **1. Tổng quan (Header)**

# **🎯 BÁO CÁO KẾT QUẢ COACHING**

> Đánh giá chung: ⭐ 6.0 / 10 (Khá)
>
> "Bạn có chất giọng Hấp dẫn, nhưng cần cải thiện sự Rõ ràng và Tốc độ
> nói."

#### **2. Biểu đồ kỹ năng (4 Rubrics)**

<table style="width:90%;">
<colgroup>
<col style="width: 30%" />
<col style="width: 24%" />
<col style="width: 34%" />
</colgroup>
<thead>
<tr>
<th><blockquote>
<p><strong>Tiêu chí</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>Điểm số</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>Đánh giá</strong></p>
</blockquote></th>
</tr>
<tr>
<th><blockquote>
<p>🗣️ <strong>Rõ ràng</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>5.0</strong></p>
</blockquote></th>
<th><blockquote>
<p>⚠️ Cần diễn đạt gãy gọn hơn</p>
</blockquote></th>
</tr>
<tr>
<th><blockquote>
<p>💪 <strong>Tự tin</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>7.0</strong></p>
</blockquote></th>
<th><blockquote>
<p>✅ Tốt, giọng chắc chắn</p>
</blockquote></th>
</tr>
<tr>
<th><blockquote>
<p>✨ <strong>Hấp dẫn</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>8.0</strong></p>
</blockquote></th>
<th><blockquote>
<p>🔥 Tuyệt vời, có cảm xúc</p>
</blockquote></th>
</tr>
<tr>
<th><blockquote>
<p>⏱️ <strong>Đúng thời gian</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>4.0</strong></p>
</blockquote></th>
<th><blockquote>
<p>⚠️ Nói quá dài dòng</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

#### **3. Phân tích chi tiết (Timeline Feedback)**

> **⏱️ Tại giây 0:15 (Tiêu chí: Tự tin)**

- 🔴 **Vấn đề:** Giọng bạn bị nhỏ dần và run khi nhắc đến giá tiền.

- 💡 **Lời khuyên:** Hãy giữ cột hơi ổn định. Khi nói giá, cần nói to và
  rõ hơn các phần khác để thể hiện sự chắc chắn.

> **⏱️ Tại giây 0:45 (Tiêu chí: Đúng thời gian)**

- 🔴 **Vấn đề:** Bạn mất 30 giây chỉ để giải thích một ý đơn giản.

- 💡 **Lời khuyên:** Đi thẳng vào kết luận trước, sau đó mới diễn giải.

#### **4. Cải tiến nội dung (Content Refinement) - Quan trọng nhất**

Phần này giúp người dùng học cách "nói sang hơn".

> **✍️ SỬA LỖI CÂU TỪ (RE-PHRASING)**
>
> **Tình huống 1:** Khi giới thiệu sản phẩm

- ❌ **Bạn nói:** "Cái này thì... nói chung là nó cũng giúp ích được
  nhiều cho công việc của anh á."

- ✅ **Nên nói:** "Giải pháp này sẽ **tối ưu hóa trực tiếp hiệu suất**
  làm việc của anh."

- 💡 **Tại sao:** Bỏ các từ thừa ("cái này thì", "nói chung là"), dùng
  từ vựng mạnh ("tối ưu hóa").

> **Tình huống 2:** Khi xử lý từ chối về giá

- ❌ **Bạn nói:** "Dạ em nghĩ là giá nó cũng không đắt đâu anh."

- ✅ **Nên nói:** "Mức giá này hoàn toàn **cạnh tranh** so với những
  **giá trị thực tế** mà anh nhận được."

- 💡 **Tại sao:** Thay vì phủ định ("không đắt"), hãy khẳng định giá trị
  ("cạnh tranh").

#### **5. Kế hoạch hành động (Training Plan)**

> **🛠️ BÀI TẬP VỀ NHÀ**

1.  **Luyện tập trung:** Đứng trước gương, tập nói lại câu "Mức giá này
    hoàn toàn cạnh tranh..." 5 lần với nụ cười tự tin.

2.  **Thử thách 10s:** Hãy thử ghi âm lại phần giới thiệu sản phẩm,
    nhưng ép buộc bản thân chỉ được nói trong đúng 10 giây (hiện tại bạn
    đang nói 30 giây).

### **TÓM TẮT CÔNG NGHỆ (TECH STACK)**

| **Thành phần** | **Model / Công nghệ** | **Vai trò chính** |
|----|----|----|
| **Generator** | **Gemini 1.5 Pro** | "Bộ não chiến lược": Đọc hiểu khối lượng lớn tài liệu để ra lệnh. |
| **Interactive** | **Gemini 1.5 Flash** (Live API) | "Bộ não phản xạ": Tốc độ cao, giao tiếp qua WebSocket, chi phí thấp. |
| **Analyst** | **Gemini 1.5 Pro** | "Bộ não thẩm định": Nghe native audio, phân tích tâm lý sâu sắc. |
| **Client** | **Custom Logic** | Tách luồng Audio (1 đi Stream, 1 đi Save). Không dùng STT display. |
