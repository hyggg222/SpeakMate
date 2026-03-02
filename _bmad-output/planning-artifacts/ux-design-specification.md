---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-core-experience', 'step-04-emotional-response', 'step-05-inspiration', 'step-06-design-system', 'step-07-defining-experience', 'step-08-visual-foundation', 'step-09-design-directions', 'step-10-user-journeys', 'step-11-component-strategy', 'step-12-ux-patterns', 'step-13-responsive-accessibility', 'step-14-complete']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', 'docs/product-brief.md', '_bmad-output/project-context.md']
status: 'complete'
lastStep: 14
---

# UX Design Specification SpeakMate

**Author:** huy
**Date:** 2026-01-19

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision
SpeakMate là nền tảng EdTech tiên phong giúp học sinh Việt Nam vượt qua nỗi sợ giao tiếp và sự trì hoãn trong việc học kỹ năng. Dự án tập trung vào việc tạo ra một môi trường luyện tập an toàn, chuyên nghiệp nhưng cực kỳ tối giản về thao tác, giúp việc bắt đầu một phiên luyện tập trở nên dễ dàng và thú vị.

### Target Users
*   **Học sinh THPT & Sinh viên năm nhất:** Nhóm người dùng trẻ, năng động nhưng cũng dễ bị phân tâm và có xu hướng "ngại" các tác vụ đòi hỏi nỗ lực lớn ngay lập tức.
*   **Đặc điểm tâm lý:**
    *   **Nỗi sợ phán xét:** Ngại mắc lỗi trước mặt người khác.
    *   **Sự "lười" (Ma sát tâm lý):** Dễ bỏ cuộc nếu ứng dụng quá phức tạp hoặc yêu cầu quá nhiều bước chuẩn bị. Cần những cú hích (nudges) và phần thưởng tức thì.

### Key Design Challenges
1.  **Tối thiểu hóa ma sát (Frictionless Entry):** Làm sao để từ lúc mở app đến lúc bắt đầu nói chỉ mất tối đa 2-3 chạm? Guest Mode là chìa khóa ở đây.
2.  **Quản lý kỳ vọng và độ trễ:** Biến thời gian chờ AI xử lý thành một phần của trải nghiệm (ví dụ: các mẹo nhỏ hiện ra, hoặc animation AI đang "lắng nghe và suy ngẫm").
3.  **Thiết kế cho sự an tâm và chuyên nghiệp:** Giao diện phải đủ sạch sẽ để tạo sự tập trung, nhưng không được khô khan như một cuốn sách giáo khoa.

### Design Opportunities
1.  **Humanize the Void (Lấp đầy khoảng trống):** Không bao giờ để người dùng đối mặt với màn hình trống. AI phải luôn chủ động "mở lời" (warm welcome, gợi ý chủ đề) để giảm áp lực phải bắt đầu từ con số 0.
2.  **Lower the Bar (Hạ thấp rào cản):** Sử dụng ngôn ngữ giao diện nhẹ nhàng, giảm áp lực tâm lý (ví dụ: "Chém gió tí thôi" thay vì "Bài kiểm tra"). Tạo cảm giác đây là một nơi an toàn để mắc lỗi.
3.  **Micro-Learning & Gamification:** Chia nhỏ các buổi luyện tập. Sử dụng cơ chế Streak và Feedback Cards để người dùng thấy mình "thắng" ngay lập tức.
4.  **Cơ chế "Nhấn để nói" trực quan:** Nút ghi âm phải là điểm nhấn lớn nhất, tạo cảm giác thôi thúc người dùng tương tác.

## Core User Experience

### Defining Experience
Trải nghiệm cốt lõi của SpeakMate xoay quanh vòng lặp: **Kích thích (AI mở lời) -> Phản hồi (User nhấn và nói) -> Động viên (AI feedback)**. Hành động quan trọng nhất là "Nhấn và Giữ" (hoặc chạm để bắt đầu/kết thúc) nút ghi âm. Đây là khoảnh khắc người dùng vượt qua rào cản tâm lý để thực hiện đầu ra (output).

