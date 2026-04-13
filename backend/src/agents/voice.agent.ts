import { LlmService } from '../services/llm.service';
import { config } from '../config/env';

const llmService = new LlmService();

/**
 * Strips bracketed placeholders like [tên của bạn], [your name], [địa điểm] from LLM output.
 * Replaces them with the user's name or removes them entirely.
 */
function sanitizePlaceholders(text: string, userName?: string): string {
    const name = userName || 'bạn';
    // Replace name-related placeholders with the actual user name
    let result = text.replace(/\[(?:tên của bạn|tên bạn|tên người dùng|your name|tên|name|họ tên|user name|người dùng)[^\]]*\]/gi, name);
    // Remove any remaining bracketed placeholders
    result = result.replace(/\[[^\]]{1,40}\]/g, '');
    // Clean up double spaces left behind
    result = result.replace(/\s{2,}/g, ' ').trim();
    return result;
}

export class VoiceAgent {

    private getSystemPrompt(scenario: any, userName?: string) {
        const name = userName || 'bạn';
        return `Bạn là đối tác hội thoại trong một kịch bản luyện tập giao tiếp.
Nhân vật của bạn: ${scenario?.interviewerPersona || 'Người hướng dẫn'}
Mục tiêu: ${(scenario?.goals || []).join(', ')}
Tên người dùng: ${name}

Tuân thủ nghiêm ngặt nhân vật. Không thoát vai.
Trả lời cực kỳ ngắn gọn (tối đa 2 câu, dưới 20 từ).
Hết sức tự nhiên như đang nói chuyện trực tiếp. Tránh giải thích dông dài.
TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [] hoặc placeholder như [tên của bạn], [your name], [tên], [địa điểm]. Luôn dùng tên cụ thể "${name}" hoặc "bạn".

Bối cảnh kịch bản: ${JSON.stringify(scenario?.startingTurns || [])}`;
    }

    public async interactText(scenario: any, conversationHistory: any[], latestUserMessage: string, userName?: string): Promise<string> {
        try {
            const messages = conversationHistory.map((h: any) => ({
                role: h.speaker === 'AI' ? 'assistant' as const : 'user' as const,
                content: h.line,
            }));
            messages.push({ role: 'user' as const, content: latestUserMessage });

            const response = await llmService.chat(this.getSystemPrompt(scenario, userName), messages);
            return sanitizePlaceholders(response || '', userName);
        } catch (error) {
            console.error("[VoiceAgent] Text interaction failed:", error);
            throw error;
        }
    }

    public async interactAudioStream(scenario: any, conversationHistory: any[], pcmBuffer: Buffer, userName?: string): Promise<{ userTranscript: string; aiResponse: string; botAudioUrl?: string }> {
        try {
            const audio_base64 = pcmBuffer.toString('base64');
            const INTERACT_URL = config.modalInteractUrl;

            console.log("[VoiceAgent] Sending to Unified Cloud Pipeline...");
            const response = await fetch(INTERACT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_base64,
                    scenario_str: JSON.stringify(scenario),
                    conversation_history_str: JSON.stringify(conversationHistory),
                    speaker: "NF",
                    user_name: userName || 'bạn'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Cloud Pipeline Error (${response.status}): ${errorText}`);
            }

            const result: any = await response.json();
            return {
                userTranscript: result.userTranscript,
                aiResponse: sanitizePlaceholders(result.aiResponse || '', userName),
                botAudioUrl: result.botAudioUrl
            };
        } catch (error) {
            console.error("[VoiceAgent] Unified interaction failed:", error);
            throw error;
        }
    }
}
