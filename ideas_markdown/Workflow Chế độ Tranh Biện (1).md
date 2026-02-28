### **🛠 MODEL SỬ DỤNG**

- **Model 1 (Moderator - Trọng tài/MC):** **Gemini 2.5 Flash**. (Nhiệm
  vụ: Thiết lập luật chơi, chọn phe, tạo đề bài).

- **Model 2 (Opponent - Đối thủ):** **Gemini 2.5 Flash** (qua Multimodal
  Live API).

  - *Lý do:* Cần tốc độ phản hồi cực nhanh để "chặn họng" hoặc phản bác
    (Rebuttal) ngay lập tức, đồng thời tư duy logic sắc bén hơn bản 1.5.

- **Model 3 (Judge - Giám khảo):** **Gemini 2.5 Flash**. (Nhiệm vụ: Phân
  tích lỗi ngụy biện (Logical Fallacies) và chấm điểm thắng thua).

### **CHI TIẾT QUY TRÌNH (STEP-BY-STEP)**

#### **GIAI ĐOẠN 1: THIẾT LẬP SÀN ĐẤU (THE ARENA SETUP)**

*Mục tiêu: Xác định "Kiến nghị" (Motion) và chia phe (Pro/Con).*

**1. Kiến trúc luồng dữ liệu**

- **Input:** User chọn chủ đề (VD: "AI thay thế con người") hoặc upload
  tài liệu nền tảng.

- **Processing:** Model 1 phân tích.

- **Drafting:** Model 1 đưa ra **Luật tranh biện** (VD: Luật Karl Popper
  hoặc British Parliamentary rút gọn).

- **Assignment:** User chọn phe (Ủng hộ hoặc Phản đối). AI sẽ nhận phe
  còn lại.

- **Final Output:** JSON chứa debate_system_instruction cực kỳ chi tiết
  để nạp vào Model 2.

**2. Prompt cho Model 1 (Moderator)**

Plaintext

\*\*ROLE:\*\* Bạn là Chủ tọa phiên tòa tranh biện (Debate Moderator).

\*\*NHIỆM VỤ:\*\*

