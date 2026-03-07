import * as fs from 'fs';
import * as path from 'path';

/**
 * PromptService — builds system prompts for the conversation AI agent.
 * Single source of truth for prompt templates (extracted from files in data/prompts/).
 */
export class PromptService {
    private readonly promptsDir = path.join(process.cwd(), '..', 'data', 'prompts');
    private readonly cache: Map<string, string> = new Map();

    constructor() {
        // Pre-warm cache for critical prompts
        this.getTemplate('conversation');
        this.getTemplate('scenario');
        this.getTemplate('evaluation');
        this.getTemplate('mentor');
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
        const persona = scenario?.interviewerPersona || 'Người hướng dẫn';
        const goals = (scenario?.goals || []).join(', ');
        const startingTurns = JSON.stringify(scenario?.startingTurns || []);

        return this.getTemplate('conversation')
            .replace(/\{\{persona\}\}/g, persona)
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
}
