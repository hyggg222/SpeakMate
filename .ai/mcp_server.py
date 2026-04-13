import os
import json
from datetime import datetime
from mcp.server.fastmcp import FastMCP

# Setup paths
AI_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(AI_DIR, "STATE.md")
CONTEXT_FILE = os.path.join(AI_DIR, "CONTEXT.md")

# Create FastMCP server
mcp = FastMCP("speakmate-mcp")

@mcp.tool()
def get_project_state() -> str:
    """Lấy project state hiện tại (nội dung .ai/STATE.md). Đọc xem tác vụ nào đang dang dở."""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return f.read()
    return "STATE.md không tồn tại"

@mcp.tool()
def get_context() -> str:
    """Lấy SSoT Context hiện tại (.ai/CONTEXT.md). Danh sách commands, architecture, rules."""
    if os.path.exists(CONTEXT_FILE):
        with open(CONTEXT_FILE, "r", encoding="utf-8") as f:
            return f.read()
    return "CONTEXT.md không tồn tại"

@mcp.tool()
def append_handoff_note(note: str) -> str:
    """Thêm ghi chú giao tiếp cho Agent tiếp theo vào Session Handoff Notes trong STATE.md. Chạy ở CUỐI mỗi session làm việc."""
    if not os.path.exists(STATE_FILE):
        return "Lỗi: STATE.md không tồn tại"
        
    with open(STATE_FILE, "a+", encoding="utf-8") as f:
        today = datetime.now().strftime("%Y-%m-%d")
        f.write(f"\n- [{today}] {note}")
        
    return f"Đã thêm handoff note thành công: {note}"

@mcp.tool()
def update_task_status(task_keyword: str, completed: bool) -> str:
    """Đánh dấu checkbox đoạn Active Tasks trong STATE.md. completed=True cho [x], False cho [ ]"""
    if not os.path.exists(STATE_FILE):
        return "Lỗi: STATE.md không tồn tại"
        
    with open(STATE_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    modified = False
    for i, line in enumerate(lines):
        if "- [" in line and task_keyword.lower() in line.lower():
            if completed:
                lines[i] = line.replace("- [ ]", "- [x]").replace("- [X]", "- [x]")
            else:
                lines[i] = line.replace("- [x]", "- [ ]").replace("- [X]", "- [ ]")
            modified = True
            break
            
    if modified:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            f.writelines(lines)
        return f"Đã cập nhật task chứa '{task_keyword}' thành [{'x' if completed else ' '}]."
    else:
        return f"Lỗi: Không tìm thấy task nào khớp với keyword '{task_keyword}' có dạng checkbox."

if __name__ == "__main__":
    mcp.run()
