import { config } from '../config/env';
import { GoogleGenAI } from '@google/genai';
import { EvaluationRubric } from '../contracts/data.contracts';

// Agent 3: The Analyst uses Gemini 1.5 Pro for deep multimodal analysis (audio/text)
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
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("AnalystAgent evaluate error:", error);
            throw error;
        }
    }
}
