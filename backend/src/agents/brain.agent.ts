import { FullScenarioContext } from '../contracts/data.contracts';
import { getGenAI, isRateLimited, switchToFallback, GEMINI_MODEL, SAFETY_SETTINGS } from '../config/genai';
import { sanitizeObj } from '../utils/sanitize';
import { PromptService } from '../services/prompt.service';

export class BrainAgent {
  private modelName = GEMINI_MODEL;
  private promptService: PromptService;

  constructor() {
    this.promptService = new PromptService();
  }

  /**
   * Generates a complete scenario context including goals, starting turns, and evaluation rules
   * based on the user's requirement.
   *
   * @param {string} userRequirement - The target skill, job, or topic the user wants to practice.
   * @returns {Promise<FullScenarioContext>} A structured scenario object containing setup data.
   * @throws Will throw an error if the model fails to generate content or returns invalid JSON.
   */
  public async generateScenario(userRequirement: string): Promise<FullScenarioContext> {
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await getGenAI().models.generateContent({
          model: this.modelName,
          contents: [{ role: 'user', parts: [{ text: `User Goal: ${userRequirement}` }] }],
          config: {
            systemInstruction: this.promptService.getScenarioSystemPrompt(),
            responseMimeType: "application/json",
            safetySettings: SAFETY_SETTINGS,
          }
        });
        const jsonStr = response.text || "{}";
        const raw = sanitizeObj(JSON.parse(jsonStr));
        // Normalize: prompt returns flat object, but FullScenarioContext needs { scenario, evalRules }
        const configObj: FullScenarioContext = (raw.scenario && raw.evalRules)
          ? raw  // already correct shape
          : {
              scenario: {
                scenarioName: raw.title || raw.scenarioName || userRequirement,
                topic: raw.description || raw.topic,
                interviewerPersona: raw.interviewerPersona || '',
                characters: raw.characters,
                goals: raw.goals || [],
                startingTurns: raw.startingTurns || [],
                relevantTags: raw.relevantTags,
              },
              evalRules: raw.evalRules || { categories: [] },
            };
        return configObj;
      } catch (error) {
        lastError = error;
        console.error(`[BrainAgent] generateScenario attempt ${attempt}/${maxAttempts} failed:`, error);
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    throw lastError;
  }

