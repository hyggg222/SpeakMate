import { config } from '../config/env';
import { getGenAI, GEMINI_MODEL } from '../config/genai';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class LlmService {
    private modelName = GEMINI_MODEL;

    async chat(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
        try {
            console.log(`[LlmService] Calling Gemini with ${messages.length} messages...`);

            // Map messages to contents format
            const contents = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            while (contents.length > 0 && contents[0].role === 'model') {
                contents.shift();
            }

            // Enhanced call with better parameter structure for @google/genai
            const response = await getGenAI().models.generateContent({
                model: this.modelName,
                contents: contents as any,
                config: {
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    maxOutputTokens: 256,
                    temperature: 0.7,
                }
            });

            const text = response.text || '';
            console.log(`[LlmService] Gemini Success: ${text.substring(0, 30)}...`);
            return text;
        } catch (error: any) {
            console.error("[LlmService] Gemini Error:", error);
            throw new Error(`Gemini API Error: ${error.message}`);
        }
    }

    async healthCheck(): Promise<boolean> {
        return !!config.geminiApiKey;
    }
}