### Platform Strategy
*   **Web App (Mobile Responsive):** Ưu tiên hiển thị và tương tác trên thiết bị di động nhưng vẫn đảm bảo mượt mà trên desktop.
*   **Security & Sustainability in Guest Mode:**
    *   **Rate Limit UI:** Hiển thị rõ ràng số lượt nói miễn phí còn lại cho khách (VD: 10 lượt/giờ) để ngăn chặn spam và khuyến khích đăng nhập.
    *   **Auto-Cleanup:** Tự động xóa dữ liệu phiên làm việc (LocalStorage) sau 15 phút không hoạt động để bảo vệ quyền riêng tư trên thiết bị công cộng.

### Effortless Interactions
*   **Zero-Login Entry:** Người dùng có thể bắt đầu phiên luyện tập ngay lập tức mà không cần qua bước đăng ký/đăng nhập.
*   **Auto-Topic Starter:** Ngay khi vào app, AI sẽ chủ động đưa ra một lời chào hoặc một câu hỏi gợi mở, giúp người dùng không phải mất công suy nghĩ "Nên nói gì bây giờ?".
*   **Simple Redo:** Cơ chế "Nói lại" (Redo) cực kỳ dễ dàng nếu người dùng cảm thấy chưa ưng ý với lượt nói vừa rồi, giảm áp lực phải hoàn hảo.

### Critical Success Moments
*   **"Aha!" Moment:** Hoàn thành một phiên hội thoại 3 lượt (Safe Mode) mà không cần dùng nút "Undo" quá 2 lần.
*   **Khoảnh khắc thành công:** Cảm giác tự tin khi nhận được các "Thẻ hành động" (Actionable Feedback Cards) chỉ ra đúng điểm mình có thể cải thiện ngay lập tức và hoàn thành "Nhiệm vụ bí mật" ngoài đời thực.

### Experience Principles
1.  **Immediate Value (Giá trị tức thì):** Vào app là có thể "nói" và nhận feedback ngay, không rào cản.
2.  **Forgiving Interface (Giao diện vị tha):** Cho phép sai sót, cho phép nói lại, không phán xét bằng điểm số khô khan ở bước đầu.
3.  **Physical Simplicity (Sự tối giản vật lý):** Một nút bấm chính, một luồng đi thẳng, không có các menu gây nhiễu.
4.  **Action-Oriented (Hướng hành động):** Mọi phản hồi của AI phải dẫn đến một hành động cụ thể để người dùng thực hiện tiếp theo.
5.  **Safety First (An toàn là trên hết):** Luôn có cơ chế bảo vệ (Rate Limit, Content Filter) ngầm để đảm bảo môi trường lành mạnh mà không làm phiền người dùng hợp lệ.

## Desired Emotional Response

### Primary Emotional Goals
*   **Sự An tâm Tuyệt đối (Psychological Safety):** Cảm giác không bị phán xét, thoải mái khi mắc lỗi và nói sai.
*   **Sự Chuyên nghiệp Truyền cảm hứng (Empowered Learning):** Cảm giác mình đang được dẫn dắt bởi một người thầy thông thái, hiện đại và thân thiện.

### Emotional Journey Mapping
*   **Trước tương tác:** Cảm giác thư thái, sẵn sàng nhờ không gian âm thanh (Ambient sound) và lời chào ấm áp.
*   **Trong tương tác (Ghi âm):** Cảm giác tập trung và quyết tâm.
*   **Khoảnh khắc chờ đợi (Latency):** Giảm lo âu bằng những câu xin chờ ngắn gọn, hóm hỉnh (VD: "Đang lắng nghe hơi thở của bạn...", "Mình đang sắp xếp lại những ý tưởng tuyệt vời của bạn đây...").
*   **Sau tương tác:** Cảm giác thỏa mãn và được công nhận thông qua màn hình chúc mừng sinh động (Flash of Insight).
*   **Kết thúc phiên:** Cảm giác được tiếp thêm năng lượng (Motivated) nhờ các trích dẫn tiếng Anh truyền cảm hứng và lời khen hóm hỉnh (VD: "Wow, even Shakespeare would be jealous of that tone!").