  /**
   * Generates contextual scaffolding hints (a.k.a "Ni ơi, cứu!") to help the user 
   * when they are stuck during a conversation.
   *
   * @param {any} scenario - The current active scenario context.
   * @param {any[]} conversationHistory - The chat history of the current session.
   * @returns {Promise<string[]>} An array of 3 short hint phrases in Vietnamese.
   */
  public async generateHints(scenario: any, conversationHistory: any[]): Promise<string[]> {
    try {
      const historyText = conversationHistory.map((h: any) => `${h.speaker}: ${h.line}`).join('\n');
      const prompt = `Scenario: ${JSON.stringify(scenario)}
Conversation so far:
${historyText}

The user is stuck and needs help. Generate exactly 3 short Vietnamese keyword hints or phrases (max 5 words each) that would help the user continue the conversation naturally. These should be suggestive, not full sentences.
Output ONLY a JSON array of 3 strings, no markdown. Example: ["từ khóa 1", "cụm từ 2", "gợi ý 3"]`;

      const response = await getGenAI().models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.8,
          safetySettings: SAFETY_SETTINGS,
        }
      });
      const jsonStr = response.text || '["Hãy thử lại", "Nói về bản thân", "Hỏi thêm câu hỏi"]';
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("[BrainAgent] Failed to generate hints:", error);
      return ["Hãy thử lại", "Nói về bản thân", "Hỏi thêm câu hỏi"];
    }
  }

  /**
   * Adjusts an existing scenario based on user modification text.
   * Instead of regenerating from scratch, this refines the current context.
   *
   * @param {FullScenarioContext} currentScenario - The currently active scenario to adjust.
   * @param {string} adjustmentText - The user's adjustment request or new text input.
   * @returns {Promise<FullScenarioContext>} An adjusted scenario context.
   */
  public async adjustScenario(currentScenario: FullScenarioContext, adjustmentText: string): Promise<FullScenarioContext> {
    try {
      const prompt = `You are adjusting an existing practice scenario. Here is the current scenario:
${JSON.stringify(currentScenario, null, 2)}

The user wants to make this adjustment: "${adjustmentText}"

Modify the existing scenario to incorporate this adjustment while preserving the overall structure and any relevant existing details.
Output ONLY a valid JSON object matching the exact same structure as the input scenario. No markdown, no explanation.
Respond in Vietnamese inside string values.
NEVER use bracketed placeholders like [tên của bạn], [your name], [tên], etc. Use concrete names or "bạn" instead.`;

      const response = await getGenAI().models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: this.promptService.getScenarioSystemPrompt(),
          responseMimeType: "application/json",
          safetySettings: SAFETY_SETTINGS,
        }
      });
      const jsonStr = response.text || "{}";
      const raw = sanitizeObj(JSON.parse(jsonStr));
      const adjustedScenario: FullScenarioContext = (raw.scenario && raw.evalRules)
        ? raw
        : {
            scenario: {
              scenarioName: raw.title || raw.scenarioName || currentScenario.scenario?.scenarioName || '',
              topic: raw.description || raw.topic || currentScenario.scenario?.topic,
              interviewerPersona: raw.interviewerPersona || currentScenario.scenario?.interviewerPersona || '',
              characters: raw.characters || currentScenario.scenario?.characters,
              goals: raw.goals || currentScenario.scenario?.goals || [],
              startingTurns: raw.startingTurns || currentScenario.scenario?.startingTurns || [],
              relevantTags: raw.relevantTags || currentScenario.scenario?.relevantTags,
            },
            evalRules: raw.evalRules || currentScenario.evalRules,
          };
      return adjustedScenario;
    } catch (error) {
      console.error("[BrainAgent] Adjust scenario error:", error);
      throw error;
    }
  }

  /**
   * Generates context-aware suggestion ideas based on the current scenario.
   * These suggestions help users discover ways to refine or enhance their practice context.
   *
   * @param {FullScenarioContext} currentScenario - The currently active scenario.
   * @returns {Promise<string[]>} An array of 3 suggestion strings in Vietnamese.
   */
  public async generateSuggestions(currentScenario: FullScenarioContext): Promise<string[]> {
    try {
      const prompt = `Given this current practice scenario:
${JSON.stringify(currentScenario, null, 2)}

Generate exactly 3 creative and useful Vietnamese suggestions (each max 8 words) that the user could apply to enhance or modify this scenario. These should be contextually relevant — they could adjust difficulty, add new elements, change the setting, or introduce interesting twists.
Output ONLY a JSON array of 3 strings, no markdown. Example: ["Thêm câu hỏi phản biện", "Bối cảnh phỏng vấn online", "Tăng tempo cuộc hội thoại"]`;

      const response = await getGenAI().models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.9,
          safetySettings: SAFETY_SETTINGS,
        }
      });
      const jsonStr = response.text || '["Thêm nhân vật phản biện", "Bối cảnh hội trường lớn", "Khán giả là chuyên gia"]';
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("[BrainAgent] Failed to generate suggestions:", error);
      return ["Thêm nhân vật phản biện", "Bối cảnh hội trường lớn", "Khán giả là chuyên gia"];
    }
  }

  /**
   * Phase 3: Generates a Real-world Challenge from user weaknesses.
   */
  public async generateChallenge(scenario: any, evaluationReport: any): Promise<any> {
    const prompt = `
Scenario: ${JSON.stringify(scenario)}
Evaluation Report: ${JSON.stringify(evaluationReport)}
User Request: null
    `;
    return this._callGamificationPrompt(prompt);
  }

  public async adjustChallenge(
    currentChallenge: { title: string; description: string; difficulty: number; sourceWeakness?: string },
    userRequest: string,
    scenario: any,
    evaluationReport: any
  ): Promise<any> {
    const prompt = `
Scenario: ${JSON.stringify(scenario)}
Evaluation Report: ${JSON.stringify(evaluationReport)}
Challenge hiện tại: ${JSON.stringify(currentChallenge)}
User Request: "${userRequest}"
    `;
    return this._callGamificationPrompt(prompt);
  }

  private async _callGamificationPrompt(prompt: string): Promise<any> {
    try {
      const response = await getGenAI().models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: this.promptService.getGamificationSystemPrompt(),
          responseMimeType: "application/json",
          temperature: 0.8,
          safetySettings: SAFETY_SETTINGS,
        }
      });
      const jsonStr = response.text || "{}";
      const parsed = JSON.parse(jsonStr);
      // Ensure required fields have defaults
      return {
        title: parsed.title || 'Thử thách giao tiếp',
        description: parsed.description || '',
        difficulty: Math.min(5, Math.max(1, parsed.difficulty || 3)),
        sourceWeakness: parsed.sourceWeakness || null,
        opener_hints: Array.isArray(parsed.opener_hints) ? parsed.opener_hints : [],
        suggestedStories: [],
      };
    } catch (error) {
      console.error("[BrainAgent] Failed to call gamification prompt:", error);
      throw error;
    }
  }
}
