import { config } from '../config/env';
import { GoogleGenAI } from '@google/genai';
import { PromptService } from '../services/prompt.service';

const genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });

export interface MentorChatResponse {
    reply: string;
    suggested_adjustments: {
        difficulty: 'easier' | 'same' | 'harder';
        focus: 'none' | 'vocabulary' | 'grammar' | 'fluency' | 'emotion';
    };
}

export class MentorAgent {
    private modelName = 'gemini-2.0-flash';
    private promptService: PromptService;

    constructor() {
        this.promptService = new PromptService();
    }

    /**
     * Responds to the user's message as Mentor Ni.
     */
    public async chat(
        scenario: any,
        evaluationReport: any,
        userMessage: string,
        conversationHistory: { role: string, content: string }[]
    ): Promise<MentorChatResponse> {
        try {
            const systemPrompt = this.promptService.getMentorSystemPrompt();
            const context = `
Context:
Scenario: ${JSON.stringify(scenario)}
Evaluation Report: ${JSON.stringify(evaluationReport)}

User Message: "${userMessage}"
            `;

            const messages = conversationHistory.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

            messages.push({ role: "user", parts: [{ text: context }] });

            const response = await genAI.models.generateContent({
                model: this.modelName,
                contents: messages,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json",
                    temperature: 0.7,
                }
            });

            const jsonStr = response.text || "{}";
            const parsed = JSON.parse(jsonStr);
            return parsed;
        } catch (error) {
            console.error("[MentorAgent] Chat error:", error);
            throw error;
        }
    }
}
