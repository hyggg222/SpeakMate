import { config } from '../config/env';
import { GoogleGenAI } from '@google/genai';
import { FullScenarioContext } from '../contracts/data.contracts';

/**
 * BrainAgent is responsible for processing user requirements into structured JSON scenarios.
 * It uses the Gemini 2.0 Flash model to generate contexts for practice sessions.
 */
const genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });

/**
 * Strips bracketed placeholders like [tên của bạn] from any string.
 */
function sanitizePlaceholders(text: string): string {
  // Replace name-related bracketed placeholders with "bạn"
  let result = text.replace(/\[(?:tên của bạn|tên bạn|tên người dùng|your name|tên|name|họ tên|user name|người dùng)[^\]]*\]/gi, 'bạn');
  // Remove any remaining bracketed placeholders (addresses, topics, etc.)
  result = result.replace(/\[[^\]]{1,40}\]/g, '');
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result;
}

/**
 * Recursively sanitizes all string values in a scenario object.
 */
function sanitizeScenario(obj: any): any {
  if (typeof obj === 'string') return sanitizePlaceholders(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeScenario);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeScenario(obj[key]);
    }
    return result;
  }
  return obj;
}

import { PromptService } from '../services/prompt.service';

export class BrainAgent {
  private modelName = 'gemini-2.0-flash';
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
    try {
      const response = await genAI.models.generateContent({
        model: this.modelName,
        contents: `User Goal: ${userRequirement}`,
        config: {
          systemInstruction: this.promptService.getScenarioSystemPrompt(),
          responseMimeType: "application/json",
        }
      });
      // The SDK returns text which is JSON formatted
      const jsonStr = response.text || "{}";
      const configObj: FullScenarioContext = sanitizeScenario(JSON.parse(jsonStr));
      return configObj;
    } catch (error) {
      console.error("BrainAgent error:", error);
      throw error;
    }
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

      const response = await genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.8,
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

      const response = await genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction: this.promptService.getScenarioSystemPrompt(),
          responseMimeType: "application/json",
        }
      });
      const jsonStr = response.text || "{}";
      const adjustedScenario: FullScenarioContext = sanitizeScenario(JSON.parse(jsonStr));
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

      const response = await genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.9,
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
    try {
      const prompt = `
Scenario: ${JSON.stringify(scenario)}
Evaluation Report: ${JSON.stringify(evaluationReport)}
      `;

      const response = await genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction: this.promptService.getGamificationSystemPrompt(),
          responseMimeType: "application/json",
          temperature: 0.8,
        }
      });
      const jsonStr = response.text || "{}";
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("[BrainAgent] Failed to generate challenge:", error);
      throw error;
    }
  }
}