### Micro-Emotions
*   **Tò mò (Curiosity):** Luôn muốn biết AI sẽ phản hồi thế nào hoặc trích dẫn tiếp theo là gì.
*   **Vui vẻ (Amusement):** Nụ cười nhẹ khi nghe AI đùa hoặc đưa ra những so sánh hóm hỉnh.

### Design Implications
*   **Empathic Wait States:** Thiết kế các dòng text "biết cảm thông" xuất hiện ngẫu nhiên trong lúc AI xử lý để xóa bỏ cảm giác chờ đợi kỹ thuật.
*   **Success Screen Combo:** Sử dụng bộ ba: Confetti (Visual) + Lời khen hóm hỉnh (Tone) + Trích dẫn truyền cảm hứng (Inspiration).
*   **Quote Sharing:** Cho phép người dùng lưu lại hoặc chia sẻ các câu trích dẫn đẹp mắt cuối mỗi buổi tập.

### Emotional Design Principles
1.  **Warmth over Coldness:** Ưu tiên ngôn ngữ tự nhiên, thân mật thay vì các thông báo hệ thống khô khan.
2.  **Celebration of Effort:** Chúc mừng nỗ lực (hành động nói) chứ không chỉ chúc mừng kết quả (điểm số).
3.  **Positive Reinforcement:** Luôn kết thúc bằng một điểm tích cực để người dùng muốn quay lại vào lần sau.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

*   **Duolingo (The Motivation Master):**
    *   **Thành công UX:** Biến việc học thành một trò chơi (Gamification). Sự hiện diện của nhân vật Duo tạo ra kết nối cảm xúc (dù đôi khi là... áp lực).
    *   **Bài học:** Sử dụng các tương tác nhỏ (micro-interactions), âm thanh chúc mừng vui tai và hệ thống Streak để "trị" sự lười biếng.
*   **ELSA Speak (The Technical Standard):**
    *   **Thành công UX:** Giao diện tập trung tối đa vào âm thanh. Cách hiển thị kết quả bằng màu sắc (Xanh - Vàng - Đỏ) giúp người dùng hiểu ngay lập tức họ đang ở đâu.
    *   **Bài học:** Tính minh bạch của dữ liệu. Người dùng tin tưởng vào app vì họ thấy được sự phân tích chi tiết.

### Transferable UX Patterns

*   **Celebratory Feedback (từ Duolingo):** Sử hiệu ứng bừng sáng, âm thanh vui tươi và các nhân vật cổ vũ ngay khi người dùng hoàn thành một lượt nói.
*   **Color-Coded Feedback (từ ELSA):** Áp dụng màu sắc vào văn bản transcript để chỉ ra các lỗi sai hoặc các từ dùng hay (Xanh cho sự tự tin/từ vựng tốt, Đỏ cho lỗi logic/bí từ).
*   **Bite-sized Lessons (từ cả hai):** Chia nhỏ các phiên giao tiếp thành các lượt đối thoại ngắn (30s - 1 phút) để người dùng không cảm thấy quá tải.

### Anti-Patterns to Avoid

*   **Aggressive Nudging (Duolingo):** Tránh việc nhắc nhở quá dồn dập hoặc gây cảm giác "tội lỗi" nếu người dùng không luyện tập. SpeakMate nên là một người bạn đồng hành tích cực, không phải một giám thị.
*   **Feedback Overload (ELSA):** Đừng hiển thị quá nhiều chỉ số kỹ thuật phức tạp ngay từ đầu. Đối với người trẻ đang sợ hãi, chúng ta cần sự khích lệ trước, kỹ thuật sau.
*   **Hidden Value (Cả hai):** Tránh việc bắt người dùng làm quá nhiều bài kiểm tra đầu vào (Diagnostic test) trước khi cho họ trải nghiệm tính năng chính.

