/**
 * Status colors for story entries. Labels are resolved via i18n keys
 * `storybank.status.{draft|ready|battle}` at render time.
 */
export const STATUS_LABELS: Record<string, { labelKey: string; color: string }> = {
    draft: { labelKey: "storybank.status.draft", color: "#94a3b8" },
    ready: { labelKey: "storybank.status.ready", color: "#10b981" },
    "battle-tested": { labelKey: "storybank.status.battle", color: "#f59e0b" },
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

/**
 * Field definitions per framework. `labelKey` resolves to a translated
 * label via t(`storybank.field.${key}`).
 */
export const STRUCTURED_FIELDS: Record<string, { key: string; labelKey: string; emoji: string }[]> = {
    STAR: [
        { key: "situation", labelKey: "storybank.field.situation", emoji: "📍" },
        { key: "task", labelKey: "storybank.field.task", emoji: "🎯" },
        { key: "action", labelKey: "storybank.field.action", emoji: "⚡" },
        { key: "result", labelKey: "storybank.field.result", emoji: "🏆" },
    ],
    PREP: [
        { key: "point", labelKey: "storybank.field.point", emoji: "💡" },
        { key: "reason", labelKey: "storybank.field.reason", emoji: "📋" },
        { key: "example", labelKey: "storybank.field.example", emoji: "📖" },
        { key: "point2", labelKey: "storybank.field.point2", emoji: "🎯" },
    ],
    CAR: [
        { key: "challenge", labelKey: "storybank.field.challenge", emoji: "🔥" },
        { key: "action", labelKey: "storybank.field.action", emoji: "⚡" },
        { key: "result", labelKey: "storybank.field.result", emoji: "🏆" },
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
