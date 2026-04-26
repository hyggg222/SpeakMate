import { FullScenarioContext, EvaluationRubric } from '../types/api.contracts';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://speakmate-k26b.onrender.com/api';

/**
 * Module-level singleton Supabase client + cached token.
 * createBrowserClient uses an internal singleton (isSingleton flag),
 * but we also cache the token from onAuthStateChange so it's available
 * synchronously without needing to await getSession().
 */
let _cachedToken: string | null = null;
let _listenerSetUp = false;

function ensureAuthListener() {
    if (_listenerSetUp) return;
    _listenerSetUp = true;
    try {
        const supabase = createClient();
        supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            _cachedToken = session?.access_token ?? null;
        });
        // Also try to hydrate immediately
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
            if (session?.access_token) {
                _cachedToken = session.access_token;
            }
        });
    } catch {
        // Ignore — SSR or guest mode
    }
}

/**
 * Reads the Supabase access_token directly from document.cookie.
 *
 * @supabase/ssr@0.10 stores session in chunked cookies:
 *   name:  sb-<ref>-auth-token  (+ .0, .1, .2 … for large sessions)
 *   value: "base64-" + base64url(JSON)
 *
 * We reassemble chunks, strip the "base64-" prefix, decode base64url, parse JSON.
 */
function getTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const ref = supabaseUrl.replace('https://', '').split('.')[0];
        const baseName = `sb-${ref}-auth-token`;

        const cookies: Record<string, string> = {};
        document.cookie.split(';').forEach(c => {
            const [k, ...v] = c.trim().split('=');
            if (k) cookies[k.trim()] = decodeURIComponent(v.join('='));
        });

        // Reassemble chunks: base cookie, then .0, .1, .2, ...
        let raw = cookies[baseName] || '';
        for (let i = 0; i < 10; i++) {
            const chunk = cookies[`${baseName}.${i}`];
            if (chunk === undefined) break;
            raw += chunk;
        }

        if (!raw) return null;

        // Strip "base64-" prefix that @supabase/ssr adds
        const BASE64_PREFIX = 'base64-';
        if (raw.startsWith(BASE64_PREFIX)) {
            raw = raw.substring(BASE64_PREFIX.length);
        }

        // Decode base64url → standard base64 → string
        const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(base64);
        const parsed = JSON.parse(decoded);
        return parsed?.access_token || null;
    } catch {
        return null;
    }
}

function getLangHeader(): Record<string, string> {
    const lang = typeof window !== 'undefined'
        ? localStorage.getItem('speakmate_language') || 'vi'
        : 'vi'
    return { 'X-Language': lang }
}