### Design Inspiration Strategy

*   **Học tập (Adopt):** Hệ thống phản hồi ngay lập tức (Immediate feedback) và các thẻ chúc mừng của Duolingo.
*   **Cải biên (Adapt) - The Hybrid Deck:**
    *   **Mobile:** Giao diện chính là một chồng thẻ bài chủ đề (Infinite Deck) để tối ưu hóa thao tác chạm/vuốt, tạo cảm giác khám phá nhanh.
    *   **Desktop:** Chuyển đổi thành giao diện lưới (Grid) hoặc băng chuyền (Carousel) để tận dụng không gian màn hình rộng.
    *   **Mode Switcher:** Dù ở giao diện nào, người dùng vẫn có thể dễ dàng chuyển sang chế độ Stage/Debate hoặc tính năng "Tạo bối cảnh riêng" thông qua thanh điều hướng tối giản (Bottom Bar trên Mobile, Side Bar trên Desktop).
*   **Sáng tạo (Innovate) - Living Transcript:**
    *   Văn bản phản hồi có animation cảm xúc (từ hay sẽ "nảy" lên hoặc sáng) thay vì chỉ tô màu tĩnh. Tập trung vào việc tôn vinh điểm đúng (Positive Reinforcement).
*   **Tránh (Avoid):** Việc ẩn các tính năng nâng cao (Present/Debate) quá sâu. Chúng cần được tiếp cận dễ dàng (1-click) ngay cả khi Safe Mode là mặc định.

## Design System Foundation

### 1.1 Design System Choice
**Shadcn/ui** kết hợp with **Tailwind CSS** và **Radix UI**.

### Rationale for Selection
*   **Linh hoạt tối đa:** Cho phép tùy chỉnh sâu các component để hiện thực hóa các ý tưởng độc đáo như "Infinite Deck" và "Living Transcript" mà không bị bó buộc bởi các thư viện đóng gói sẵn.
*   **Hiệu năng cao:** Chỉ cài đặt những component thực sự cần thiết, tối ưu hóa tốc độ tải trang cho Web App.
*   **Tính hiện đại:** Phù hợp hoàn hảo với stack Next.js 14+ và đáp ứng gu thẩm mỹ hiện đại của đối tượng học sinh THPT/Sinh viên.
*   **Được sự đồng thuận từ Kỹ thuật:** Team Dev và Architect đã xác nhận khả năng mở rộng (Scale) và bảo trì (Maintainability) với điều kiện thiết lập Semantic Tokens rõ ràng.

### Implementation Approach
Sử dụng các thiết kế nguyên mẫu (Primitives) từ Radix UI để đảm bảo tính tiếp cận (Accessibility - WCAG 2.1) và dùng Tailwind CSS để định hình phong cách (Styling). Các component sẽ được đặt trong thư mục `src/components/ui`.

### Customization Strategy
*   **Color Palette:** Thiết kế bảng màu riêng dựa trên hai cảm xúc "An tâm" và "Chuyên nghiệp".
*   **Typography:** Lựa chọn các font chữ hiện đại, dễ đọc trên thiết bị di động.
*   **Motion:** Tích hợp **Framer Motion** để tạo các chuyển động mượt mà cho các thẻ bài và hiệu ứng chúc mừng.

## 2. Core User Experience

### 2.1 Defining Experience
Trải nghiệm định hình của SpeakMate là **"Được dẫn dắt bởi Ni" (Coached by Ni)**. Người dùng không đơn độc; họ có Ni - một trợ lý ảo luôn túc trực để đưa ra các gợi ý theo khung (Scaffolding Hints) khi họ gặp khó khăn và phân tích chiến lược sau mỗi phiên tập.

### 2.2 User Mental Model
*   **Mô hình cũ:** Người dùng đối đầu với máy (Cô đơn, Sợ hãi).
*   **Mô hình SpeakMate:** Người dùng + Ni đối đầu với thử thách (Đồng đội, An tâm).
*   **Quyền tự quyết:** Người dùng hoàn toàn chủ động chọn chủ đề (bao gồm 3 chủ đề Hot nhất và chủ đề Daily Pick với điểm thưởng cao).

