import { FullScenarioContext, EvaluationRubric } from '../types/api.contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = {
    /**
     * Gọi BrainAgent để phân tích kịch bản.
     */
    async setupScenario(userGoal: string): Promise<FullScenarioContext> {
        const res = await fetch(`${API_BASE_URL}/practice/scenario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userGoal }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Setup failed [${res.status}]: ${errBody}`);
        }
        const json = await res.json();
        return json.data;
    },

    /**
     * Gửi Audio Stream/Blob lên backend để VoiceAgent phản hồi và upload Supabase.
     */
    async interactAudio(
        audioBlob: Blob,
        scenario: any,
        history: any[]
    ): Promise<{ botResponse: string; audioUploadedKey: string; userTranscript: string; botAudioUrl?: string }> {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'record.webm');
        formData.append('scenarioStr', JSON.stringify(scenario));
        formData.append('conversationHistoryStr', JSON.stringify(history));

        const res = await fetch(`${API_BASE_URL}/practice/interact`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Interact failed [${res.status}]: ${errBody}`);
        }

        const data = await res.json();
        return {
            botResponse: data.botResponse,
            audioUploadedKey: data.audioUploadedKey,
            userTranscript: data.userTranscript || '(Không bắt được văn bản)',
            botAudioUrl: data.botAudioUrl
        };
    },

    /**
     * Đóng băng phiên và gọi AnalystAgent phân tích kết quả Fallacy & Lời Khuyên.
     */
    async evaluateSession(
        rubric: EvaluationRubric,
        audioFileKeys: string[],
        fullTranscript: string
    ): Promise<any> {
        const res = await fetch(`${API_BASE_URL}/practice/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rubricStr: JSON.stringify(rubric),
                audioFileKeys,
                fullTranscript,
            }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Evaluate failed [${res.status}]: ${errBody}`);
        }
        const json = await res.json();
        return json.evaluationReport;
    },

    /**
     * Scaffolding Hints — "Ni ơi, cứu!"
     * Gọi BrainAgent để tạo 3 gợi ý từ khóa khi user bí.
     */
    async getHints(scenario: any, conversationHistory: any[]): Promise<string[]> {
        const res = await fetch(`${API_BASE_URL}/practice/hints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scenarioStr: JSON.stringify(scenario),
                conversationHistoryStr: JSON.stringify(conversationHistory),
            }),
        });
        if (!res.ok) {
            return ["Hãy thử lại", "Nói về bản thân", "Hỏi thêm câu hỏi"];
        }
        const json = await res.json();
        return json.hints;
    },
};
