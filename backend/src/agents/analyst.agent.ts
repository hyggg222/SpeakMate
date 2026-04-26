import { EvaluationRubric, EvaluationReport } from '../contracts/data.contracts';
import { getGenAI, isRateLimited, switchToFallback, GEMINI_MODEL, SAFETY_SETTINGS } from '../config/genai';
import { sanitizeObj } from '../utils/sanitize';
import { PromptService } from '../services/prompt.service';

export class AnalystAgent {
    private modelName = GEMINI_MODEL;
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
    /**
     * Compares a Story Bank entry with actual practice transcript.
     * Returns coverage score, missed/added parts, and feedback.
     */
    public async compareWithStoryBank(storyEntry: any, transcript: string): Promise<any> {
        const maxAttempts = 3;
        let lastError: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const promptText = `
(A) Story Bank Entry đã chuẩn bị:
Title: ${storyEntry.title}
Framework: ${storyEntry.framework}
Structured:
- Situation: ${storyEntry.structured?.situation || storyEntry.structured?.situation || ''}
- Task: ${storyEntry.structured?.task || ''}
- Action: ${storyEntry.structured?.action || ''}
- Result: ${storyEntry.structured?.result || ''}
Full Script: ${storyEntry.full_script || storyEntry.fullScript || ''}

(B) Transcript thực tế từ phiên luyện tập:
${transcript}
`;
                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: {
                        systemInstruction: this.promptService.getStoryBankAnalystSystemPrompt(),
                        responseMimeType: 'application/json',
                        temperature: 0.3,
                        safetySettings: SAFETY_SETTINGS,
                    },
                });
                const jsonStr = response.text || '{}';
                return sanitizeObj(JSON.parse(jsonStr));
            } catch (error) {
                lastError = error;
                console.error(`[AnalystAgent] compareWithStoryBank attempt ${attempt}/${maxAttempts} failed:`, error);
                if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
        throw lastError;
    }

    public async evaluateSession(rubric: EvaluationRubric, sessionAudioPath: string, transcript: string, language = 'vi'): Promise<EvaluationReport> {
        const maxAttempts = 3;
        let lastError: unknown;
        const langInstr = language === 'en'
            ? '\n\nIMPORTANT: You MUST respond entirely in English. Do not use Vietnamese.'
            : '\n\nIMPORTANT: Phản hồi hoàn toàn bằng tiếng Việt.';

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const promptText = `
Here is the Full Transcript of the session:
${transcript}

Analysis Request: Review the transcript and return the JSON report.
Rubric categories: ${JSON.stringify(rubric.categories || [])}
`;
                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: {
                        systemInstruction: this.promptService.getEvaluationSystemPrompt() + langInstr,
                        responseMimeType: 'application/json',
                        temperature: 0.2,
                        safetySettings: SAFETY_SETTINGS,
                    }
                });

                const text = response.text || '{}';
                const report = sanitizeObj(JSON.parse(text)) as EvaluationReport;
                return this.validateReport(report);
            } catch (error) {
                lastError = error;
                console.error(`[AnalystAgent] evaluateSession attempt ${attempt}/${maxAttempts} failed:`, error);
                if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
        throw lastError;
    }

    /**
     * Evaluates a real-world conversation transcript (not a practice session).
     * Uses a different prompt adapted for real conversations.
     */
    public async evaluateRealWorldConversation(transcript: string, contextDescription: string): Promise<EvaluationReport> {
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const promptText = `
Ngữ cảnh cuộc hội thoại: ${contextDescription}

Transcript:
${transcript}

Hãy đánh giá cuộc hội thoại thực tế này.
`;
                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: {
                        systemInstruction: this.promptService.getRealWorldEvaluationPrompt(),
                        responseMimeType: 'application/json',
                        temperature: 0.2,
                        safetySettings: SAFETY_SETTINGS,
                    }
                });

                const text = response.text || '{}';
                const report = sanitizeObj(JSON.parse(text)) as EvaluationReport;
                return this.validateReport(report);
            } catch (error) {
                lastError = error;
                console.error(`[AnalystAgent] evaluateRealWorld attempt ${attempt}/${maxAttempts} failed:`, error);
                if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
        throw lastError;
    }

    /**
     * Validates and fills defaults for evaluation report fields.
     * Ensures sub-scores and proficiencyLevel always exist.
     */
    private validateReport(report: EvaluationReport): EvaluationReport {
        const DEFAULT_SUB = 50;
        const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

        const ensureSubScores = (stage: any, keys: string[]) => {
            if (!stage) return;
            if (!stage.subScores || typeof stage.subScores !== 'object') {
                stage.subScores = {};
            }
            for (const key of keys) {
                if (typeof stage.subScores[key] !== 'number' || stage.subScores[key] < 0 || stage.subScores[key] > 100) {
                    stage.subScores[key] = stage.score ?? DEFAULT_SUB;
                }
            }
        };

        ensureSubScores(report.language, ['vocabularyRange', 'grammarAccuracy', 'honorificUsage']);
        ensureSubScores(report.content, ['persuasion', 'clarity', 'professionalism']);
        ensureSubScores(report.emotion, ['empathy', 'confidence', 'toneControl']);

        if (!report.proficiencyLevel || !VALID_LEVELS.includes(report.proficiencyLevel)) {
            const avg = ((report.language?.score || 0) + (report.content?.score || 0) + (report.emotion?.score || 0)) / 3;
            if (avg >= 90) report.proficiencyLevel = 'C2';
            else if (avg >= 75) report.proficiencyLevel = 'C1';
            else if (avg >= 60) report.proficiencyLevel = 'B2';
            else if (avg >= 45) report.proficiencyLevel = 'B1';
            else if (avg >= 30) report.proficiencyLevel = 'A2';
            else report.proficiencyLevel = 'A1';
        }

        // Validate sessionMetrics
        if (!report.sessionMetrics || typeof report.sessionMetrics !== 'object') {
            report.sessionMetrics = {
                coherenceScore: report.content?.subScores?.clarity ?? DEFAULT_SUB,
                jargonCount: 0,
                jargonList: [],
                fillerCount: 0,
                fillerPerMinute: 0,
                fillerList: [],
            };
        } else {
            const m = report.sessionMetrics;
            if (typeof m.coherenceScore !== 'number') m.coherenceScore = DEFAULT_SUB;
            if (typeof m.jargonCount !== 'number') m.jargonCount = 0;
            if (!Array.isArray(m.jargonList)) m.jargonList = [];
            if (typeof m.fillerCount !== 'number') m.fillerCount = 0;
            if (typeof m.fillerPerMinute !== 'number') m.fillerPerMinute = 0;
            if (!Array.isArray(m.fillerList)) m.fillerList = [];
        }

        return report;
    }
}