### 2.3 Success Criteria
*   **Sự phụ thuộc tích cực:** Người dùng sử dụng gợi ý của Ni thay vì bỏ cuộc.
*   **Cảm giác làm chủ:** Hoàn thành các chủ đề khó (Hard) với sự trợ giúp tối thiểu từ Ni qua thời gian.
*   **Động lực hàng ngày:** Duy trì việc hoàn thành "Daily Pick" để tích lũy XP.

### 2.4 Novel UX Patterns
*   **Scaffolding Hint System:** Thay vì đưa ra câu trả lời đầy đủ, Ni cung cấp từ khóa hoặc cụm từ để kích thích tư duy người dùng.
*   **Pre-fetching Intelligence:** Các gợi ý được nạp sẵn khi chọn chủ đề để đảm bảo phản hồi tức thì (Zero Latency) khi người dùng yêu cầu trợ giúp.

### 2.5 Experience Mechanics

**1. Khởi đầu (Initiation):**
*   Màn hình chính hiển thị các thẻ bài chủ đề (Cards).
*   Người dùng chọn chủ đề hoặc tạo bối cảnh riêng. Hệ thống nạp sẵn (Pre-fetch) các gợi ý tiềm năng.

**2. Tương tác "Ni ơi, cứu!" (The Hint Loop):**
*   Người dùng nhấn và nói với AI đối thoại.
*   Nếu bí từ, người dùng chạm vào bong bóng Ni (hoặc Ni nhấp nháy sau 5 giây im lặng).
*   Ni hiển thị 3 từ khóa/cụm từ gợi ý ngay lập tức (On-demand/Pre-fetched).

**3. Phản hồi và Phân tích (Feedback):**
*   Sau khi phiên kết thúc, Ni xuất hiện ở trung tâm màn hình để đưa ra phân tích chuyên sâu về điểm mạnh/yếu và gợi ý cải thiện.

**4. Hoàn thành (Completion):**
*   Nhận XP dựa trên độ khó của chủ đề. Chúc mừng kèm trích dẫn tiếng Anh truyền cảm hứng.

## Visual Design Foundation

### Color System
*   **Primary (Brand Color):** **Navy Blue** (`#1E3A8A`) - Lấy cảm hứng từ bộ vest của Mentor Ni. Tượng trưng cho sự chuyên nghiệp, học thuật và điềm tĩnh.
*   **Secondary (Friendly Accent):** **Warm Cream** (`#FEF3C7`) - Tạo cảm giác ấm áp, khích lệ trong giao tiếp.
*   **Action (CTA):** **Vibrant Blue** (`#3B82F6`) - Dùng cho nút Micro và các hành động chính, nổi bật và mời gọi tương tác.
*   **Semantic Colors:**
    *   *Success (Đúng/Hay):* **Mint Green** (`#10B981`) - Nhẹ nhàng, tích cực.
    *   *Improvement (Cần sửa):* **Soft Orange** (`#F97316`) - Chỉ dẫn thay vì phán xét.

### Typography System
*   **Tone:** Friendly Academic (Thân thiện nhưng học thuật).
*   **Headings:** **Quicksand** (Rounded Sans-serif) - Tạo sự mềm mại, phù hợp với phong cách hoạt hình của Ni.
*   **Body Text:** **Inter** - Tối ưu cho khả năng đọc (Readability) trên Web và Mobile.
*   **Scale:** Base size 18px (`text-lg`) để người dùng dễ dàng theo dõi transcript.

### Spacing & Layout Foundation
*   **Vibe:** **Airy (Thoáng đãng)**. Sử dụng khoảng trắng rộng rãi để giảm tải nhận thức và tôn vinh nhân vật Ni.
*   **Grid System:** Linh hoạt giữa Single Column (Mobile) và Split Screen (Desktop) để tối ưu hóa nhân vật Ni dẫn dắt.
*   **Radius:** `rounded-2xl` cho các Cards và Buttons, mang lại cảm giác an toàn và hiện đại.

