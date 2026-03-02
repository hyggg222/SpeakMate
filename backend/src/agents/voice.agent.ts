import { config } from '../config/env';
import { GoogleGenAI } from '@google/genai';
import { InterviewScenario } from '../contracts/data.contracts';

// Agent 2: The Voice uses Gemini 1.5 Flash for low-latency interactive dialogue
const genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });

export class VoiceAgent {
    private modelName = 'gemini-2.0-flash';

    private getSystemPrompt(scenario: InterviewScenario) {
        return `
You are the interactive partner in a conversation scenario.
Your persona: ${scenario.interviewerPersona}
Your goal: ${scenario.goals.join(', ')}

Strictly follow your persona.Do not break character. 
Ensure your responses are concise, conversational, and suitable for spoken dialogue.

Here is the start of the scenario: ${JSON.stringify(scenario.startingTurns)}
`;
    }

    // Custom prompt for the Audio Interaction to return both Transcript AND Response
    private getAudioSystemPrompt(scenario: InterviewScenario) {
        return `
You are the interactive partner in a conversation scenario.
Your persona: ${scenario.interviewerPersona}
Your goal: ${scenario.goals.join(', ')}

Strictly follow your persona. Do not break character. 
Ensure your responses are concise, conversational, and suitable for spoken dialogue.
Here is the start of the scenario: ${JSON.stringify(scenario.startingTurns)}

CRITICAL INSTRUCTION:
The user has spoken to you via an audio clip. You must listen to it and understand what they said.
You MUST reply with a STRICT JSON object in this exact format:
{
  "userTranscript": "The exact words the user said in the audio clip in Vietnamese",
  "aiResponse": "Your response to the user following your persona in Vietnamese"
}
Output ONLY the JSON object. No markdown, no explanations.
`;
    }

    // Handle a text interaction (for Luồng 1 low latency text mode)
    public async interactText(scenario: InterviewScenario, conversationHistory: any[], latestUserMessage: string): Promise<string> {
        try {
            const chat = genAI.chats.create({
                model: this.modelName,
                config: {
                    systemInstruction: this.getSystemPrompt(scenario),
                    temperature: 0.7,
                },
            });

            const response = await chat.sendMessage({ message: latestUserMessage });
            return response.text || '';
        } catch (error) {
            console.error("VoiceAgent interact error:", error);
            throw error;
        }
    }

    // Handle audio interaction: STT + Response generation in one shot
    public async interactAudioStream(scenario: InterviewScenario, conversationHistory: any[], pcmBuffer: Buffer): Promise<{ userTranscript: string, aiResponse: string }> {
        try {
            // Convert history to text context
            const historyPrompt = conversationHistory.map(h => `${h.speaker}: ${h.line}`).join('\n');
            const prompt = `Conversation history so far:\n${historyPrompt}\n\nNow listen to the attached audio from the User and respond. Remember to output ONLY JSON.`;

            const response = await genAI.models.generateContent({
                model: this.modelName,
                contents: [
                    prompt,
                    {
                        inlineData: {
                            data: pcmBuffer.toString("base64"),
                            mimeType: "audio/wav" // Try wav matching PCM
                        }
                    }
                ],
                config: {
                    systemInstruction: this.getAudioSystemPrompt(scenario),
                    responseMimeType: "application/json",
                    temperature: 0.7,
                }
            });

            const jsonStr = response.text || "{}";
            try {
                const parsed = JSON.parse(jsonStr);
                return {
                    userTranscript: parsed.userTranscript || "(Không nghe rõ)",
                    aiResponse: parsed.aiResponse || "Xin lỗi, tôi không nghe rõ."
                };
            } catch (e) {
                console.error("Failed to parse Voice JSON:", jsonStr);
                return { userTranscript: "(Lỗi nhận diện)", aiResponse: jsonStr };
            }

        } catch (error) {
            console.error("VoiceAgent interactAudio error:", error);
            throw error;
        }
    }
}
