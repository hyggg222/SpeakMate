import { EvaluationRubric, EvaluationReport } from '../contracts/data.contracts';
import { getGenAI, isRateLimited, switchToFallback, GEMINI_MODEL, SAFETY_SETTINGS } from '../config/genai';
import { sanitizeObj } from '../utils/sanitize';
import { PromptService, Lang } from '../services/prompt.service';

type LangParam = Lang | string;
function toLang(language?: LangParam): Lang {
    return language === 'en' ? 'en' : 'vi';
}

export class AnalystAgent {
    private modelName = GEMINI_MODEL;
    private promptService: PromptService;

    constructor() {
        this.promptService = new PromptService();
    }

    /**
     * Compares a Story Bank entry with actual practice transcript.
     * Returns coverage score, missed/added parts, and feedback.
     */
    public async compareWithStoryBank(storyEntry: any, transcript: string, language: LangParam = 'vi'): Promise<any> {
        const lang = toLang(language);
        const maxAttempts = 3;
        let lastError: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const promptText = this.promptService.buildStoryBankComparePrompt(storyEntry, transcript, lang);
                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: {
                        systemInstruction: this.promptService.getStoryBankAnalystSystemPrompt(lang),
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

    public async evaluateSession(rubric: EvaluationRubric, sessionAudioPath: string, transcript: string, language: LangParam = 'vi'): Promise<EvaluationReport> {
        const lang = toLang(language);
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const promptText = this.promptService.buildEvaluationUserPrompt(transcript, rubric, lang);
                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: {
                        systemInstruction: this.promptService.getEvaluationSystemPrompt(lang),
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
     */
    public async evaluateRealWorldConversation(transcript: string, contextDescription: string, language: LangParam = 'vi'): Promise<EvaluationReport> {
        const lang = toLang(language);
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const promptText = this.promptService.buildRealWorldEvalUserPrompt(transcript, contextDescription, lang);
                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: {
                        systemInstruction: this.promptService.getRealWorldEvaluationPrompt(lang),
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

        ensureSubScores(report.language, ['grammarAccuracy', 'vocabularyDiversity', 'expressionClarity']);
        ensureSubScores(report.content, ['goalCompletion', 'responseRelevance', 'informationDepth']);
        if (!report.fluency && (report as any).emotion) {
            report.fluency = (report as any).emotion;
            delete (report as any).emotion;
        }
        ensureSubScores(report.fluency, ['fillerControl', 'responseCoherence', 'answerCompleteness']);

        if (!report.proficiencyLevel || !VALID_LEVELS.includes(report.proficiencyLevel)) {
            const avg = ((report.language?.score || 0) + (report.content?.score || 0) + (report.fluency?.score || 0)) / 3;
            if (avg >= 90) report.proficiencyLevel = 'C2';
            else if (avg >= 75) report.proficiencyLevel = 'C1';
            else if (avg >= 60) report.proficiencyLevel = 'B2';
            else if (avg >= 45) report.proficiencyLevel = 'B1';
            else if (avg >= 30) report.proficiencyLevel = 'A2';
            else report.proficiencyLevel = 'A1';
        }

        if (!report.sessionMetrics || typeof report.sessionMetrics !== 'object') {
            report.sessionMetrics = {
                coherenceScore: report.fluency?.subScores?.responseCoherence ?? report.content?.subScores?.responseRelevance ?? DEFAULT_SUB,
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