### Accessibility Considerations
*   **Contrast:** Đảm bảo chuẩn WCAG AA cho toàn bộ bảng màu.
*   **Visualizer:** Cung cấp phản hồi thị giác (sóng âm) khi ghi âm để hỗ trợ người dùng nhận biết mic đang hoạt động.

## Design Direction Decision

### Chosen Direction
**Direction 1.5: The Guided Focus (with Hub Navigation)**

### Design Rationale
Kết hợp giữa sự tập trung tối đa trong lúc luyện tập và khả năng khám phá phong phú ở màn hình chính.
*   **The Hub (Home):** Đóng vai trò là bệ phóng. Cho phép người dùng chọn nhanh chế độ (Safe/Stage/Debate) hoặc nhảy thẳng vào các chủ đề Hot (Frictionless Entry).
*   **The Room (Practice):** Tối giản hóa mọi thứ xung quanh để người dùng chỉ tập trung vào Mic và Transcript. Sự hiện diện của Ni tạo cảm giác an tâm.

### Implementation Approach
*   **Home Screen:** Sử dụng `Grid` (Desktop) và `Stack` (Mobile) của Shadcn/ui để hiển thị các Mode Cards và Topic List.
*   **Practice Screen:** Sử dụng `Flexbox` để chia layout (Split Screen).
*   **Navigation:** Sử dụng thanh điều hướng dưới (Bottom Tab) trên Mobile và Sidebar trên Desktop để người dùng có thể quay lại Home bất cứ lúc nào từ các màn hình phụ (Profile, Settings).
*   **Context Setup:** Thêm bước đệm **"Pre-Room Modal"** để hiển thị thông tin chủ đề và nạp sẵn gợi ý (Pre-fetch hints) trước khi vào phòng tập, đảm bảo sự chuẩn bị về tâm lý và kỹ thuật.

## User Journey Flows

### 1. Safe Mode Practice (Minh - The Struggler)
*   **Mục tiêu:** Hoàn thành 3 lượt đối thoại để tăng sự tự tin.
*   **Luồng đi:** Home -> Pre-Room Modal -> Practice Room -> Interaction Loop (với Hint từ Ni) -> Success Celebration.
*   **Tối ưu UX:** "Pre-fetching Hints" giúp Minh không bao giờ bị kẹt lại quá lâu.

### 2. Stage Mode Presentation (Minh/Lan)
*   **Mục tiêu:** Luyện tập bài thuyết trình trôi chảy.
*   **Luồng đi:** Home -> Mode Selector -> Setup (Chọn chủ đề/Tải kịch bản) -> Stage Room (Ghi âm liên tục) -> Post-Session Report.
*   **Tối ưu UX:** Không có cảnh báo thời gian thực để tránh áp lực. Phân tích tốc độ nói (Pacing) và từ đệm (Filler words) sẽ được trình bày trực quan sau khi hoàn thành.

### 3. Debate Mode Challenge (Hùng - The Gamer)
*   **Mục tiêu:** Phản biện lại AI và thắng bằng Logic.
*   **Luồng đi:** Home -> Mode Selector -> Arena (Chọn phe Ủng hộ/Phản đối) -> Battle Room -> Critical Feedback (Phân tích lỗi ngụy biện).
*   **Tối ưu UX:** Giao diện mang tính đối kháng (Vibrant colors) để kích thích tinh thần cạnh tranh.

### Journey Patterns
*   **The Commitment Step:** Luôn có "Pre-Room Modal" để người dùng xác nhận sự sẵn sàng trước khi ghi âm.
*   **The Loop Back:** Kết thúc mỗi buổi tập, hệ thống luôn gợi ý chủ đề tiếp theo có độ khó cao hơn hoặc tương đương để duy trì mạch học.
*   **One-Hand Operation:** Nút Micro luôn nằm ở vị trí thuận tiện nhất cho ngón tay cái trên thiết bị di động.

