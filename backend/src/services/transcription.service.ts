/**
 * TranscriptionService — transcribes audio using Gemini 2.5 Flash.
 * Sends audio as inline_data, returns Vietnamese transcript.
 */
import { getGenAI, GEMINI_MODEL, SAFETY_SETTINGS } from '../config/genai';

export class TranscriptionService {
    private modelName = GEMINI_MODEL;

    /**
     * Transcribe audio buffer to text using Gemini multimodal.
     * @param audioBuffer - Raw audio bytes (WAV, MP3, M4A)
     * @param mimeType - MIME type of the audio (e.g. 'audio/wav', 'audio/mpeg')
     * @returns Transcribed text in Vietnamese
     */
    async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
        const audioB64 = audioBuffer.toString('base64');

        const response = await getGenAI().models.generateContent({
            model: this.modelName,
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType, data: audioB64 } },
                    { text: `Nghe đoạn audio này và viết lại CHÍNH XÁC những gì người nói, bằng tiếng Việt.
Yêu cầu:
- Ghi lại nguyên văn, không tóm tắt, không suy đoán.
- Thêm dấu câu tự nhiên.
- Nếu có nhiều người nói, phân biệt bằng "Người 1:", "Người 2:", v.v.
- Nếu không nghe rõ đoạn nào, ghi: [không nghe rõ].
- Chỉ trả về transcript, không giải thích thêm.` }
                ]
            }],
            config: {
                temperature: 0.1,
                safetySettings: SAFETY_SETTINGS,
            }
        });

        return (response.text || '').trim();
    }
}
