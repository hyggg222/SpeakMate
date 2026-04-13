import { FullScenarioContext, EvaluationRubric } from '../types/api.contracts';
import { createClient } from '@/lib/supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Gets the current Supabase session token for authenticated API calls.
 * Returns auth headers if logged in, empty object for guest mode.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
    try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            return { 'Authorization': `Bearer ${session.access_token}` };
        }
    } catch {
        // Guest mode — no auth
    }
    return {};
}

export const apiClient = {
    /**
     * Gọi BrainAgent để phân tích kịch bản.
     */
    async setupScenario(userGoal: string): Promise<FullScenarioContext> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/scenario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
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
     * Create livekit session token
     */
    async createLivekitSession(scenario: any, history: any[]): Promise<{ token: string; roomName: string; livekitUrl: string }> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/livekit-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
                scenarioStr: JSON.stringify(scenario),
                conversationHistoryStr: JSON.stringify(history)
            }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`LiveKit Session failed [${res.status}]: ${errBody}`);
        }
        return await res.json();
    },

    /**
     * Gửi Audio Stream/Blob lên backend để VoiceAgent phản hồi và upload Supabase.
     */
    async interactAudio(
        audioBlob: Blob,
        scenario: any,
        history: any[]
    ): Promise<{ botResponse: string; audioUploadedKey: string; userTranscript: string; botAudioUrl?: string }> {
        const authHeaders = await getAuthHeaders();
        const formData = new FormData();
        formData.append('audio', audioBlob, 'record.webm');
        formData.append('scenarioStr', JSON.stringify(scenario));
        formData.append('conversationHistoryStr', JSON.stringify(history));

        const res = await fetch(`${API_BASE_URL}/practice/interact`, {
            method: 'POST',
            headers: { ...authHeaders },
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
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
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
     */
    async getHints(scenario: any, conversationHistory: any[]): Promise<string[]> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/hints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
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

    /**
     * Adjusts an existing scenario with user modifications.
     */
    async adjustScenario(currentScenario: FullScenarioContext, adjustmentText: string): Promise<FullScenarioContext> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/scenario/adjust`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ currentScenario, adjustmentText }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Adjust scenario failed [${res.status}]: ${errBody}`);
        }
        const json = await res.json();
        return json.data;
    },

    /**
     * Gets context-aware suggestions based on the current scenario.
     */
    async getSuggestions(currentScenario: FullScenarioContext): Promise<string[]> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/scenario/suggestions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ currentScenario }),
        });
        if (!res.ok) {
            return ["Thêm nhân vật phản biện", "Bối cảnh hội trường lớn", "Khán giả là chuyên gia"];
        }
        const json = await res.json();
        return json.suggestions;
    },

    // ----------------------------------------------------------------
    // Dashboard / History endpoints (require auth)
    // ----------------------------------------------------------------

    async getUserSessions(limit = 20, offset = 0): Promise<any[]> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/sessions?limit=${limit}&offset=${offset}`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
    },

    async getSessionById(sessionId: string): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/sessions/${sessionId}`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    },

    async getUserStats(): Promise<{ totalSessions: number; completedSessions: number; averageScore: number; currentStreak: number } | null> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/stats`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    },
};
