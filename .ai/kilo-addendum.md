---
# KILO CODE (GROK) SPECIFIC INSTRUCTIONS

**--- 🚨 QUY TẮC DUY TRÌ WORKFLOW HIỆU QUẢ ---** 
1. Đầu phiên lệnh: Luôn luôn đọc file `.ai/STATE.md` để lấy trạng thái dự án mới nhất và biết đang thực hiện đến đâu.
2. Không tự ý chỉnh sửa file quy tắc này. Mọi cấu hình chung phải được thống nhất bới người dùng và sửa tại `.ai/CONTEXT.md`, sau đó chạy lệnh `node .ai/sync.js`.
3. Trong quá trình làm việc, nếu hoàn thành task nào, hãy mở `.ai/STATE.md` và tick `[x]` vào checklist tương ứng.
4. Cuối phiên: Bắt buộc viết 1 dòng tóm tắt công việc vào khu vực Handoff Notes ở cuối `STATE.md`.
5. **Thông báo điện thoại (Sau mỗi task):**
   - SAU KHI hoàn thành bất kỳ task nào từ yêu cầu user, BẮT BUỘC chạy đúng lệnh sau (không đổi nội dung):
     ```
     python .ai/notify.py "Task hoan thanh!"
     ```
