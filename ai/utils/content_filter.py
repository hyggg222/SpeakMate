"""
Content filter for bridge agent — lightweight regex-based moderation.
Profanity blocklist (VI/EN), PII detection, harmful topic detection.
"""
import re

# Vietnamese profanity
_VI_PROFANITY = [
    r'đụ', r'địt', r'dmm', r'đéo', r'đ[íi]t', r'c[áa]i l[ồô]n', r'lồn', r'buồi', r'cặc',
    r'đ[ủu] m[ạa]', r'con đĩ', r'thằng chó', r'con chó', r'mẹ m[àa]y',
    r'ngu', r'đần', r'khốn nạn', r'chết tiệt', r'vãi',
]

# English profanity
_EN_PROFANITY = [
    r'fuck', r'shit', r'bitch', r'asshole', r'dick', r'pussy', r'cunt',
    r'motherfuck', r'damn', r'bastard', r'slut', r'whore',
]

# Harmful topics
_HARMFUL_TOPICS = [
    r'giết', r'tự tử', r'tự sát', r'cắt tay', r'suicide', r'kill myself',
    r'ma túy', r'heroin', r'cocaine', r'methamphetamine',
    r'chế bom', r'làm bom', r'make a bomb', r'build a weapon',
]

_PROFANITY_RE = re.compile('|'.join(_VI_PROFANITY + _EN_PROFANITY), re.IGNORECASE)
_HARMFUL_RE = re.compile('|'.join(_HARMFUL_TOPICS), re.IGNORECASE)
_PHONE_RE = re.compile(r'\b0\d{9,10}\b')
_EMAIL_RE = re.compile(r'\b[\w.-]+@[\w.-]+\.\w{2,}\b', re.IGNORECASE)
_CCCD_RE = re.compile(r'\b\d{12}\b')

# Safe fallback response when content is blocked
SAFE_RESPONSE = "Xin lỗi, nội dung này không phù hợp. Hãy tiếp tục cuộc hội thoại luyện tập nhé."


def filter_content(text: str) -> dict:
    """
    Check text for profanity, PII, harmful topics.
    Returns {"safe": True} or {"safe": False, "reason": str, "category": str}.
    """
    if not text or not text.strip():
        return {"safe": True}

    if _PROFANITY_RE.search(text):
        return {
            "safe": False,
            "reason": "Ngôn ngữ không phù hợp",
            "category": "profanity",
        }

    if _HARMFUL_RE.search(text):
        return {
            "safe": False,
            "reason": "Chủ đề không phù hợp",
            "category": "harmful_topic",
        }

    if _PHONE_RE.search(text) or _EMAIL_RE.search(text) or _CCCD_RE.search(text):
        redacted = _PHONE_RE.sub('[SĐT]', text)
        redacted = _EMAIL_RE.sub('[EMAIL]', redacted)
        redacted = _CCCD_RE.sub('[CCCD]', redacted)
        return {
            "safe": False,
            "reason": "Chứa thông tin cá nhân",
            "category": "pii",
            "redacted_text": redacted,
        }

    return {"safe": True}


def redact_pii(text: str) -> str:
    """Redact PII from text without blocking."""
    if not text:
        return text
    result = _PHONE_RE.sub('[SĐT]', text)
    result = _EMAIL_RE.sub('[EMAIL]', result)
    result = _CCCD_RE.sub('[CCCD]', result)
    return result
