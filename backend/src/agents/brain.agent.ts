import { FullScenarioContext } from '../contracts/data.contracts';
import { getGenAI, isRateLimited, switchToFallback, GEMINI_MODEL, SAFETY_SETTINGS } from '../config/genai';
import { sanitizeObj } from '../utils/sanitize';
import { PromptService, Lang } from '../services/prompt.service';

type LangParam = Lang | string;

/** Coerce arbitrary string into Lang ('vi' | 'en'). Default 'vi'. */
function toLang(language?: LangParam): Lang {
  return language === 'en' ? 'en' : 'vi';
}

export class BrainAgent {
  private modelName = GEMINI_MODEL;
  private promptService: PromptService;

  constructor() {
    this.promptService = new PromptService();
  }

  /**
   * Generates a complete scenario context including goals, starting turns, and evaluation rules
   * based on the user's requirement.
   */
  public async generateScenario(userRequirement: string, language: LangParam = 'vi'): Promise<FullScenarioContext> {
    const lang = toLang(language);
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await getGenAI().models.generateContent({
          model: this.modelName,
          contents: [{ role: 'user', parts: [{ text: `User Goal: ${userRequirement}` }] }],
          config: {
            systemInstruction: this.promptService.getScenarioSystemPrompt(lang),
            responseMimeType: "application/json",
            safetySettings: SAFETY_SETTINGS,
          }
        });
        const jsonStr = response.text || "{}";
        const raw = sanitizeObj(JSON.parse(jsonStr));
        const configObj: FullScenarioContext = (raw.scenario && raw.evalRules)
          ? raw
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
   * Generates contextual scaffolding hints to help the user when stuck.
   */
  public async generateHints(scenario: any, conversationHistory: any[], language: LangParam = 'vi'): Promise<string[]> {
    const lang = toLang(language);
    const fallback = lang === 'en'
      ? ['Try again', 'Talk about yourself', 'Ask another question']
      : ['Hãy thử lại', 'Nói về bản thân', 'Hỏi thêm câu hỏi'];

    try {
      const prompt = this.promptService.buildScenarioHintsPrompt(scenario, conversationHistory, lang);
      const response = await getGenAI().models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.8,
          safetySettings: SAFETY_SETTINGS,
        }
      });
      const jsonStr = response.text || JSON.stringify(fallback);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("[BrainAgent] Failed to generate hints:", error);
      return fallback;
    }
  }

  /**
   * Adjusts an existing scenario based on user modification text.
   */
  public async adjustScenario(currentScenario: FullScenarioContext, adjustmentText: string, language: LangParam = 'vi'): Promise<FullScenarioContext> {
    const lang = toLang(language);
    try {
      const prompt = this.promptService.buildScenarioAdjustPrompt(currentScenario, adjustmentText, lang);
      const response = await getGenAI().models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: this.promptService.getScenarioSystemPrompt(lang),
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
   */
  public async generateSuggestions(currentScenario: FullScenarioContext, language: LangParam = 'vi'): Promise<string[]> {
    const lang = toLang(language);
    const fallback = lang === 'en'
      ? ['Add a challenger character', 'Set in a large hall', 'Audience is experts']
      : ['Thêm nhân vật phản biện', 'Bối cảnh hội trường lớn', 'Khán giả là chuyên gia'];

    try {
      const prompt = this.promptService.buildScenarioSuggestionsPrompt(currentScenario, lang);
      const response = await getGenAI().models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.9,
          safetySettings: SAFETY_SETTINGS,
        }
      });
      const jsonStr = response.text || JSON.stringify(fallback);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("[BrainAgent] Failed to generate suggestions:", error);
      return fallback;
    }
  }

  /**
   * Generates a Real-world Challenge from user weaknesses.
   */
  public async generateChallenge(scenario: any, evaluationReport: any, language: LangParam = 'vi'): Promise<any> {
    const lang = toLang(language);
    const prompt = this.promptService.buildChallengeUserPrompt(scenario, evaluationReport, null, null, lang);
    return this._callGamificationPrompt(prompt, lang);
  }

  public async adjustChallenge(
    currentChallenge: { title: string; description: string; difficulty: number; sourceWeakness?: string },
    userRequest: string,
    scenario: any,
    evaluationReport: any,
    language: LangParam = 'vi'
  ): Promise<any> {
    const lang = toLang(language);
    const prompt = this.promptService.buildChallengeUserPrompt(scenario, evaluationReport, currentChallenge, userRequest, lang);
    return this._callGamificationPrompt(prompt, lang);
  }

  private async _callGamificationPrompt(prompt: string, language: Lang = 'vi'): Promise<any> {
    const fallbackTitle = language === 'en' ? 'Communication challenge' : 'Thử thách giao tiếp';
    try {
      const response = await getGenAI().models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: this.promptService.getGamificationSystemPrompt(language),
          responseMimeType: "application/json",
          temperature: 0.8,
          safetySettings: SAFETY_SETTINGS,
        }
      });
      const jsonStr = response.text || "{}";
      const parsed = JSON.parse(jsonStr);
      return {
        title: parsed.title || fallbackTitle,
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
