import * as fs from 'fs';
import * as path from 'path';

export type Lang = 'vi' | 'en';

/**
 * PromptService — single source of truth for AI prompts.
 *
 * Conventions:
 * - Files live in data/prompts/{name}.{vi|en}.txt
 * - Placeholders use double braces: {{varName}}
 * - All public methods accept a `language` param (default 'vi')
 *
 * If the requested .{lang}.txt file is missing, falls back to .vi.txt.
 */
export class PromptService {
    // __dirname = dist/services/ (prod) or src/services/ (dev) → go up 3 levels to repo root
    private readonly promptsDir = path.join(__dirname, '..', '..', '..', 'data', 'prompts');
    private readonly cache: Map<string, string> = new Map();

    // STAR/CAR/PREP framework fields (per-language)
    private static readonly FRAMEWORK_FIELDS: Record<Lang, Record<string, string>> = {
        vi: {
            STAR: 'situation (bối cảnh), task (nhiệm vụ), action (hành động), result (kết quả)',
            PREP: 'point (luận điểm), reason (lý do), example (ví dụ), point2 (kết luận)',
            CAR:  'challenge (thách thức), action (hành động), result (kết quả)',
        },
        en: {
            STAR: 'situation, task, action, result',
            PREP: 'point, reason, example, point2 (conclusion)',
            CAR:  'challenge, action, result',
        },
    };

    constructor() {
        // Pre-warm cache for critical prompts (both VI + EN)
        const critical = [
            'conversation', 'conversation_multi', 'character_score',
            'scenario', 'scenario_hints', 'scenario_adjust', 'scenario_suggestions',
            'evaluation', 'evaluation_user',
            'realworld_evaluation', 'realworld_eval_user',
            'storybank', 'storybank_structure',
            'storybank_analyst', 'storybank_compare',
            'mentor', 'mentor_chat',
            'story_chat',
            'eval_comment',
            'gamification', 'challenge_user',
            'feedback_analysis', 'realworld_feedback_analysis',
        ];
        for (const name of critical) {
            this.getTemplate(name, 'vi');
            this.getTemplate(name, 'en');
        }
    }

