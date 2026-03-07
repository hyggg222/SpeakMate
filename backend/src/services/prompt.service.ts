import * as fs from 'fs';
import * as path from 'path';

/**
 * PromptService — builds system prompts for the conversation AI agent.
 * Single source of truth for prompt templates (extracted from files in data/prompts/).
 */
export class PromptService {
    private readonly promptsDir = path.join(process.cwd(), '..', 'data', 'prompts');
    private readonly cache: Map<string, string> = new Map();

    private static readonly FRAMEWORK_FIELDS: Record<string, string> = {
        STAR: 'situation (bối cảnh), task (nhiệm vụ), action (hành động), result (kết quả)',
        PREP: 'point (luận điểm), reason (lý do), example (ví dụ), point2 (kết luận)',
        CAR: 'challenge (thách thức), action (hành động), result (kết quả)',
    };

    constructor() {
        // Pre-warm cache for critical prompts
        this.getTemplate('conversation');
        this.getTemplate('conversation_multi');
        this.getTemplate('scenario');
        this.getTemplate('evaluation');
        this.getTemplate('mentor');
        this.getTemplate('storybank');
        this.getTemplate('story_chat');
        this.getTemplate('mentor_chat');
    }

    private getTemplate(name: string): string {
        if (this.cache.has(name)) {
            return this.cache.get(name)!;
        }

        try {
            const content = fs.readFileSync(path.join(this.promptsDir, `${name}.txt`), 'utf-8');
            this.cache.set(name, content);
            return content;
        } catch (error) {
            console.error(`[PromptService] Error reading prompt template "${name}":`, error);
            return '';
        }
    }

    /**
     * Build the conversation system prompt used by the LiveKit ManualBridgeAgent.
     */
    buildConversationPrompt(scenario: any, userName: string = 'bạn'): string {
        // Dual-character mode
        if (scenario?.characters?.length >= 2) {
            return this.buildDualCharacterPrompt(scenario, userName);
        }

        const persona = scenario?.interviewerPersona || 'Người hướng dẫn';
        const goals = (scenario?.goals || []).join(', ');
        const startingTurns = JSON.stringify(scenario?.startingTurns || []);

        return this.getTemplate('conversation')
            .replace(/\{\{persona\}\}/g, persona)
            .replace(/\{\{goals\}\}/g, goals)
            .replace(/\{\{userName\}\}/g, userName)
            .replace(/\{\{startingTurns\}\}/g, startingTurns);
    }

    /**
     * Build prompt for dual-character conversation (max 2 AI characters).
     */
    buildDualCharacterPrompt(scenario: any, userName: string = 'bạn'): string {
        const characters = scenario?.characters || [];
        if (characters.length < 2) {
            return this.buildConversationPrompt(scenario, userName);
        }

        const char1 = characters[0];
        const char2 = characters[1];
        const goals = (scenario?.goals || []).join(', ');
        const startingTurns = JSON.stringify(scenario?.startingTurns || []);

        return this.getTemplate('conversation_multi')
            .replace(/\{\{char1_name\}\}/g, char1.name)
            .replace(/\{\{char1_persona\}\}/g, char1.persona)
            .replace(/\{\{char2_name\}\}/g, char2.name)
            .replace(/\{\{char2_persona\}\}/g, char2.persona)
            .replace(/\{\{goals\}\}/g, goals)
            .replace(/\{\{userName\}\}/g, userName)
            .replace(/\{\{startingTurns\}\}/g, startingTurns);
    }

    getScenarioSystemPrompt(): string {
        return this.getTemplate('scenario');
    }

    getEvaluationSystemPrompt(): string {
        return this.getTemplate('evaluation');
    }

    getMentorSystemPrompt(): string {
        return this.getTemplate('mentor');
    }

    getGamificationSystemPrompt(): string {
        return this.getTemplate('gamification');
    }

    getStoryBankSystemPrompt(): string {
        return this.getTemplate('storybank');
    }

    getStoryBankAnalystSystemPrompt(): string {
        return this.getTemplate('storybank_analyst');
    }

    getEvalCommentPrompt(): string {
        return this.getTemplate('eval_comment');
    }

    getRealWorldEvaluationPrompt(): string {
        return this.getTemplate('realworld_evaluation');
    }

    getFeedbackAnalysisPrompt(): string {
        return this.getTemplate('feedback_analysis');
    }

    getMentorChatSystemPrompt(userContext: string): string {
        return this.getTemplate('mentor_chat')
            .replace(/\{\{userContext\}\}/g, userContext);
    }

    getStoryChatSystemPrompt(framework: string, rawInput: string): string {
        const fields = PromptService.FRAMEWORK_FIELDS[framework] || PromptService.FRAMEWORK_FIELDS.STAR;
        return this.getTemplate('story_chat')
            .replace(/\{\{framework\}\}/g, framework)
            .replace(/\{\{frameworkFields\}\}/g, fields)
            .replace(/\{\{rawInput\}\}/g, rawInput);
    }
}