/**
 * Gets the current Supabase session token for authenticated API calls.
 * Returns auth headers if logged in, empty object for guest mode.
 *
 * Uses 3 strategies in order:
 * 1. Cached token from onAuthStateChange listener (fastest, synchronous)
 * 2. supabase.auth.getSession() (works after hydration)
 * 3. Direct cookie parse (reliable fallback — reads document.cookie directly)
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
    ensureAuthListener();
    const langHeader = getLangHeader();
    try {
        // Strategy 1: cached token from auth state listener
        if (_cachedToken) {
            return { 'Authorization': `Bearer ${_cachedToken}`, ...langHeader };
        }

        // Strategy 2: supabase getSession
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            _cachedToken = session.access_token;
            return { 'Authorization': `Bearer ${session.access_token}`, ...langHeader };
        }

        // Strategy 3: parse cookie directly
        const cookieToken = getTokenFromCookie();
        if (cookieToken) {
            _cachedToken = cookieToken;
            return { 'Authorization': `Bearer ${cookieToken}`, ...langHeader };
        }
    } catch {
        // Guest mode — no auth
    }
    return langHeader;
}

export const apiClient = {
    /**
     * Gọi BrainAgent để phân tích kịch bản.
     */
    async setupScenario(userGoal: string): Promise<FullScenarioContext> {
        try {
            const authHeaders = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/practice/scenario`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ userGoal }),
            });
            if (res.status === 400) {
                const body = await res.json().catch(() => ({}));
                if (body.filtered) {
                    const filterErr = new Error(body.error || 'Nội dung không phù hợp.');
                    (filterErr as any).filtered = true;
                    (filterErr as any).category = body.category;
                    throw filterErr;
                }
                throw new Error(`Setup failed [400]: ${body.error || 'Bad request'}`);
            }
            if (!res.ok) {
                throw new Error(`Setup failed [${res.status}]`);
            }
            const json = await res.json();
            return json.data;
        } catch (err: any) {
            if (err?.filtered) throw err; // Re-throw filter errors — don't mock
            console.warn('[apiClient] setupScenario API failed, using mock:', err);
            // Mock fallback when Gemini API unavailable (429/network)
            return {
                scenario: {
                    scenarioName: userGoal || 'Thảo luận với giảng viên về dự án nhóm',
                    topic: userGoal || 'Trình bày ý kiến cá nhân trong buổi thảo luận học thuật',
                    interviewerPersona: 'Giảng viên đại học, thân thiện nhưng hay đặt câu hỏi phản biện. Tên là Thầy Minh.',
                    goals: [
                        'Diễn đạt ý kiến rõ ràng bằng tiếng Anh',
                        'Phản biện có cấu trúc khi bị hỏi ngược',
                        'Giữ tự tin và không ngập ngừng',
                    ],
                    startingTurns: [
                        { speaker: 'AI' as const, line: 'Good morning! So, let\'s discuss your group project. Can you walk me through your progress so far?' },
                        { speaker: 'User' as const, line: '', expectedUserResponse: 'technical' as const },
                    ],
                },
                evalRules: {
                    categories: [
                        { category: 'Fluency', weight: 30, description: 'Độ trôi chảy khi nói' },
                        { category: 'Clarity', weight: 25, description: 'Độ rõ ràng của ý' },
                        { category: 'Relevance', weight: 25, description: 'Liên quan đến chủ đề' },
                        { category: 'Confidence', weight: 20, description: 'Sự tự tin trong giao tiếp' },
                    ],
                },
            } as FullScenarioContext;
        }
    },

    /**
     * Create livekit session token
     */
    async createGeminiLiveSession(scenario: any): Promise<{ token: string; roomName: string; livekitUrl: string }> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/gemini-live-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ scenarioStr: JSON.stringify(scenario) }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Gemini Live Session failed [${res.status}]: ${errBody}`);
        }
        return await res.json();
    },

    async createGeminiDirectToken(scenario: any): Promise<{ token: string; model: string }> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/gemini-direct-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ scenarioStr: JSON.stringify(scenario) }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Gemini Direct Token failed [${res.status}]: ${errBody}`);
        }
        return await res.json();
    },

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

    /** Synthesize TTS for a specific text + character index via Modal NeuTTS. */
    async synthesizeSpeech(text: string, charIdx: number): Promise<{ audioBase64: string; mimeType: string }> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ text, charIdx }),
        });
        if (!res.ok) throw new Error(`TTS failed [${res.status}]`);
        return await res.json();
    },

    /**
     * Đóng băng phiên và gọi AnalystAgent phân tích kết quả Fallacy & Lời Khuyên.
     */
    async evaluateSession(
        rubric: EvaluationRubric,
        audioFileKeys: string[],
        fullTranscript: string,
        sessionId?: string
    ): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
                rubricStr: JSON.stringify(rubric),
                audioFileKeys,
                fullTranscript,
                sessionId,
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
    // Mentor Ni Chat
    // ----------------------------------------------------------------

    async sendMentorChatMessage(message: string): Promise<{ sessionId: string; message: any }> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/mentor-chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ message }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Mentor chat failed [${res.status}]: ${errBody}`);
        }
        const json = await res.json();
        return json.data;
    },

    async getMentorChatHistory(limit?: number): Promise<{ sessionId: string; messages: any[] }> {
        const authHeaders = await getAuthHeaders();
        const qs = limit ? `?limit=${limit}` : '';
        const res = await fetch(`${API_BASE_URL}/mentor-chat/history${qs}`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return { sessionId: '', messages: [] };
        const json = await res.json();
        return json.data;
    },

    async clearMentorChatHistory(): Promise<boolean> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/mentor-chat/clear`, {
            method: 'DELETE',
            headers: { ...authHeaders },
        });
        return res.ok;
    },

    // ----------------------------------------------------------------
    // Phase 3: Mentor & Gamification
    // ----------------------------------------------------------------
    async getEvalComment(evalReport: any, storyCoverage?: any[], streak?: number, previousScore?: number): Promise<string> {
        try {
            const authHeaders = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/practice/mentor-eval-comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ evalReport, storyCoverage, streak, previousScore }),
            });
            if (!res.ok) throw new Error('Eval comment failed');
            const json = await res.json();
            return json.data.comment;
        } catch {
            return 'Phiên luyện tập vừa rồi có nhiều điểm hay đó. Xem chi tiết ở trên và thử áp dụng vào thực tế nhé!';
        }
    },

    async chatWithMentor(scenario: any, evaluationReport: any, userMessage: string, conversationHistory: any[]): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/mentor-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ scenario, evaluationReport, userMessage, conversationHistory })
        });
        if (!res.ok) throw new Error("Mentor chat failed");
        const json = await res.json();
        return json.data;
    },

    async generateChallenge(sessionId: string, scenario?: any, evalReport?: any): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const body: any = { sessionId };
        if (scenario) body.scenarioStr = JSON.stringify(scenario);
        if (evalReport) body.evaluationStr = JSON.stringify(evalReport);
        const res = await fetch(`${API_BASE_URL}/practice/challenge/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Generate challenge failed');
        }
        const json = await res.json();
        return json.data;
    },

    async getUserChallenges(): Promise<any[]> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/challenges`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
    },

    async setChallengeDeadline(challengeId: string, deadline: string): Promise<boolean> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/challenge/deadline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ challengeId, deadline })
        });
        return res.ok;
    },

    async reportChallenge(challengeId: string, audioBlob?: Blob): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const formData = new FormData();
        formData.append('challengeId', challengeId);
        if (audioBlob) {
            formData.append('audio', audioBlob, 'report.webm');
        }

        const res = await fetch(`${API_BASE_URL}/practice/challenge/report`, {
            method: 'POST',
            headers: { ...authHeaders },
            body: formData
        });
        if (!res.ok) throw new Error("Challenge report failed");
        return await res.json();
    },

    async submitFeedbackVoice(challengeId: string, completed: boolean, audioBlob: Blob | File): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const fd = new FormData();
        fd.append('challengeId', challengeId);
        fd.append('completed', String(completed));
        const fileName = audioBlob instanceof File ? audioBlob.name : 'feedback.webm';
        fd.append('audio', audioBlob, fileName);
        const res = await fetch(`${API_BASE_URL}/practice/challenge/feedback/voice`, {
            method: 'POST',
            headers: { ...authHeaders },
            body: fd,
        });
        if (!res.ok) throw new Error("Voice feedback failed");
        const json = await res.json();
        return json.data;
    },

    async submitFeedbackForm(challengeId: string, data: {
        completed: boolean;
        situation?: string;
        emotionBefore?: string;
        emotionAfter?: string;
        whatUserSaid?: string;
        othersReaction?: string;
        whatWorked?: string;
        whatStuck?: string;
    }): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/challenge/feedback/form`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ challengeId, ...data }),
        });
        if (!res.ok) throw new Error("Form feedback failed");
        const json = await res.json();
        return json.data;
    },

    /**
     * Free share — no challenge required.
     * Pass audioBlob for voice/upload mode, or formData for text mode.
     */
    async submitFeedbackFree(audioBlob?: Blob | File, formData?: Record<string, any>): Promise<any> {
        const authHeaders = await getAuthHeaders();
        if (audioBlob) {
            const fd = new FormData();
            const name = audioBlob instanceof File ? audioBlob.name : 'share.webm';
            fd.append('audio', audioBlob, name);
            if (formData) {
                Object.entries(formData).forEach(([k, v]) => {
                    if (v != null) fd.append(k, String(v));
                });
            }
            const res = await fetch(`${API_BASE_URL}/practice/feedback/free`, {
                method: 'POST',
                headers: { ...authHeaders },
                body: fd,
            });
            if (!res.ok) throw new Error('Free feedback failed');
            const json = await res.json();
            return json.data;
        } else {
            const res = await fetch(`${API_BASE_URL}/practice/feedback/free`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(formData || {}),
            });
            if (!res.ok) throw new Error('Free feedback failed');
            const json = await res.json();
            return json.data;
        }
    },

    async adjustChallenge(challengeId: string, userRequest: string, sessionId?: string): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/challenge/adjust`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ challengeId, userRequest, sessionId }),
        });
        if (!res.ok) throw new Error('Adjust challenge failed');
        const json = await res.json();
        return json.data;
    },

    async skipChallenge(challengeId: string): Promise<boolean> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/challenge/skip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ challengeId }),
        });
        return res.ok;
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
    async getUserProgress(): Promise<any | null> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/progress`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    },

    async getProgressDetail(): Promise<{ userProgress: any; gymHistory: any[]; realworldHistory: any[] } | null> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/progress/detail`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    },

    async getPreviousMetrics(sessionId: string): Promise<any | null> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/practice/previous-metrics?sessionId=${encodeURIComponent(sessionId)}`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    },

    // ----------------------------------------------------------------
    // Story Bank
    // ----------------------------------------------------------------

    async chatForStory(framework: string, initialInput: string, inputMethod: string, chatMessages: { role: string; content: string; fieldTargeted?: string | null }[]): Promise<{ chatMessage: string; fieldTargeted: string | null }> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/storybank/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ framework, initialInput, inputMethod, chatMessages }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Chat failed [${res.status}]: ${errBody}`);
        }
        const json = await res.json();
        return json.data;
    },

    async structureStory(rawInput: string, inputMethod: string, followUpAnswers?: string[], chatHistory?: { role: string; content: string; fieldTargeted?: string | null }[], framework?: string): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/storybank/structure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ rawInput, inputMethod, followUpAnswers, chatHistory, framework }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Structure story failed [${res.status}]: ${errBody}`);
        }
        const json = await res.json();
        return json.data;
    },

    async saveStory(data: any): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/storybank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Save story failed [${res.status}]: ${errBody}`);
        }
        const json = await res.json();
        return json.data;
    },

    async updateStory(storyId: string, data: any): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/storybank/${storyId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Update story failed [${res.status}]: ${errBody}`);
        }
        const json = await res.json();
        return json.data;
    },

    async deleteStory(storyId: string): Promise<void> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/storybank/${storyId}`, {
            method: 'DELETE',
            headers: { ...authHeaders },
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Delete story failed [${res.status}]: ${errBody}`);
        }
    },

    async getStory(storyId: string): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/storybank/${storyId}`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    },

    async listStories(params?: { tags?: string; status?: string; search?: string; limit?: number; offset?: number }): Promise<{ data: any[]; total: number }> {
        const authHeaders = await getAuthHeaders();
        const query = new URLSearchParams();
        if (params?.tags) query.set('tags', params.tags);
        if (params?.status) query.set('status', params.status);
        if (params?.search) query.set('search', params.search);
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.offset) query.set('offset', String(params.offset));
        const qs = query.toString();
        const res = await fetch(`${API_BASE_URL}/storybank${qs ? `?${qs}` : ''}`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) return { data: [], total: 0 };
        const json = await res.json();
        return { data: json.data || [], total: json.total || 0 };
    },

    async compareWithStoryBank(storyId: string, sessionId: string | null, transcript: string): Promise<any> {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/storybank/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ storyId, sessionId, transcript }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Compare failed [${res.status}]: ${errBody}`);
        }
        const json = await res.json();
        return json.data;
    },

    // ----------------------------------------------------------------
    // Real-world Audio Upload & Analysis
    // ----------------------------------------------------------------

    async uploadRealWorldAudio(audioFile: File, contextDescription: string): Promise<{ transcript: string; evaluation: any }> {
        const authHeaders = await getAuthHeaders();
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('contextDescription', contextDescription);

        const res = await fetch(`${API_BASE_URL}/practice/realworld/upload`, {
            method: 'POST',
            headers: { ...authHeaders },
            body: formData,
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(errBody.error || `Upload failed [${res.status}]`);
        }
        return await res.json();
    },

    // ----------------------------------------------------------------
    // Assets
    // ----------------------------------------------------------------

    async uploadAsset(imageFile: File, targetPath: string): Promise<{ success: boolean; url: string }> {
        const authHeaders = await getAuthHeaders();
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('targetPath', targetPath);

        const res = await fetch(`${API_BASE_URL}/practice/mentor/avatar`, {
            method: 'POST',
            headers: { ...authHeaders },
            body: formData,
        });
        if (!res.ok) throw new Error("Asset upload failed");
        return await res.json();
    },
};