### Flow Optimization Principles
1.  **Zero Distraction:** Trong lúc người dùng nói, ẩn mọi menu không cần thiết.
2.  **Delayed Gratification:** Phản hồi chuyên sâu (Rubric) chỉ xuất hiện ở cuối buổi để đảm bảo dòng chảy cảm xúc (Flow state).
3.  **Positive Exit:** Luôn kết thúc bằng một câu trích dẫn hoặc phần thưởng XP để người dùng cảm thấy "mình đã thắng".

## Component Strategy

### Design System Components (Shadcn/ui Foundation)
Chúng ta sẽ tận dụng tối đa các thành phần chuẩn để đảm bảo tốc độ phát triển:
*   **Layout:** `Container`, `Stack`, `Grid`.
*   **Navigation:** `Navbar`, `BottomNav`, `Sidebar` (Desktop).
*   **Overlays:** `Dialog` (cho Pre-room Modal), `Sheet` (cho Hints trên Mobile).
*   **Feedback:** `Toast` (cho các thông báo nhanh), `Skeleton` (cho trạng thái chờ).
*   **UI Basics:** `Button`, `Badge` (cho độ khó), `Progress` (cho XP/Energy Bar).

### Custom Components

#### 1. The Topic Card (Thẻ bài Chủ đề)
*   **Mục đích:** Hiển thị bối cảnh luyện tập và thu hút người dùng.
*   **Cấu trúc (Anatomy):** Thumbnail (mờ) + Title + Difficulty Badge + XP Reward + Status Icon (Hot/New).
*   **Trạng thái (States):** Default, Hover (Phóng to nhẹ), Done (Có dấu tích), Locked (Có ổ khóa & độ mờ).
*   **Tương tác:** Click để mở Pre-room Modal.

#### 2. The Living Transcript (Văn bản Sống)
*   **Mục đích:** Hiển thị hội thoại thời gian thực và phản hồi từ AI.
*   **Cấu trúc:** Một danh sách các `word` components.
*   **Đặc tính:**
    *   **Streaming:** Chữ hiện ra mờ dần (Fade-in) khi AI đang nói.
    *   **Color-coding:** Xanh (Confidence cao), Cam (Cần cải thiện), Xám (Từ đệm/Filler).
    *   **Interactive:** Chạm vào một từ để xem giải nghĩa hoặc nghe lại phát âm.

#### 3. The Multi-state Mic Button
*   **Mục đích:** Điểm chạm tương tác vật lý chính.
*   **Trạng thái (States):**
    1.  **Idle:** Icon Micro đơn giản, hiệu ứng "thở" (glow) nhẹ.
    2.  **Recording:** Đổi màu sang đỏ hoặc xanh lá, có vòng sóng âm (Sound visualizer) tỏa ra xung quanh.
    3.  **Processing:** Icon Micro xoay tròn hoặc pulse chậm để báo hiệu AI đang suy nghĩ.
*   **Tương tác:** Nhấn giữ (Hold) hoặc Chạm (Toggle).

### Component Implementation Strategy
*   **Tokens First:** Mọi custom component phải sử dụng biến CSS/Tailwind được định nghĩa trong `tailwind.config.ts` (VD: `bg-navy-900`, `rounded-2xl`).
*   **Motion:** Sử dụng **Framer Motion** cho các animation chuyển trạng thái của Mic và Transcript.
*   **Composition:** Xây dựng Custom Components bằng cách kết hợp (Compose) các primitives của Radix UI và Tailwind.

### Implementation Roadmap

**Giai đoạn 1 - Core (MVP-0):**
*   Phòng luyện tập: Mic Button, Living Transcript, Ni Avatar.
*   Màn hình chính: Topic Card (phiên bản đơn giản).

**Giai đoạn 2 - Enhancements (MVP-1):**
*   Pre-room Modal (Context setup).
*   Mode Selector (Safe/Stage/Debate).
*   Thẻ phản hồi chi tiết (Feedback Cards).