    /**
     * Load a prompt template for the given language.
     * Falls back to .vi.txt if the language-specific file is missing.
     */
    private getTemplate(name: string, language: Lang = 'vi'): string {
        const key = `${name}.${language}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const filePath = path.join(this.promptsDir, `${name}.${language}.txt`);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            this.cache.set(key, content);
            return content;
        } catch {
            if (language !== 'vi') {
                console.warn(`[PromptService] Missing ${name}.${language}.txt — falling back to .vi.txt`);
                return this.getTemplate(name, 'vi');
            }
            console.error(`[PromptService] Cannot read prompt template "${name}"`);
            return '';
        }
    }

    /** Replace {{var}} placeholders with values. Missing keys become empty strings. */
    private render(template: string, vars: Record<string, string>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
    }

    // ──────────────────────────────────────────────────────────────────────
    // Conversation prompts (VoiceAgent)
    // ──────────────────────────────────────────────────────────────────────

    buildConversationPrompt(scenario: any, userName: string = 'bạn', language: Lang = 'vi'): string {
        // Dual-character mode
        if (scenario?.characters?.length >= 2) {
            return this.buildDualCharacterPrompt(scenario, userName, language);
        }

        const persona = scenario?.interviewerPersona || (language === 'en' ? 'A guide' : 'Người hướng dẫn');
        const goals = (scenario?.goals || []).join(', ');
        const startingTurns = JSON.stringify(scenario?.startingTurns || []);

        return this.render(this.getTemplate('conversation', language), {
            persona,
            goals,
            userName,
            startingTurns,
        });
    }

    buildDualCharacterPrompt(scenario: any, userName: string = 'bạn', language: Lang = 'vi'): string {
        const characters = scenario?.characters || [];
        if (characters.length < 2) {
            return this.buildConversationPrompt(scenario, userName, language);
        }

        const char1 = characters[0];
        const char2 = characters[1];
        const goals = (scenario?.goals || []).join(', ');
        const startingTurns = JSON.stringify(scenario?.startingTurns || []);

        return this.render(this.getTemplate('conversation_multi', language), {
            char1_name: char1.name,
            char1_persona: char1.persona,
            char2_name: char2.name,
            char2_persona: char2.persona,
            goals,
            userName,
            startingTurns,
        });
    }

    buildCharacterScoringPrompt(
        char: { name: string; persona: string },
        otherChar: { name: string; persona: string },
        goals: string,
        recentHistory: string,
        userMessage: string,
        language: Lang = 'vi',
    ): string {
        return this.render(this.getTemplate('character_score', language), {
            charName: char.name,
            charPersona: char.persona,
            otherCharName: otherChar.name,
            otherCharPersona: otherChar.persona,
            goals,
            recentHistory: recentHistory || (language === 'en' ? '(No history yet)' : '(Chưa có lịch sử)'),
            userMessage,
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // Scenario prompts (BrainAgent)
    // ──────────────────────────────────────────────────────────────────────

    getScenarioSystemPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('scenario', language);
    }

    buildScenarioHintsPrompt(scenario: any, conversationHistory: any[], language: Lang = 'vi'): string {
        const historyText = conversationHistory.map((h: any) => `${h.speaker}: ${h.line}`).join('\n');
        return this.render(this.getTemplate('scenario_hints', language), {
            scenarioJson: JSON.stringify(scenario, null, 2),
            historyText,
        });
    }

    buildScenarioAdjustPrompt(currentScenario: any, adjustment: string, language: Lang = 'vi'): string {
        return this.render(this.getTemplate('scenario_adjust', language), {
            scenarioJson: JSON.stringify(currentScenario, null, 2),
            adjustment,
        });
    }

    buildScenarioSuggestionsPrompt(currentScenario: any, language: Lang = 'vi'): string {
        return this.render(this.getTemplate('scenario_suggestions', language), {
            scenarioJson: JSON.stringify(currentScenario, null, 2),
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // Gamification / Challenge prompts (BrainAgent)
    // ──────────────────────────────────────────────────────────────────────

    getGamificationSystemPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('gamification', language);
    }

    buildChallengeUserPrompt(
        scenario: any,
        evaluationReport: any,
        currentChallenge: any = null,
        userRequest: string | null = null,
        language: Lang = 'vi',
    ): string {
        return this.render(this.getTemplate('challenge_user', language), {
            scenarioJson: JSON.stringify(scenario),
            evaluationJson: JSON.stringify(evaluationReport),
            currentChallengeJson: currentChallenge ? JSON.stringify(currentChallenge) : (language === 'en' ? 'null' : 'null'),
            userRequest: userRequest ? `"${userRequest}"` : 'null',
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // Evaluation prompts (AnalystAgent)
    // ──────────────────────────────────────────────────────────────────────

    getEvaluationSystemPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('evaluation', language);
    }

    buildEvaluationUserPrompt(transcript: string, rubric: any, language: Lang = 'vi'): string {
        return this.render(this.getTemplate('evaluation_user', language), {
            transcript,
            rubricJson: JSON.stringify(rubric.categories || []),
        });
    }

    getRealWorldEvaluationPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('realworld_evaluation', language);
    }

    buildRealWorldEvalUserPrompt(transcript: string, contextDescription: string, language: Lang = 'vi'): string {
        return this.render(this.getTemplate('realworld_eval_user', language), {
            transcript,
            contextDescription,
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // StoryBank prompts (StoryBankAgent + AnalystAgent)
    // ──────────────────────────────────────────────────────────────────────

    getStoryBankSystemPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('storybank', language);
    }

    buildStoryBankStructurePrompt(
        framework: string,
        rawInput: string,
        inputMethod: string,
        followUpAnswers?: string[],
        chatHistory?: { role: string; content: string }[],
        language: Lang = 'vi',
    ): string {
        let followUpSection = '';
        if (followUpAnswers && followUpAnswers.length > 0) {
            const header = language === 'en'
                ? '\n\nUser answered follow-up questions:\n'
                : '\n\nUser đã trả lời các câu hỏi bổ sung:\n';
            followUpSection += header;
            followUpAnswers.forEach((answer, i) => {
                const qPrefix = language === 'en' ? `Q${i + 1}` : `Câu ${i + 1}`;
                followUpSection += `${qPrefix}: ${answer}\n`;
            });
            followUpSection += language === 'en'
                ? `\nNow structure the story fully with framework ${framework}, NO more questions. needsFollowUp MUST be false.`
                : `\nBây giờ hãy cấu trúc hóa đầy đủ theo framework ${framework}, KHÔNG hỏi thêm nữa. needsFollowUp PHẢI = false.`;
        }

        let chatHistorySection = '';
        if (chatHistory && chatHistory.length > 0) {
            chatHistorySection += language === 'en'
                ? '\n\nUser chatted with Ni for clarification:\n'
                : '\n\nUser đã trò chuyện với Ni để làm rõ thêm:\n';
            for (const msg of chatHistory) {
                const speaker = msg.role === 'user' ? 'User' : 'Ni';
                chatHistorySection += `${speaker}: ${msg.content}\n`;
            }
            chatHistorySection += language === 'en'
                ? `\nNow structure fully with framework ${framework} based on ALL info above. needsFollowUp MUST be false. If any field is missing, STILL structure but mark in missingFields.`
                : `\nBây giờ hãy cấu trúc hóa đầy đủ theo framework ${framework} dựa trên TOÀN BỘ thông tin trên. needsFollowUp PHẢI = false. Nếu thiếu field nào, VẪN cấu trúc hóa nhưng đánh dấu vào missingFields.`;
        }

        return this.render(this.getTemplate('storybank_structure', language), {
            framework,
            rawInput,
            inputMethod,
            followUpSection,
            chatHistorySection,
        });
    }

    getStoryBankAnalystSystemPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('storybank_analyst', language);
    }

    buildStoryBankComparePrompt(storyEntry: any, transcript: string, language: Lang = 'vi'): string {
        return this.render(this.getTemplate('storybank_compare', language), {
            title: storyEntry.title || '',
            framework: storyEntry.framework || '',
            situation: storyEntry.structured?.situation || '',
            task: storyEntry.structured?.task || '',
            action: storyEntry.structured?.action || '',
            result: storyEntry.structured?.result || '',
            fullScript: storyEntry.full_script || storyEntry.fullScript || '',
            transcript,
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // Mentor prompts (MentorAgent)
    // ──────────────────────────────────────────────────────────────────────

    getMentorSystemPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('mentor', language);
    }

    getEvalCommentPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('eval_comment', language);
    }

    getFeedbackAnalysisPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('feedback_analysis', language);
    }

    getRealWorldFeedbackPrompt(language: Lang = 'vi'): string {
        return this.getTemplate('realworld_feedback_analysis', language);
    }

    getMentorChatSystemPrompt(userContext: string, language: Lang = 'vi'): string {
        return this.render(this.getTemplate('mentor_chat', language), {
            userContext,
        });
    }

    getStoryChatSystemPrompt(framework: string, rawInput: string, language: Lang = 'vi'): string {
        const fields = PromptService.FRAMEWORK_FIELDS[language][framework]
            ?? PromptService.FRAMEWORK_FIELDS[language].STAR;
        return this.render(this.getTemplate('story_chat', language), {
            framework,
            frameworkFields: fields,
            rawInput,
        });
    }
}
