import { config } from '../config/env';
import { GoogleGenAI } from '@google/genai';
import { FullScenarioContext } from '../contracts/data.contracts';

// Agent 1: The Brain uses Gemini 1.5 Pro to process text/pdf into JSON Scenario
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
}
