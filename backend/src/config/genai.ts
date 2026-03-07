import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { config } from './env';

const HTTP_OPTIONS = { timeout: 30000 };

export const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Default safety settings for all Gemini LLM calls.
 * BLOCK_MEDIUM_AND_ABOVE for most categories; LOW for sexually explicit.
 */
export const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const primaryClient = new GoogleGenAI({ apiKey: config.geminiApiKey, httpOptions: HTTP_OPTIONS });
const fallbackClient = config.geminiApiKeyFallback
    ? new GoogleGenAI({ apiKey: config.geminiApiKeyFallback, httpOptions: HTTP_OPTIONS })
    : null;

let usingFallback = false;

/**
 * Returns the active GenAI client.
 * Automatically switches to fallback on 429 rate limit.
 */
export function getGenAI(): GoogleGenAI {
    return (usingFallback && fallbackClient) ? fallbackClient : primaryClient;
}

/**
 * Call this when a 429 is detected. Switches to fallback key if available.
 * Returns true if fallback is available and was activated.
 */
export function switchToFallback(): boolean {
    if (fallbackClient && !usingFallback) {
        usingFallback = true;
        console.log('[GenAI] Switched to fallback API key due to rate limit');
        // Auto-reset to primary after 60s
        setTimeout(() => {
            usingFallback = false;
            console.log('[GenAI] Reset to primary API key');
        }, 60_000);
        return true;
    }
    return false;
}

/**
 * Check if an error is a 429 rate limit, and if so, switch to fallback.
 */
export function isRateLimited(error: any): boolean {
    return error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
}
