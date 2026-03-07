import { config } from '../config/env';
import { getGenAI, GEMINI_MODEL } from '../config/genai';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * GemmaService — HTTP client for the Gemma vLLM endpoint on Modal.
 * Falls back to Gemini if Gemma is unavailable.
 */
export class GemmaService {
    private gemmaUrl: string;
    private timeout = 10000;

    constructor() {
        this.gemmaUrl = config.gemmaApiUrl || '';
    }

    /**
     * Send a chat request to Gemma vLLM or fallback to Gemini.
     */
    async chat(
        systemPrompt: string,
        messages: { role: string; content: string }[],
        options?: { temperature?: number; maxTokens?: number }
    ): Promise<string> {
        const temperature = options?.temperature ?? 0.7;
        const maxTokens = options?.maxTokens ?? 512;

        // Try Gemma first if URL is configured
        if (this.gemmaUrl) {
            try {
                return await this.callGemma(systemPrompt, messages, temperature, maxTokens);
            } catch (error) {
                console.warn('[GemmaService] Gemma unavailable, falling back to Gemini:', (error as any)?.message);
            }
        }

        // Fallback to Gemini
        return await this.callGemini(systemPrompt, messages, temperature, maxTokens);
    }

    private async callGemma(
        systemPrompt: string,
        messages: { role: string; content: string }[],
        temperature: number,
        maxTokens: number
    ): Promise<string> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(this.gemmaUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_prompt: systemPrompt,
                    messages: messages.map(m => ({
                        role: m.role === 'mentor' ? 'assistant' : m.role,
                        content: m.content,
                    })),
                    temperature,
                    max_tokens: maxTokens,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Gemma API error: ${response.status}`);
            }

            const data = await response.json();
            return data.reply || '';
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async callGemini(
        systemPrompt: string,
        messages: { role: string; content: string }[],
        temperature: number,
        maxTokens: number
    ): Promise<string> {
        const genaiMessages = messages.map(m => ({
            role: m.role === 'user' ? 'user' as const : 'model' as const,
            parts: [{ text: m.content }],
        }));

        const response = await getGenAI().models.generateContent({
            model: GEMINI_MODEL,
            contents: genaiMessages,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                temperature,
                maxOutputTokens: maxTokens,
            },
        });

        return response.text || '{}';
    }
}
