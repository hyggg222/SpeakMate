import { PromptService } from '../services/prompt.service';
import { getGenAI, isRateLimited, switchToFallback, GEMINI_MODEL, SAFETY_SETTINGS } from '../config/genai';
import type { FeedbackAnalysis, RealWorldEvaluation, RealWorldMetrics } from '../contracts/data.contracts';

export interface MentorChatResponse {
    reply: string;
    suggested_adjustments: {
        difficulty: 'easier' | 'same' | 'harder';
        focus: 'none' | 'vocabulary' | 'grammar' | 'fluency' | 'emotion';
    };
}

export interface StoryChatMessage {
    role: 'user' | 'mentor';
    content: string;
    fieldTargeted?: string | null;
}

export interface StoryChatResponse {
    chatMessage: string;
    fieldTargeted: string | null;
}

export interface GeneralChatResponse {
    reply: string;
    intent: 'query' | 'action' | 'support';
    actionTaken?: { type: string; label: string; href: string } | null;
    dataCards?: {
        stories?: any[];
        challenges?: any[];
        progress?: any;
    } | null;
}

export class MentorAgent {
    private modelName = GEMINI_MODEL;
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
        conversationHistory: { role: string, content: string }[],
        language = 'vi'
    ): Promise<MentorChatResponse> {
        try {
            const langInstr = language === 'en'
                ? '\n\nIMPORTANT: You MUST respond entirely in English. Do not use Vietnamese.'
                : '\n\nIMPORTANT: Phản hồi hoàn toàn bằng tiếng Việt.';
            const systemPrompt = this.promptService.getMentorSystemPrompt() + langInstr;
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

            const response = await getGenAI().models.generateContent({
                model: this.modelName,
                contents: messages,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json",
                    temperature: 0.7,
                    safetySettings: SAFETY_SETTINGS,
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

    /**
     * Generates Ni's summary comment after evaluation.
     */
    public async generateEvalComment(
        evalReport: any,
        storyCoverage?: any[],
        streak?: number,
        previousScore?: number,
        language = 'vi'
    ): Promise<string> {
        const maxAttempts = 2;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const coverageSummary = storyCoverage && storyCoverage.length > 0
                    ? storyCoverage.map((c: any) => `Story "${c.title || 'N/A'}": coverage ${c.coverageScore}%`).join('. ')
                    : 'Không có Story Bank coverage.';

                const context = `
Báo cáo Analyst:
- Điểm tổng: ${evalReport.goalProgress || 0}%
- Ngôn ngữ: ${evalReport.language?.score || 0}/100
- Nội dung: ${evalReport.content?.score || 0}/100
- Cảm xúc: ${evalReport.emotion?.score || 0}/100
- Feedback: ${evalReport.overallFeedback || ''}

Story Bank Coverage: ${coverageSummary}
Streak hiện tại: ${streak ?? 0} tuần
${previousScore != null ? `Điểm phiên trước: ${previousScore}%` : 'Đây là phiên đầu tiên.'}
`;

                const langInstr = language === 'en'
                    ? '\n\nIMPORTANT: You MUST respond entirely in English. Do not use Vietnamese.'
                    : '\n\nIMPORTANT: Phản hồi hoàn toàn bằng tiếng Việt.';
                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: context }] }],
                    config: {
                        systemInstruction: this.promptService.getEvalCommentPrompt() + langInstr,
                        temperature: 0.8,
                        safetySettings: SAFETY_SETTINGS,
                    }
                });

                return (response.text || '').trim();
            } catch (error) {
                lastError = error;
                console.error(`[MentorAgent] generateEvalComment attempt ${attempt}/${maxAttempts} failed:`, error);
                if (isRateLimited(error)) switchToFallback();
                if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000));
            }
        }
        // Fallback comment if API fails
        return 'Phiên luyện tập vừa rồi có nhiều điểm hay đó. Xem chi tiết ở trên và thử áp dụng vào thực tế nhé!';
    }

    /**
     * Responds as Mentor Ni in story creation chat.
     * Asks one question at a time targeting missing framework fields.
     */
    public async chatForStory(
        framework: string,
        initialInput: string,
        chatMessages: StoryChatMessage[],
        inputMethod: string,
        language = 'vi'
    ): Promise<StoryChatResponse> {
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const langInstr = language === 'en'
                    ? '\n\nIMPORTANT: You MUST respond entirely in English. Do not use Vietnamese.'
                    : '\n\nIMPORTANT: Phản hồi hoàn toàn bằng tiếng Việt.';
                const systemPrompt = this.promptService.getStoryChatSystemPrompt(framework, initialInput) + langInstr;

                // Build multi-turn conversation
                const messages: { role: string; parts: { text: string }[] }[] = [];

                if (chatMessages.length === 0) {
                    // First turn: send initial input as user message to get Ni's greeting + first question
                    messages.push({
                        role: 'user',
                        parts: [{ text: `Input gốc (${inputMethod}): ${initialInput}` }]
                    });
                } else {
                    // Include initial input context in first message
                    messages.push({
                        role: 'user',
                        parts: [{ text: `Input gốc (${inputMethod}): ${initialInput}` }]
                    });

                    // Add chat history
                    for (const msg of chatMessages) {
                        messages.push({
                            role: msg.role === 'user' ? 'user' : 'model',
                            parts: [{ text: msg.content }]
                        });
                    }
                }

                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: messages,
                    config: {
                        systemInstruction: systemPrompt,
                        responseMimeType: 'application/json',
                        temperature: 0.7,
                        safetySettings: SAFETY_SETTINGS,
                    }
                });

                const jsonStr = response.text || '{}';
                const parsed: StoryChatResponse = JSON.parse(jsonStr);

                // Ensure valid response shape
                return {
                    chatMessage: parsed.chatMessage || 'Xin lỗi, Ni chưa hiểu. Bạn nói lại nhé?',
                    fieldTargeted: parsed.fieldTargeted || null,
                };
            } catch (error) {
                lastError = error;
                console.error(`[MentorAgent] chatForStory attempt ${attempt}/${maxAttempts} failed:`, (error as any)?.message || error);
                if (isRateLimited(error)) switchToFallback();
                if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
        throw lastError;
    }

    /**
     * Analyzes challenge feedback and returns personalized Ni comment + dialogue analysis.
     */
    public async analyzeFeedback(
        challenge: { title: string; description: string; sourceWeakness?: string; difficulty: number },
        feedbackData: {
            completed: boolean;
            situation?: string;
            emotionBefore?: string;
            emotionAfter?: string;
            whatUserSaid?: string;
            othersReaction?: string;
            whatWorked?: string;
            whatStuck?: string;
        },
        voiceTranscript?: string | null,
        prevWeakness?: string | null,
        language = 'vi'
    ): Promise<FeedbackAnalysis> {
        const maxAttempts = 2;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const context = `
Challenge:
- Tiêu đề: ${challenge.title}
- Mô tả: ${challenge.description}
- Nguồn điểm yếu: ${challenge.sourceWeakness || 'Không rõ'}
- Độ khó: ${challenge.difficulty}/5

Feedback từ user:
- Đã thực hiện: ${feedbackData.completed ? 'Có' : 'Chưa'}
- Diễn biến: ${feedbackData.situation || 'Không có'}
- Cảm xúc trước: ${feedbackData.emotionBefore || 'Không có'}
- Cảm xúc sau: ${feedbackData.emotionAfter || 'Không có'}
- Bạn đã nói gì: ${feedbackData.whatUserSaid || 'Không có'}
- Người kia phản ứng sao: ${feedbackData.othersReaction || 'Không có'}
- Chỗ suôn sẻ: ${feedbackData.whatWorked || 'Không có'}
- Chỗ bị kẹt: ${feedbackData.whatStuck || 'Không có'}
${voiceTranscript ? `\nVoice transcript: ${voiceTranscript}` : ''}
${prevWeakness ? `\nĐiểm yếu từ gym gần nhất: ${prevWeakness}` : ''}
`;
                const langInstr = language === 'en'
                    ? '\n\nIMPORTANT: You MUST respond entirely in English. Do not use Vietnamese.'
                    : '\n\nIMPORTANT: Phản hồi hoàn toàn bằng tiếng Việt.';
                const systemPrompt = this.promptService.getFeedbackAnalysisPrompt() + langInstr;

                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: context }] }],
                    config: {
                        systemInstruction: systemPrompt,
                        responseMimeType: 'application/json',
                        temperature: 0.75,
                        safetySettings: SAFETY_SETTINGS,
                    }
                });

                const raw = response.text || '{}';
                let parsed: any;
                try {
                    parsed = JSON.parse(raw);
                } catch {
                    parsed = {};
                }

                const xpEarned = feedbackData.completed ? 150 : 75;
                return {
                    comparisonWithGym: parsed.niComment || '',
                    progressNote: parsed.dialogueAnalysis || '',
                    newStoryCandidate: parsed.newStoryCandidate === true,
                    newStorySuggestion: parsed.newStorySuggestion || undefined,
                    nextDifficulty: Math.min(5, Math.max(1, parsed.nextDifficulty || challenge.difficulty)),
                    nextChallengeHint: parsed.nextChallengeHint || 'Tiếp tục luyện tập nhé!',
                    xpEarned: parsed.xpEarned || xpEarned,
                    niComment: parsed.niComment || undefined,
                    dialogueAnalysis: parsed.dialogueAnalysis || null,
                    betterPhrasing: parsed.betterPhrasing || null,
                };
            } catch (error) {
                lastError = error;
                console.error(`[MentorAgent] analyzeFeedback attempt ${attempt}/${maxAttempts} failed:`, error);
                if (isRateLimited(error)) switchToFallback();
                if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000));
            }
        }

        // Fallback
        const xp = feedbackData.completed ? 150 : 75;
        return {
            comparisonWithGym: feedbackData.completed
                ? 'Bạn đã dám thử và hoàn thành! Đó là bước tiến quan trọng nhất.'
                : 'Dám thử là đã giỏi rồi. Lần sau bạn sẽ làm được thôi!',
            progressNote: '',
            newStoryCandidate: false,
            nextDifficulty: challenge.difficulty,
            nextChallengeHint: 'Tiếp tục luyện tập để cải thiện nhé!',
            xpEarned: xp,
            niComment: feedbackData.completed
                ? 'Bạn đã dám thử và hoàn thành! Đó là bước tiến quan trọng nhất.'
                : 'Dám thử là đã giỏi rồi. Lần sau bạn sẽ làm được thôi!',
            dialogueAnalysis: null,
            betterPhrasing: null,
        };
    }

    /**
     * Full real-world feedback analysis — returns RealWorldEvaluation.
     * Separate from analyzeFeedback() which handles challenge-only feedback.
     * Uses realworld_feedback_analysis.txt prompt.
     */
    public async analyzeFeedbackFull(
        challenge: { title: string; description: string; difficulty: number; sourceWeakness?: string } | null,
        feedbackData: {
            completed: boolean;
            situation?: string;
            emotionBefore?: string;
            emotionAfter?: string;
            whatUserSaid?: string;
            othersReaction?: string;
            whatWorked?: string;
            whatStuck?: string;
        },
        transcript: string | null,
        previousMetrics?: RealWorldMetrics | null,
        language = 'vi'
    ): Promise<RealWorldEvaluation> {
        const maxAttempts = 2;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const context = `
${transcript ? `Transcript (bài kể lại hoặc ghi âm):\n${transcript}\n` : 'Transcript: null (user chỉ điền text form)\n'}
Form data:
- Diễn biến: ${feedbackData.situation || 'Không có'}
- Cảm xúc trước: ${feedbackData.emotionBefore || 'Không có'}
- Cảm xúc sau: ${feedbackData.emotionAfter || 'Không có'}
- Bạn đã nói gì: ${feedbackData.whatUserSaid || 'Không có'}
- Người kia phản ứng: ${feedbackData.othersReaction || 'Không có'}
- Suôn sẻ: ${feedbackData.whatWorked || 'Không có'}
- Kẹt: ${feedbackData.whatStuck || 'Không có'}

${challenge ? `Challenge context:\n- Tiêu đề: ${challenge.title}\n- Mô tả: ${challenge.description}\n- Điểm yếu: ${challenge.sourceWeakness || 'N/A'}\n` : 'Challenge context: null (free share)\n'}
${previousMetrics ? `5 lượt thực tế gần nhất:\n- coherenceScore trung bình: ${previousMetrics.coherenceScore}\n- jargonCount trung bình: ${previousMetrics.jargonCount}\n- fillerPerMinute trung bình: ${previousMetrics.fillerPerMinute}` : 'previousMetrics: null (lần đầu tiên)'}

completed: ${feedbackData.completed}
`;
                const langInstrFull = language === 'en'
                    ? '\n\nIMPORTANT: You MUST respond entirely in English. Do not use Vietnamese.'
                    : '\n\nIMPORTANT: Phản hồi hoàn toàn bằng tiếng Việt.';
                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: context }] }],
                    config: {
                        systemInstruction: this.promptService.getRealWorldFeedbackPrompt() + langInstrFull,
                        responseMimeType: 'application/json',
                        temperature: 0.7,
                        safetySettings: SAFETY_SETTINGS,
                    }
                });

                const raw = response.text || '{}';
                let parsed: any;
                try { parsed = JSON.parse(raw); } catch { parsed = {}; }

                const xp = feedbackData.completed ? 150 : (challenge ? 75 : 50);
                return {
                    hasAudio: !!transcript,
                    transcript: transcript || undefined,
                    expression: parsed.expression || null,
                    psychology: {
                        emotionBefore: feedbackData.emotionBefore,
                        emotionAfter: feedbackData.emotionAfter,
                        trend: parsed.psychology?.trend || 'unknown',
                        trendNote: parsed.psychology?.trendNote || 'Không có đủ dữ liệu',
                    },
                    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
                    niComment: parsed.niComment || 'Cảm ơn bạn đã chia sẻ! Mỗi trải nghiệm là một bài học quý.',
                    dialogueAnalysis: parsed.dialogueAnalysis || null,
                    betterPhrasing: parsed.betterPhrasing || null,
                    newStoryCandidate: parsed.newStoryCandidate === true,
                    newStorySuggestion: parsed.newStorySuggestion || undefined,
                    nextDifficulty: Math.min(5, Math.max(1, parsed.nextDifficulty || (challenge?.difficulty ?? 3))),
                    nextChallengeHint: parsed.nextChallengeHint || 'Tiếp tục luyện tập nhé!',
                    xpEarned: parsed.xpEarned || xp,
                    sourceType: 'realworld',
                    comparisonWithPrevious: parsed.comparisonWithPrevious || undefined,
                };
            } catch (error) {
                lastError = error;
                console.error(`[MentorAgent] analyzeFeedbackFull attempt ${attempt}/${maxAttempts} failed:`, error);
                if (isRateLimited(error)) switchToFallback();
                if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000));
            }
        }

        // Fallback
        return {
            hasAudio: !!transcript,
            transcript: transcript || undefined,
            expression: null,
            psychology: {
                emotionBefore: feedbackData.emotionBefore,
                emotionAfter: feedbackData.emotionAfter,
                trend: 'unknown',
                trendNote: 'Không có đủ dữ liệu để phân tích',
            },
            strengths: ['Bạn đã dám chia sẻ trải nghiệm thực tế'],
            improvements: ['Tiếp tục luyện tập để cải thiện'],
            niComment: feedbackData.completed
                ? 'Bạn đã dám thử và hoàn thành — đó là điều quan trọng nhất!'
                : 'Dám thử là đã giỏi rồi. Lần sau bạn sẽ tự tin hơn!',
            dialogueAnalysis: null,
            betterPhrasing: null,
            newStoryCandidate: false,
            nextDifficulty: challenge?.difficulty ?? 3,
            nextChallengeHint: 'Tiếp tục luyện tập để cải thiện nhé!',
            xpEarned: feedbackData.completed ? 150 : (challenge ? 75 : 50),
            sourceType: 'realworld',
        };
    }

    /**
     * General chat with Mentor Ni — natively uses Gemini.
     * Returns structured response with reply, intent, actionTaken, dataCards.
     */
    public async generalChat(
        userMessage: string,
        conversationHistory: { role: string; content: string }[],
        userContext: string,
        language = 'vi'
    ): Promise<GeneralChatResponse> {
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const langInstrGeneral = language === 'en'
                    ? '\n\nIMPORTANT: You MUST respond entirely in English. Do not use Vietnamese.'
                    : '\n\nIMPORTANT: Phản hồi hoàn toàn bằng tiếng Việt.';
                const systemPrompt = this.promptService.getMentorChatSystemPrompt(userContext) + langInstrGeneral;

                const messages = [
                    ...conversationHistory.map(m => ({
                        role: m.role === 'user' ? 'user' as const : 'model' as const,
                        parts: [{ text: m.content }],
                    })),
                    { role: 'user' as const, parts: [{ text: userMessage }] },
                ];

                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: messages,
                    config: {
                        systemInstruction: systemPrompt,
                        responseMimeType: 'application/json',
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                        safetySettings: SAFETY_SETTINGS,
                    }
                });

                const rawResponse = response.text || "{}";

                // Parse JSON response
                let parsed: GeneralChatResponse;
                try {
                    parsed = JSON.parse(rawResponse);
                } catch {
                    // If JSON parse fails, treat raw text as reply
                    parsed = {
                        reply: rawResponse,
                        intent: 'support',
                        actionTaken: null,
                        dataCards: null,
                    };
                }

                return {
                    reply: parsed.reply || 'Mình nghe rồi! Bạn cứ hỏi thêm nhé.',
                    intent: parsed.intent || 'support',
                    actionTaken: parsed.actionTaken || null,
                    dataCards: parsed.dataCards || null,
                };
            } catch (error) {
                lastError = error;
                console.error(`[MentorAgent] generalChat attempt ${attempt}/${maxAttempts} failed:`, (error as any)?.message || error);
                if (isRateLimited(error)) switchToFallback();
                if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }

        // Fallback if all attempts fail
        return {
            reply: 'Xin lỗi, Ni đang gặp trục trặc. Bạn thử lại sau nhé!',
            intent: 'support',
            actionTaken: null,
            dataCards: null,
        };
    }
}
