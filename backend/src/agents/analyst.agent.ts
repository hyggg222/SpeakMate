import { config } from '../config/env';
import { GoogleGenAI } from '@google/genai';
import { EvaluationRubric, EvaluationReport } from '../contracts/data.contracts';

/**
 * Strips bracketed placeholders from LLM output.
 */
function sanitizeText(text: string): string {
    let result = text.replace(/\[(?:tên của bạn|tên bạn|your name|tên|name|họ tên)\]/gi, 'bạn');
    result = result.replace(/\[[^\]]{1,30}\]/g, '');
    return result.replace(/\s{2,}/g, ' ').trim();
}

function sanitizeObj(obj: any): any {
    if (typeof obj === 'string') return sanitizeText(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObj);
    if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const key of Object.keys(obj)) {
            result[key] = sanitizeObj(obj[key]);
        }
        return result;
    }
    return obj;
}

/**
 * AnalystAgent evaluates the user's performance after a practice session concludes.
 * It uses the Gemini 2.0 Flash model to produce structured multimodal analysis.
 */
const genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });

import { PromptService } from '../services/prompt.service';

export class AnalystAgent {
    private modelName = 'gemini-2.0-flash';
    private promptService: PromptService;

    constructor() {
        this.promptService = new PromptService();
    }

    /**
     * Evaluates the entire session transcript based on the provided rubric.
     *
     * @param {EvaluationRubric} rubric - The scoring categories and logic.
     * @param {string} sessionAudioPath - Used for accessing full-session audio if needed for pacing analysis.
     * @param {string} transcript - The combined transcript of the entire session.
     * @returns {Promise<EvaluationReport>} A structured JSON evaluation report.
     */
    public async evaluateSession(rubric: EvaluationRubric, sessionAudioPath: string, transcript: string): Promise<EvaluationReport> {
        try {
            const promptText = `
Here is the Full Transcript of the session:
${transcript}

Analysis Request: Review the transcript and return the JSON report.
`;
            const response = await genAI.models.generateContent({
                model: this.modelName,
                contents: promptText,
                config: {
                    systemInstruction: this.promptService.getEvaluationSystemPrompt() +
                        `Evaluate radarData categories strictly based on this rubric: ${JSON.stringify(rubric.categories)}.`,
                    temperature: 0.2, // Low temperature for consistent evaluation
                }
            });

            const text = response.text || '{}';
            const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            return sanitizeObj(JSON.parse(cleanJson));
        } catch (error) {
            console.error("[AnalystAgent] Session evaluation failed:", error);
            throw error;
        }
    }
}
