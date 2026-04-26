/**
 * Strips bracketed placeholders like [tên của bạn], [địa điểm] from LLM output.
 * Optionally replaces name placeholders with a real name, otherwise falls back to "bạn".
 */
export function sanitizePlaceholders(text: string, userName?: string): string {
    const name = userName || 'bạn';
    let result = text.replace(/\[(?:tên của bạn|tên bạn|tên người dùng|your name|tên|name|họ tên|user name|người dùng)[^\]]*\]/gi, name);
    result = result.replace(/\[[^\]]{1,40}\]/g, '');
    return result.replace(/\s{2,}/g, ' ').trim();
}

/** Recursively sanitizes all string values in an object or array. */
export function sanitizeObj<T>(obj: T): T {
    if (typeof obj === 'string') return sanitizePlaceholders(obj) as unknown as T;
    if (Array.isArray(obj)) return obj.map(sanitizeObj) as unknown as T;
    if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const key of Object.keys(obj as object)) {
            result[key] = sanitizeObj((obj as any)[key]);
        }
        return result as T;
    }
    return obj;
}
