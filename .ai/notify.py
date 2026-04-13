#!/usr/bin/env python3
"""
notify.py - Gửi thông báo + log đến điện thoại qua ntfy.sh
Usage:
  python .ai/notify.py "Task xong rồi!"                    # Simple notification
  python .ai/notify.py "Task xong!" --level info            # With level
  python .ai/notify.py "CRITICAL BUG" --level urgent        # High priority
  cat some.log | python .ai/notify.py "Log output" --stdin  # Pipe log content
"""
import sys
import requests

NTFY_TOPIC = "speakmate-alerts-hyggg"
NTFY_URL = f"https://ntfy.sh/{NTFY_TOPIC}"

LEVEL_CONFIG = {
    "info":    {"priority": "default", "tags": "white_check_mark"},
    "warn":    {"priority": "high",    "tags": "warning"},
    "urgent":  {"priority": "urgent",  "tags": "rotating_light"},
    "error":   {"priority": "high",    "tags": "x"},
    "log":     {"priority": "low",     "tags": "memo"},
}

def notify(message: str, title: str = "SpeakMate Agent", level: str = "info", body: str = ""):
    cfg = LEVEL_CONFIG.get(level, LEVEL_CONFIG["info"])
    
    # If there's extra body content (e.g. log output), attach it
    full_message = message
    if body:
        # ntfy supports markdown in message body via Click action
        full_message = message + "\n\n" + body[:2000]  # cap at 2000 chars

    try:
        resp = requests.post(
            NTFY_URL,
            data=full_message.encode("utf-8"),
            headers={
                "Title": title,
                "Priority": cfg["priority"],
                "Tags": cfg["tags"],
                "Markdown": "yes",
            },
            timeout=5
        )
        if resp.status_code == 200:
            print(f"[notify] ✅ Sent ({level}): {message[:60]}")
        else:
            print(f"[notify] ⚠️ Failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"[notify] Error: {e}")


if __name__ == "__main__":
    args = sys.argv[1:]
    
    level = "info"
    read_stdin = False
    message_parts = []
    
    i = 0
    while i < len(args):
        if args[i] == "--level" and i + 1 < len(args):
            level = args[i + 1]
            i += 2
        elif args[i] == "--stdin":
            read_stdin = True
            i += 1
        else:
            message_parts.append(args[i])
            i += 1
    
    msg = " ".join(message_parts) if message_parts else "Task hoàn thành!"
    
    body_text = ""
    if read_stdin:
        import select, os
        body_text = sys.stdin.read()

    notify(msg, level=level, body=body_text)
