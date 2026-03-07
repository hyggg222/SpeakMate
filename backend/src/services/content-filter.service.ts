/**
 * ContentFilterService — lightweight text-based content moderation.
 * Regex blocklist for VI/EN profanity, PII detection, topic detection.
 * Runs in-process, no network calls, microsecond latency.
 */

export interface FilterResult {
    safe: boolean;
    reason?: string;
    category?: 'profanity' | 'pii' | 'harmful_topic';
    redactedText?: string;
}

// Vietnamese profanity / slurs (common, non-exhaustive)
const VI_PROFANITY = [
    'đụ', 'địt', 'dmm', 'đéo', 'đ[íi]t', 'c[áa]i l[ồô]n', 'lồn', 'buồi', 'cặc',
    'đ[ủu] m[ạa]', 'con đĩ', 'thằng chó', 'con chó', 'mẹ m[àa]y',
    'ngu', 'đần', 'khốn nạn', 'chết tiệt', 'vãi',
];

// English profanity (common)
const EN_PROFANITY = [
    'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt',
    'motherfuck', 'damn', 'bastard', 'slut', 'whore',
];

// Harmful topic keywords
const HARMFUL_TOPICS = [
    // Violence / hostility
    'giết', 'tự tử', 'tự sát', 'cắt tay', 'suicide', 'kill myself',
    'chửi', 'đánh nhau', 'đe dọa', 'bắt nạt', 'hành hung',
    // Drugs
    'ma túy', 'heroin', 'cocaine', 'methamphetamine',
    // Weapons
    'chế bom', 'làm bom', 'make a bomb', 'build a weapon',
];

// Build regex patterns
function buildProfanityRegex(): RegExp {
    const allTerms = [...VI_PROFANITY, ...EN_PROFANITY];
    const pattern = allTerms
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    return new RegExp(`(${pattern})`, 'gi');
}

function buildHarmfulTopicRegex(): RegExp {
    const pattern = HARMFUL_TOPICS
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    return new RegExp(`(${pattern})`, 'gi');
}

const PROFANITY_RE = buildProfanityRegex();
const HARMFUL_RE = buildHarmfulTopicRegex();

// PII patterns
const PHONE_RE = /\b(0\d{9,10})\b/g;                      // Vietnamese phone: 0xxx xxx xxxx
const EMAIL_RE = /\b[\w.-]+@[\w.-]+\.\w{2,}\b/gi;
const CCCD_RE = /\b(\d{12})\b/g;                           // Citizen ID: 12 digits

export class ContentFilterService {

    /**
     * Check text for profanity, PII, and harmful topics.
     * Returns { safe: true } if clean, or { safe: false, reason, category, redactedText } if flagged.
     */
    filterContent(text: string): FilterResult {
        if (!text || text.trim().length === 0) {
            return { safe: true };
        }

        // 1. Check profanity
        PROFANITY_RE.lastIndex = 0;
        if (PROFANITY_RE.test(text)) {
            return {
                safe: false,
                reason: 'Nội dung chứa ngôn ngữ không phù hợp.',
                category: 'profanity',
            };
        }

        // 2. Check harmful topics
        HARMFUL_RE.lastIndex = 0;
        if (HARMFUL_RE.test(text)) {
            return {
                safe: false,
                reason: 'Nội dung chứa chủ đề không phù hợp cho môi trường học tập.',
                category: 'harmful_topic',
            };
        }

        // 3. Check & redact PII
        const hasPII = PHONE_RE.test(text) || EMAIL_RE.test(text) || CCCD_RE.test(text);
        if (hasPII) {
            // Reset regex state
            PHONE_RE.lastIndex = 0;
            EMAIL_RE.lastIndex = 0;
            CCCD_RE.lastIndex = 0;
            const redacted = text
                .replace(PHONE_RE, '[SĐT]')
                .replace(EMAIL_RE, '[EMAIL]')
                .replace(CCCD_RE, '[CCCD]');
            return {
                safe: false,
                reason: 'Nội dung chứa thông tin cá nhân. Đã được ẩn để bảo vệ quyền riêng tư.',
                category: 'pii',
                redactedText: redacted,
            };
        }

        return { safe: true };
    }

    /**
     * Redact PII from text without blocking. Useful for output filtering
     * where we want to allow the content but strip sensitive data.
     */
    redactPII(text: string): string {
        if (!text) return text;
        PHONE_RE.lastIndex = 0;
        EMAIL_RE.lastIndex = 0;
        CCCD_RE.lastIndex = 0;
        return text
            .replace(PHONE_RE, '[SĐT]')
            .replace(EMAIL_RE, '[EMAIL]')
            .replace(CCCD_RE, '[CCCD]');
    }
}
