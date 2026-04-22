export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: "Bản nháp", color: "#94a3b8" },
    ready: { label: "Sẵn sàng", color: "#10b981" },
    "battle-tested": { label: "Thực chiến", color: "#f59e0b" },
};

export const FRAMEWORK_COLORS: Record<string, string> = {
    STAR: "#3b82f6",
    PREP: "#8b5cf6",
    CAR: "#ec4899",
};

export const FRAMEWORK_OPTIONS = [
    { value: "STAR", label: "STAR", description: "Situation, Task, Action, Result" },
    { value: "PREP", label: "PREP", description: "Point, Reason, Example, Point" },
    { value: "CAR", label: "CAR", description: "Challenge, Action, Result" },
] as const;

export const STRUCTURED_FIELDS: Record<string, { key: string; label: string; emoji: string }[]> = {
    STAR: [
        { key: "situation", label: "Situation — Bối cảnh", emoji: "📍" },
        { key: "task", label: "Task — Nhiệm vụ", emoji: "🎯" },
        { key: "action", label: "Action — Hành động", emoji: "⚡" },
        { key: "result", label: "Result — Kết quả", emoji: "🏆" },
    ],
    PREP: [
        { key: "point", label: "Point — Luận điểm", emoji: "💡" },
        { key: "reason", label: "Reason — Lý do", emoji: "📋" },
        { key: "example", label: "Example — Ví dụ", emoji: "📖" },
        { key: "point2", label: "Point — Kết luận", emoji: "🎯" },
    ],
    CAR: [
        { key: "challenge", label: "Challenge — Thách thức", emoji: "🔥" },
        { key: "action", label: "Action — Hành động", emoji: "⚡" },
        { key: "result", label: "Result — Kết quả", emoji: "🏆" },
    ],
};

/** Estimate speaking duration from word count (~2.5 words/sec for Vietnamese) */
export function estimateDuration(text: string): number {
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(10, Math.round(words / 2.5));
}

/** Count words in text */
export function wordCount(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
}

export const MAX_FULLSCRIPT_WORDS = 200;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;