**Giai đoạn 3 - Optimization:**
*   Hệ thống gợi ý của Ni (Hint Overlay).
*   Hệ thống Gamification (Energy Bar, XP progress).

## UX Consistency Patterns

### Button Hierarchy
*   **Primary Action:** Nút Mic (Vibrant Blue, Shadow lớn). Dùng để Bắt đầu/Gửi lượt nói.
*   **Secondary Action:** Nút **Undo** (Ghost style, icon X hoặc Back). Chỉ xuất hiện khi Mic đang ở trạng thái Recording.
*   **Tertiary Action:** Nút "Ni cứu" (Link text với icon Sparkle).

### Feedback Patterns
*   **Recording State:** Sóng âm (Pulse) màu Blue tỏa ra từ Mic.
*   **Undo Action:** Hiệu ứng "hút" (Suck-in) audio wave vào nút Undo + Toast nhẹ: "Đã xóa nháp. Thử lại nhé! (Còn 1 lần undo)".
*   **Success:** Confetti nhẹ nhàng khi kết thúc phiên hội thoại 3 lượt.

### Interaction Rules (Undo & Flow)
*   **The "Draft" Rule:** Người dùng được phép hủy lượt nói đang thực hiện tối đa 2 lần.
*   **Commitment Point:** Một khi người dùng nhấn Mic để gửi (Send), AI sẽ phản hồi và lượt nói đó trở thành vĩnh viễn (không thể sửa lại lịch sử).
*   **AI-Only Transcript:** Giao diện chỉ hiển thị văn bản của AI để giữ cho màn hình sạch sẽ (Airy) và tập trung vào việc lắng nghe/phản hồi thay vì đọc lại chính mình.

### Empty & Loading States
*   **Thinking State:** Khi AI đang xử lý, hiển thị animation "Ni đang suy nghĩ..." kèm theo các dòng text hóm hỉnh để mask độ trễ.
*   **Topic Transition:** Sử dụng hiệu ứng trượt (Slide) khi chuyển từ Pre-room Modal vào Practice Room.

### UX Writing (Voice & Tone)
*   **Thân thiện:** "Ni đang nghe đây...", "Đừng lo, nói lại lần nữa nhé!".
*   **Học thuật:** "Phân tích logic của Ni cho thấy...", "Từ khóa vàng của ngày hôm nay là...".

## Responsive Design & Accessibility

### Responsive Strategy: Desktop-First
*   **Desktop (Primary):** Tận dụng tối đa không gian màn hình rộng với bố cục Split Screen (Ni & Context | Transcript | Tools). Hỗ trợ Keyboard Shortcuts (Space to Record, Ctrl+Z to Undo).
*   **Mobile (Secondary - Adaptive):** Chuyển sang Stacked Layout (dọc). Sử dụng Bottom Sheets cho các menu phụ và tối ưu hóa Touch Targets cho ngón tay cái.

### Breakpoint Strategy
*   **Standard Tailwind Breakpoints:**
    *   Desktop: 1024px+
    *   Tablet: 768px - 1023px
    *   Mobile: 320px - 767px

### Accessibility Strategy (WCAG AA)
*   **Full Keyboard Support:** Đảm bảo mọi tính năng cốt lõi (Ghi âm, Undo, Gợi ý) đều thao tác được qua phím tắt và Tab.
*   **ARIA Enhancements:** Gắn nhãn rõ ràng cho các nút trạng thái (Recording, Thinking).
*   **Audio Cues:** Bổ sung Sound FX nhẹ nhàng để báo hiệu các sự kiện quan trọng cho người dùng khiếm thị hoặc để tăng tính phản hồi.

### Testing Strategy
*   **Multi-device Validation:** Kiểm tra trên các trình duyệt phổ biến (Chrome, Safari) và các độ phân giải từ Mobile (320px) đến Desktop (4K).
*   **Tooling:** Sử dụng Axe Core và Lighthouse để duy trì chuẩn tiếp cận AA.