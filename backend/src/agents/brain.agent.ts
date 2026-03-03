import { config } from '../config/env';
import { GoogleGenAI } from '@google/genai';
import { FullScenarioContext } from '../contracts/data.contracts';

/**
 * BrainAgent is responsible for processing user requirements into structured JSON scenarios.
 * It uses the Gemini 2.0 Flash model to generate contexts for practice sessions.
 */
const genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });

export class BrainAgent {
  private modelName = 'gemini-2.0-flash';

  private getSystemPrompt() {
    return `You are an AI scenario designer for a language practice app.
Output ONLY a valid JSON object with NO markdown, NO explanation, NO extra text — just raw JSON.

The JSON MUST match this exact structure:
{
  "scenario": {
    "scenarioName": "Short name for this scenario",
    "jobTitle": "optional job title",
    "topic": "optional topic",
    "interviewerPersona": "Brief description of the AI partner's personality and style",
    "goals": ["Goal 1 for the user to achieve", "Goal 2"],
    "startingTurns": [
      { "speaker": "AI", "line": "Opening line the AI partner says first", "emotion": "neutral" },
      { "speaker": "User", "line": "Expected response from the user", "expectedUserResponse": "behavioral" }
    ]
  },
  "evalRules": {
    "categories": [
      { "category": "Sự tự tin (Confidence)", "weight": 40, "description": "Mức độ tự nhiên, thoải mái khi giao tiếp" },
      { "category": "Mạch lạc (Flow)", "weight": 30, "description": "Nhịp điệu giao tiếp không bị ngập ngừng quá lâu" },
      { "category": "Từ vựng (Vocabulary)", "weight": 30, "description": "Sử dụng từ ngữ đời thường, gần gũi" }
    ]
  }
}

Adapt scenario content based on the user's goal. This is a "Safe Mode" practice, meaning the focus is on a comfortable, low-pressure conversational environment. Respond in Vietnamese inside string values.
CRITICAL: Output ONLY the JSON object, nothing else.`;
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
          systemInstruction: this.getSystemPrompt(),
          responseMimeType: "application/json",
        }
      });
      // The SDK returns text which is JSON formatted
      const jsonStr = response.text || "{}";
      const configObj: FullScenarioContext = JSON.parse(jsonStr);
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
}
