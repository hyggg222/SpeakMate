import { config } from '../config/env';
import { GoogleGenAI } from '@google/genai';
import { EvaluationRubric } from '../contracts/data.contracts';

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

export class AnalystAgent {
    private modelName = 'gemini-2.0-flash';

    private getSystemPrompt(rubric: EvaluationRubric) {
        return `
You are a supportive, friendly communication mentor (Safe Mode). Analyze the user's performance based on the full transcript.
Focus heavily on encouraging the user. Do not be overly harsh on grammar or content logic. Praise their confidence and flow.
Output ONLY a valid JSON object matching this structure EXACTLY (do not include markdown codeblocks):

{
  "overallScore": 8.5,
  "overallFeedback": "Ngắn gọn về hiệu suất chung (Tiếng Việt).",
  "radarData": [
    { "subject": "Fluency\\nĐộ trôi chảy", "A": 85, "fullMark": 100 }
  ],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "improvements": ["Điểm yếu 1", "Điểm yếu 2"],
  "turnHighlights": ["Lượt 1 - Giải thích...", "Lượt 2 - Giải thích..."]
}

Limit radarData categories based on this rubric: ${JSON.stringify(rubric.categories)}.
Always respond in Vietnamese syntax inside the JSON string properties.
`;
    }

    /**
     * Evaluates the entire session transcript based on the provided rubric.
     *
     * @param {EvaluationRubric} rubric - The scoring categories and logic.
     * @param {string} sessionAudioPath - Used for accessing full-session audio if needed for pacing analysis.
     * @param {string} transcript - The combined transcript of the entire session.
     * @returns {Promise<any>} A structured JSON evaluation report.
     */
    public async evaluateSession(rubric: EvaluationRubric, sessionAudioPath: string, transcript: string): Promise<any> {
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
                    systemInstruction: this.getSystemPrompt(rubric),
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
