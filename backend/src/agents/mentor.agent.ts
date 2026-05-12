import { PromptService, Lang } from '../services/prompt.service';
import { getGenAI, isRateLimited, switchToFallback, GEMINI_MODEL, SAFETY_SETTINGS } from '../config/genai';
import type { FeedbackAnalysis, RealWorldEvaluation, RealWorldMetrics } from '../contracts/data.contracts';

type LangParam = Lang | string;
function toLang(language?: LangParam): Lang {
    return language === 'en' ? 'en' : 'vi';
}

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
        language: LangParam = 'vi'
    ): Promise<MentorChatResponse> {
        const lang = toLang(language);
        try {
            const systemPrompt = this.promptService.getMentorSystemPrompt(lang);
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
        language: LangParam = 'vi'
    ): Promise<string> {
        const lang = toLang(language);
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

                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: context }] }],
                    config: {
                        systemInstruction: this.promptService.getEvalCommentPrompt(lang),
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
        language: LangParam = 'vi'
    ): Promise<StoryChatResponse> {
        const lang = toLang(language);
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const systemPrompt = this.promptService.getStoryChatSystemPrompt(framework, initialInput, lang);

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
                const fallbackMsg = lang === 'en'
                    ? "Sorry, I didn't quite catch that. Could you say it again?"
                    : 'Xin lỗi, Ni chưa hiểu. Bạn nói lại nhé?';
                return {
                    chatMessage: parsed.chatMessage || fallbackMsg,
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
        language: LangParam = 'vi'
    ): Promise<FeedbackAnalysis> {
        const lang = toLang(language);
        const maxAttempts = 2;
        let lastError: unknown;

        const isEn = lang === 'en';
        const L = isEn ? {
            challenge: 'Challenge', title: 'Title', desc: 'Description',
            weakness: 'Source weakness', diff: 'Difficulty', userFb: 'User feedback',
            done: 'Done', yes: 'Yes', no: 'No', flow: 'What happened', emoBefore: 'Emotion before',
            emoAfter: 'Emotion after', userSaid: 'What you said', reaction: 'Their reaction',
            worked: 'What went well', stuck: 'What got stuck', none: 'N/A',
            unknown: 'Unknown', prevWeak: 'Recent gym weakness',
        } : {
            challenge: 'Challenge', title: 'Tiêu đề', desc: 'Mô tả',
            weakness: 'Nguồn điểm yếu', diff: 'Độ khó', userFb: 'Feedback từ user',
            done: 'Đã thực hiện', yes: 'Có', no: 'Chưa', flow: 'Diễn biến', emoBefore: 'Cảm xúc trước',
            emoAfter: 'Cảm xúc sau', userSaid: 'Bạn đã nói gì', reaction: 'Người kia phản ứng sao',
            worked: 'Chỗ suôn sẻ', stuck: 'Chỗ bị kẹt', none: 'Không có',
            unknown: 'Không rõ', prevWeak: 'Điểm yếu từ gym gần nhất',
        };

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const context = `
${L.challenge}:
- ${L.title}: ${challenge.title}
- ${L.desc}: ${challenge.description}
- ${L.weakness}: ${challenge.sourceWeakness || L.unknown}
- ${L.diff}: ${challenge.difficulty}/5

${L.userFb}:
- ${L.done}: ${feedbackData.completed ? L.yes : L.no}
- ${L.flow}: ${feedbackData.situation || L.none}
- ${L.emoBefore}: ${feedbackData.emotionBefore || L.none}
- ${L.emoAfter}: ${feedbackData.emotionAfter || L.none}
- ${L.userSaid}: ${feedbackData.whatUserSaid || L.none}
- ${L.reaction}: ${feedbackData.othersReaction || L.none}
- ${L.worked}: ${feedbackData.whatWorked || L.none}
- ${L.stuck}: ${feedbackData.whatStuck || L.none}
${voiceTranscript ? `\nVoice transcript: ${voiceTranscript}` : ''}
${prevWeakness ? `\n${L.prevWeak}: ${prevWeakness}` : ''}
`;
                const systemPrompt = this.promptService.getFeedbackAnalysisPrompt(lang);

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
                    nextChallengeHint: parsed.nextChallengeHint || (isEn ? 'Keep practicing!' : 'Tiếp tục luyện tập nhé!'),
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
        const completedMsg = isEn
            ? 'You dared to try and finished! That is the most important step forward.'
            : 'Bạn đã dám thử và hoàn thành! Đó là bước tiến quan trọng nhất.';
        const triedMsg = isEn
            ? 'Just daring to try is already a win. You will nail it next time!'
            : 'Dám thử là đã giỏi rồi. Lần sau bạn sẽ làm được thôi!';
        return {
            comparisonWithGym: feedbackData.completed ? completedMsg : triedMsg,
            progressNote: '',
            newStoryCandidate: false,
            nextDifficulty: challenge.difficulty,
            nextChallengeHint: isEn ? 'Keep practicing to improve!' : 'Tiếp tục luyện tập để cải thiện nhé!',
            xpEarned: xp,
            niComment: feedbackData.completed ? completedMsg : triedMsg,
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
        language: LangParam = 'vi'
    ): Promise<RealWorldEvaluation> {
        const lang = toLang(language);
        const maxAttempts = 2;
        let lastError: unknown;

        const isEnFull = lang === 'en';
        const F = isEnFull ? {
            tx: 'Transcript (retell or recording)', txNull: 'Transcript: null (user only filled text form)',
            form: 'Form data', flow: 'What happened', emoBefore: 'Emotion before', emoAfter: 'Emotion after',
            said: 'What you said', reaction: 'Their reaction', worked: 'Went well', stuck: 'Got stuck',
            none: 'N/A', chTitle: 'Title', chDesc: 'Description', chWeak: 'Weakness',
            chNull: 'Challenge context: null (free share)',
            prev: 'Last 5 real shares', avgCoh: 'avg coherenceScore', avgJar: 'avg jargonCount', avgFill: 'avg fillerPerMinute',
            prevNull: 'previousMetrics: null (first time)',
        } : {
            tx: 'Transcript (bài kể lại hoặc ghi âm)', txNull: 'Transcript: null (user chỉ điền text form)',
            form: 'Form data', flow: 'Diễn biến', emoBefore: 'Cảm xúc trước', emoAfter: 'Cảm xúc sau',
            said: 'Bạn đã nói gì', reaction: 'Người kia phản ứng', worked: 'Suôn sẻ', stuck: 'Kẹt',
            none: 'Không có', chTitle: 'Tiêu đề', chDesc: 'Mô tả', chWeak: 'Điểm yếu',
            chNull: 'Challenge context: null (free share)',
            prev: '5 lượt thực tế gần nhất', avgCoh: 'coherenceScore trung bình', avgJar: 'jargonCount trung bình', avgFill: 'fillerPerMinute trung bình',
            prevNull: 'previousMetrics: null (lần đầu tiên)',
        };

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const context = `
${transcript ? `${F.tx}:\n${transcript}\n` : `${F.txNull}\n`}
${F.form}:
- ${F.flow}: ${feedbackData.situation || F.none}
- ${F.emoBefore}: ${feedbackData.emotionBefore || F.none}
- ${F.emoAfter}: ${feedbackData.emotionAfter || F.none}
- ${F.said}: ${feedbackData.whatUserSaid || F.none}
- ${F.reaction}: ${feedbackData.othersReaction || F.none}
- ${F.worked}: ${feedbackData.whatWorked || F.none}
- ${F.stuck}: ${feedbackData.whatStuck || F.none}

${challenge ? `Challenge context:\n- ${F.chTitle}: ${challenge.title}\n- ${F.chDesc}: ${challenge.description}\n- ${F.chWeak}: ${challenge.sourceWeakness || 'N/A'}\n` : `${F.chNull}\n`}
${previousMetrics ? `${F.prev}:\n- ${F.avgCoh}: ${previousMetrics.coherenceScore}\n- ${F.avgJar}: ${previousMetrics.jargonCount}\n- ${F.avgFill}: ${previousMetrics.fillerPerMinute}` : F.prevNull}

completed: ${feedbackData.completed}
`;
                const response = await getGenAI().models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: context }] }],
                    config: {
                        systemInstruction: this.promptService.getRealWorldFeedbackPrompt(lang),
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
                        trendNote: parsed.psychology?.trendNote || (isEnFull ? 'Not enough data' : 'Không có đủ dữ liệu'),
                    },
                    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
                    niComment: parsed.niComment || (isEnFull
                        ? "Thanks for sharing! Every experience is a valuable lesson."
                        : 'Cảm ơn bạn đã chia sẻ! Mỗi trải nghiệm là một bài học quý.'),
                    dialogueAnalysis: parsed.dialogueAnalysis || null,
                    betterPhrasing: parsed.betterPhrasing || null,
                    newStoryCandidate: parsed.newStoryCandidate === true,
                    newStorySuggestion: parsed.newStorySuggestion || undefined,
                    nextDifficulty: Math.min(5, Math.max(1, parsed.nextDifficulty || (challenge?.difficulty ?? 3))),
                    nextChallengeHint: parsed.nextChallengeHint || (isEnFull ? 'Keep practicing!' : 'Tiếp tục luyện tập nhé!'),
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
                trendNote: isEnFull ? 'Not enough data to analyze' : 'Không có đủ dữ liệu để phân tích',
            },
            strengths: [isEnFull ? 'You dared to share a real experience' : 'Bạn đã dám chia sẻ trải nghiệm thực tế'],
            improvements: [isEnFull ? 'Keep practicing to improve' : 'Tiếp tục luyện tập để cải thiện'],
            niComment: feedbackData.completed
                ? (isEnFull ? 'You dared to try and finished — that is what matters most!' : 'Bạn đã dám thử và hoàn thành — đó là điều quan trọng nhất!')
                : (isEnFull ? 'Just daring to try is a win. Next time you will be more confident!' : 'Dám thử là đã giỏi rồi. Lần sau bạn sẽ tự tin hơn!'),
            dialogueAnalysis: null,
            betterPhrasing: null,
            newStoryCandidate: false,
            nextDifficulty: challenge?.difficulty ?? 3,
            nextChallengeHint: isEnFull ? 'Keep practicing to improve!' : 'Tiếp tục luyện tập để cải thiện nhé!',
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
        language: LangParam = 'vi'
    ): Promise<GeneralChatResponse> {
        const lang = toLang(language);
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const systemPrompt = this.promptService.getMentorChatSystemPrompt(userContext, lang);

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
            reply: lang === 'en'
                ? "Sorry, I'm having a hiccup right now. Please try again later!"
                : 'Xin lỗi, Ni đang gặp trục trặc. Bạn thử lại sau nhé!',
            intent: 'support',
            actionTaken: null,
            dataCards: null,
        };
    }
}
