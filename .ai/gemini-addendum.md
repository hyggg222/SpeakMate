---
# GEMINI SPECIFIC INSTRUCTIONS
This file provides guidance to Gemini Code Agent when working with code in this repository.

**--- 🚨 QUY TẮC DUY TRÌ WORKFLOW HIỆU QUẢ ---** 
1. Đầu phiên làm việc luôn tuân thủ thẻ `MEMORY[user_global]` (quy tắc system prompt toàn cục).
2. **SSoT (Single Source of Truth):**
   - Hạn chế sửa trực tiếp `GEMINI.md`. Khi có quyết định thiết kế mới/quan trọng, SỬA `.ai/CONTEXT.md` và chạy lệnh `node .ai/sync.js`.
3. **Đọc State (Đầu phiên):** 
   - Bắt buộc gọi tool đọc `.ai/STATE.md` để nối tiếp work load từ luồng phát triển hiện tại. 
4. **Cập nhật State (Trong & Cuối phiên):**
   - Khi dọn xong task, tick `[x]` thay vì `[ ]` trong `.ai/STATE.md`.
   - BẮT BUỘC để lại lề tóm tắt vào mục `Session Handoff Notes` cuối thư mục STATE.md trước khi ngắt luồng tương tác. Ghi rõ bạn đã làm gì, lỗi phát sinh ở đâu, khuyên hướng đi tiếp theo. Đừng để kiến thức bay màu cùng session!
5. **Thông báo điện thoại (Sau mỗi phản hồi):**
   - SAU KHI thực hiện bất kỳ phản hồi (response) nào cho user, BẮT BUỘC chạy đúng lệnh sau (không đổi nội dung):
     ```
     python .ai/notify.py "Task hoan thanh!"
     ```
