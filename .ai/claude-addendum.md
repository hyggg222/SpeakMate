---
# CLAUDE SPECIFIC INSTRUCTIONS
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**--- 🚨 QUY TẮC DUY TRÌ WORKFLOW HIỆU QUẢ ---** 
1. **SSoT (Single Source of Truth):**
   - KHÔNG BAO GIỜ edit thủ công file `CLAUDE.md` ở root. 
   - Nếu cần thay đổi luật hoặc kiến trúc chung, hãy sửa `.ai/CONTEXT.md` sau đó chạy `node .ai/sync.js` để compile.

2. **Khởi tạo ngữ cảnh (Đầu session):**
   - Luôn đọc file `.ai/STATE.md` để biết "Agent trước" đã làm gì tới đâu. (Bạn không đơn độc, code base này do nhiều AI cùng xử lý).

3. **Cập nhật trạng thái liên tục:**
   - Khi hoàn thành 1 việc, hãy chủ động tick checkmark `[x]` tương ứng ở mục Active Tasks trong `.ai/STATE.md`.
   - Lưu ý cấu trúc checkbox Markdown để hệ thống dễ parse.

4. **Kế thừa & Truyền ký ức (Cuối session):**
   - TRƯỚC KHI kết thúc phiên, BẮT BUỘC thêm 1 dòng tóm tắt vào `Session Handoff Notes` ở cuối file `.ai/STATE.md`.
   - Ghi chú phải bao gồm: [Ngày tháng] - [Agent name] - Những gì vừa thêm/sửa, cảnh báo lỗi (nếu có) để người đến sau (vd: Gemini Code) nắm bắt thay vì tốn công đọc full history logs.

5. **Thông báo điện thoại (Sau mỗi task):**
   - SAU KHI hoàn thành bất kỳ task nào từ yêu cầu user, BẮT BUỘC chạy đúng lệnh sau (không đổi nội dung):
     ```
     python .ai/notify.py "Task hoan thanh!"
     ```