1\. \*\*Xác định Kiến nghị (Motion):\*\* Dựa trên input của user, chốt
lại 1 câu khẳng định gây tranh cãi. (VD: "Chúng tôi tin rằng Bằng đại
học đã lỗi thời").

2\. \*\*Chia phe:\*\* User chọn phe nào -\> Bạn chỉ định AI phe ngược
lại.

\*\*QUY TRÌNH:\*\*

\- Hỏi User muốn phe Ủng hộ (Proposition) hay Phản đối (Opposition).

\- Thiết lập luật: Mỗi bên có 3 lượt nói (Mở đầu, Tranh luận, Tổng kết).
Mỗi lượt tối đa 2 phút.

\*\*OUTPUT FINAL (JSON):\*\*

Xuất ra \`system_instruction\` cho Model 2, trong đó quy định rõ Model 2
phải sử dụng cấu trúc ARE (Assertion - Reasoning - Evidence) và giọng
điệu gay gắt, phản biện trực diện.

#### **GIAI ĐOẠN 2: TRANH BIỆN THỜI GIAN THỰC (THE BATTLE LOOP)**

*Mục tiêu: Đối đầu trực diện. AI phải nói chuyện có cấu trúc, không chat
nhảm.*

**Cấu hình:** **Gemini 2.5 Flash** qua WebSocket.

Prompt (System Instruction) nạp vào Model 2 (Opponent):

Đây là phần quan trọng nhất để AI không nói chuyện kiểu "Hoa hậu thân
thiện" mà phải là "Chiến thần debate".

Plaintext

\*\*ROLE:\*\* Bạn là một Tranh biện viên chuyên nghiệp (Pro Debater).
Bạn đang ở phe {OPPOSITE_SIDE}.

\*\*OPPONENT:\*\* Đối thủ của bạn là User (phe {USER_SIDE}).

\*\*MOTION:\*\* "{DEBATE_TOPIC}"

\*\*NGUYÊN TẮC CỐT LÕI (CORE RULES):\*\*

1\. \*\*Không đồng tình:\*\* Tuyệt đối không khen ngợi hay đồng ý với
User (trừ khi đó là chiến thuật nhượng bộ giả).

2\. \*\*Tấn công trực diện:\*\* Ngay khi nhận audio từ User, hãy tìm lỗ
hổng logic (fallacy) để bẻ gãy ngay.

3\. \*\*Cấu trúc nói (BẮT BUỘC):\*\* Mọi câu trả lời của bạn phải tuân
theo cấu trúc 3 phần sau:

\- \*\*Phần 1 - Rebuttal (Bẻ gãy):\*\* "Bạn vừa nói rằng \[Luận điểm
User\], nhưng điều đó sai lầm vì..."

\- \*\*Phần 2 - Argument (Luận điểm mới):\*\* "Luận điểm chính của tôi
là..." (Dùng mô hình A.R.E: Khẳng định - Lý lẽ - Dẫn chứng).

\- \*\*Phần 3 - Impact (Tác động):\*\* "Vì vậy, kế hoạch của bạn sẽ dẫn
đến hậu quả..."

\*\*TONE & VOICE:\*\*

\- Sắc sảo, quyết đoán, tốc độ nhanh.

\- Dùng các từ nối mạnh: "Ngược lại", "Hơn thế nữa", "Điểm mấu chốt là",
"Đó là một sự ngụy biện".

\*\*CONTEXT:\*\*

Nếu User im lặng hoặc lập luận yếu, hãy tấn công dồn dập vào điểm yếu
đó.

**Quy trình tương tác:**

1.  **User nói:** Stream Audio -\> Model 2.

2.  **Model 2 xử lý (Gemini 2.5 Flash):**

    - Nghe hiểu luận điểm.

    - Tra cứu nhanh kiến thức (nhờ tốc độ Flash).

    - Phản hồi lại bằng Audio với cấu trúc 3 phần trên.

3.  **Lặp lại:** Cho đến khi hết số lượt quy định.

#### **GIAI ĐOẠN 3: PHÁN QUYẾT & PHÂN TÍCH (THE VERDICT)**

*Mục tiêu: Chấm điểm thắng thua dựa trên Logic, không dựa trên cảm xúc.*

**Input đầu vào cho Model 3 (Gemini 2.5 Flash):**

1.  **Full Audio/Transcript:** Toàn bộ cuộc đấu khẩu.

2.  **Role:** Phe nào là Ủng hộ, phe nào là Phản đối.

3.  **4 Tiêu chí Tranh biện (Debate Rubrics):**

**CẤU TRÚC PROMPT CHO MODEL 3 (JUDGE)**

Plaintext

\*\*ROLE:\*\* Bạn là Giám khảo Tranh biện Quốc tế (WSDC Judge).

\*\*INPUT:\*\*

1\. \[TRANSCRIPT\] Nội dung cuộc tranh biện.

2\. \[CRITERIA\] 4 Tiêu chí chấm điểm:

\- \*\*Logic & Reasoning (Tư duy Logic):\*\* Mạch lạc, có tính liên kết,
không mắc lỗi ngụy biện.

\- \*\*Evidence (Dẫn chứng):\*\* Số liệu, ví dụ thực tế có thuyết phục
không?

\- \*\*Rebuttal (Khả năng phản biện):\*\* Có lắng nghe và bẻ gãy được ý
đối phương không? hay chỉ nói ý mình?

\- \*\*Rhetoric (Hùng biện):\*\* Phong thái, giọng điệu, sức thuyết
phục.

\*\*TASK:\*\*

Phân tích lạnh lùng và khách quan. Tuyên bố người thắng cuộc.

\*\*REQUIREMENTS:\*\*

1\. \*\*Vạch trần Ngụy biện (Fallacy Spotter):\*\* Chỉ ra chính xác User
(hoặc AI) đã mắc lỗi ngụy biện gì (VD: Tấn công cá nhân - Ad Hominem,
Trượt dốc - Slippery Slope...).

2\. \*\*Winner Declaration:\*\* Tuyên bố ai thắng dựa trên sức nặng luận
điểm.

\*\*OUTPUT FORMAT (JSON ONLY):\*\*

{

"winner": "AI (Opposition)",

"scores": {

"user": {"logic": 6, "evidence": 5, "rebuttal": 4, "rhetoric": 7},

"ai": {"logic": 9, "evidence": 8, "rebuttal": 9, "rhetoric": 8}

},

"fallacy_check": \[

{

"speaker": "User",

"timestamp": "1:20",

"fallacy_type": "Strawman (Người rơm)",

"explanation": "Bạn đã bóp méo ý của AI thành 'cấm hoàn toàn', trong khi
AI chỉ nói 'hạn chế'."

}

\],

"better_arguments": \[

{

"original_point": "User nói: AI làm người ta lười biếng.",

"stronger_version": "Sự phụ thuộc quá mức vào AI sẽ làm thui chột khả
năng tư duy phản biện của con người trong dài hạn.",

"tactic": "Chuyển từ 'tính cách' (lười biếng) sang 'hậu quả dài hạn'
(thui chột tư duy)."

}

\]

}

### **📱 GIAO DIỆN KẾT QUẢ (UI MOCKUP - DEBATE STYLE)**

#### **1. Bảng tỷ số (Scoreboard)**

> 🏆 WINNER: AI (OPPOSITION)
>
> AI đã thắng nhờ luận điểm về "Rủi ro an ninh" mà bạn không phản biện
> được.
>
> Tỷ số:
>
> 👤 User: 6.5 VS 🤖 AI: 8.0

#### **2. Vạch lá tìm sâu (Fallacy Detector)**

*Đây là tính năng "sát thủ" giúp user học tư duy logic.*

> **⚠️ CẢNH BÁO LỖI LOGIC:**
>
> **1. Lỗi Ngụy biện Người rơm (Strawman) - Giây 1:20**

- ❌ **Bạn nói:** *"Vậy ý anh là muốn cấm hết internet để an toàn chứ
  gì?"*

- ℹ️ **Giải thích:** AI không hề nói cấm internet. Bạn đang dựng lên một
  luận điểm giả để tấn công.

- ✅ **Nên phản biện:** *"Việc hạn chế internet sẽ kìm hãm sự phát triển
  kinh tế..."* (Tấn công vào luận điểm thực).

> **2. Lỗi Tấn công cá nhân (Ad Hominem) - Giây 2:05**

- ❌ **Bạn nói:** *"Vì anh là người máy nên anh mới nói thế."*

- ℹ️ **Giải thích:** Hãy tập trung vào luận điểm, đừng công kích người
  nói.

#### **3. Cải thiện lập luận (Argument Refinement)**

> **💪 NÂNG CẤP VŨ KHÍ:**

- **Luận điểm yếu của bạn:** *"AI cướp việc làm."*

- **Nâng cấp (Level Pro):** *"Sự dịch chuyển lao động do AI tạo ra sẽ
  nhanh hơn khả năng thích nghi của hệ thống giáo dục, dẫn đến thất
  nghiệp mang tính cơ cấu."*

### **TÓM TẮT CÔNG NGHỆ (TECH STACK)**

||
||
||
||
||
||
