import { LlmService } from '../services/llm.service';
import { TranscriptionService } from '../services/transcription.service';
import { PromptService, Lang } from '../services/prompt.service';
import { getGenAI, SAFETY_SETTINGS } from '../config/genai';
import { config } from '../config/env';
import { sanitizePlaceholders } from '../utils/sanitize';

type LangParam = Lang | string;
function toLang(language?: LangParam): Lang {
    return language === 'en' ? 'en' : 'vi';
}

const llmService = new LlmService();

/**
 * Returns true if the STT output looks like a hallucinated instruction text
 * (Gemini echoing back the transcription prompt when audio is silent/empty).
 */
function isHallucinatedTranscript(text: string): boolean {
    const HALLUCINATION_MARKERS = [
        'Nghe đoạn audio này và viết lại',
        'Transcribe this audio',
        'viết lại CHÍNH XÁC',
        'không nghe rõ đoạn nào',
    ];
    return HALLUCINATION_MARKERS.some(m => text.includes(m));
}


export class VoiceAgent {
    private promptService: PromptService;
    private transcriptionService: TranscriptionService;

    constructor() {
        this.promptService = new PromptService();
        this.transcriptionService = new TranscriptionService();
    }

    public async interactText(scenario: any, conversationHistory: any[], latestUserMessage: string, userName?: string, language: LangParam = 'vi'): Promise<string> {
        const lang = toLang(language);
        try {
            const messages = conversationHistory.map((h: any) => ({
                role: h.speaker === 'AI' ? 'assistant' as const : 'user' as const,
                content: h.line,
            }));
            messages.push({ role: 'user' as const, content: latestUserMessage });

            const systemPrompt = this.promptService.buildConversationPrompt(scenario, userName, lang);
            const response = await llmService.chat(systemPrompt, messages);
            return sanitizePlaceholders(response || '', userName);
        } catch (error) {
            console.error("[VoiceAgent] Text interaction failed:", error);
            throw error;
        }
    }

    public async interactAudioStream(scenario: any, conversationHistory: any[], pcmBuffer: Buffer, userName?: string): Promise<{ userTranscript: string; aiResponse: string; botAudioUrl?: string }> {
        try {
            const audio_base64 = pcmBuffer.toString('base64');
            const INTERACT_URL = config.voicePipelineProvider === 'runpod' && config.runpodInteractUrl
                ? config.runpodInteractUrl
                : config.modalInteractUrl;

            console.log(`[VoiceAgent] Sending to ${config.voicePipelineProvider.toUpperCase()} pipeline...`);
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

    /**
     * Dual-character HTTP round-trip via AUDIO: STT → parallel relevance scoring → pick winner → TTS.
     * Each character independently scores its relevance (0-100); highest score responds.
     */
    public async interactDualCharacter(
        scenario: any,
        characters: any[],
        conversationHistory: any[],
        audioBuffer: Buffer,
        mimeType: string,
        userName?: string,
        language: LangParam = 'vi'
    ): Promise<{
        userTranscript: string;
        aiResponse: string;
        characterId: string;
        characterName: string;
        audioBase64?: string;
        audioMimeType?: string;
    }> {
        const char1 = characters[0];

        // Step 1: STT via Gemini multimodal
        const rawTranscript = await this.transcriptionService.transcribeAudio(audioBuffer, mimeType);

        // Guard: ignore hallucinated prompt text (happens when audio is silent/empty)
        if (!rawTranscript.trim() || isHallucinatedTranscript(rawTranscript)) {
            console.log(`[DualChar] STT empty or hallucinated — skipping turn`);
            return { userTranscript: '', aiResponse: '', characterId: char1.id, characterName: char1.name };
        }

        console.log(`[DualChar] STT: "${rawTranscript.slice(0, 80)}"`);

        // Steps 2-4: Score + respond
        const responded = await this._dualCharRespond(scenario, characters, conversationHistory, rawTranscript, userName, language);
        return { userTranscript: rawTranscript, ...responded };
    }

    /**
     * Dual-character HTTP round-trip via TEXT (no audio).
     * Same scoring + TTS logic, but accepts userMessage directly — no STT needed.
     */
    public async interactDualCharText(
        scenario: any,
        characters: any[],
        conversationHistory: any[],
        userMessage: string,
        userName?: string,
        language: LangParam = 'vi'
    ): Promise<{
        userTranscript: string;
        aiResponse: string;
        characterId: string;
        characterName: string;
        audioBase64?: string;
        audioMimeType?: string;
    }> {
        if (!userMessage.trim()) {
            const char1 = characters[0];
            return { userTranscript: '', aiResponse: '', characterId: char1.id, characterName: char1.name };
        }

        const responded = await this._dualCharRespond(scenario, characters, conversationHistory, userMessage, userName, language);
        return { userTranscript: userMessage, ...responded };
    }

    /**
     * Shared core: parallel character scoring → pick winner → TTS.
     */
    private async _dualCharRespond(
        scenario: any,
        characters: any[],
        conversationHistory: any[],
        userMessage: string,
        userName?: string,
        language: LangParam = 'vi'
    ): Promise<{
        aiResponse: string;
        characterId: string;
        characterName: string;
        audioBase64?: string;
        audioMimeType?: string;
    }> {
        const lang = toLang(language);
        const char1 = characters[0];
        const char2 = characters[1];
        const goals = (scenario.goals || []).join(', ');
        const recentHistory = conversationHistory
            .slice(-4)
            .map(t => `${t.character_name || t.speaker}: ${t.line}`)
            .join('\n');

        // Parallel scoring
        const [result1, result2] = await Promise.all([
            this.scoreCharacter(char1, char2, goals, recentHistory, userMessage, lang),
            this.scoreCharacter(char2, char1, goals, recentHistory, userMessage, lang),
        ]);

        console.log(`[DualChar] ${char1.name} score=${result1.score}, ${char2.name} score=${result2.score}`);

        // Pick winner (char1 wins ties)
        const winnerIdx = result2.score > result1.score ? 1 : 0;
        const winner = characters[winnerIdx];
        const winnerResult = winnerIdx === 0 ? result1 : result2;
        const aiResponse = sanitizePlaceholders(winnerResult.response, userName);
        console.log(`[DualChar] Winner: ${winner.name} (voice_idx=${winnerIdx}) → "${aiResponse.slice(0, 60)}"`);

        // TTS via Modal NeuTTS endpoint
        let audioBase64: string | undefined;
        let audioMimeType: string | undefined;
        try {
            const ttsResult = await this.generateTTS(aiResponse, winnerIdx);
            audioBase64 = ttsResult.data;
            audioMimeType = ttsResult.mimeType;
            console.log(`[DualChar] TTS success (${ttsResult.mimeType}, ${Math.round(ttsResult.data.length * 3 / 4 / 1024)}kB)`);
        } catch (ttsErr) {
            console.warn(`[DualChar] TTS failed (text-only fallback):`, (ttsErr as any)?.message);
        }

        return { aiResponse, characterId: winner.id, characterName: winner.name, audioBase64, audioMimeType };
    }

    private async scoreCharacter(
        char: any,
        otherChar: any,
        goals: string,
        recentHistory: string,
        userMessage: string,
        language: Lang = 'vi'
    ): Promise<{ score: number; response: string }> {
        const prompt = this.promptService.buildCharacterScoringPrompt(
            char, otherChar, goals, recentHistory, userMessage, language
        );

        try {
            const res = await getGenAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.3,
                    safetySettings: SAFETY_SETTINGS,
                }
            });

            const text = (res.text || '{}').trim();
            // Strip markdown code fences if present
            const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            const parsed = JSON.parse(jsonStr);
            return {
                score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50,
                response: typeof parsed.response === 'string' ? parsed.response : '',
            };
        } catch (err) {
            console.warn(`[DualChar] Score call failed for ${char.name}:`, (err as any)?.message);
            const fallback = language === 'en'
                ? "Sorry, could you say that again?"
                : 'Xin lỗi, bạn có thể nói lại không?';
            return { score: 50, response: fallback };
        }
    }

    /** Public TTS synthesis — used by /practice/tts for initial room greeting */
    public async synthesizeTTS(text: string, charIdx: number): Promise<{ data: string; mimeType: string }> {
        return this.generateTTS(text, charIdx);
    }

    private async generateTTS(text: string, charIdx: number): Promise<{ data: string; mimeType: string }> {
        // RunPod consolidates both characters into one Pod (only char1 voice for now);
        // Modal keeps separate always-on containers per character.
        const useRunpod = config.voicePipelineProvider === 'runpod' && config.runpodTtsUrlChar1;
        const url = useRunpod
            ? config.runpodTtsUrlChar1   // RunPod: single TTS endpoint
            : (charIdx === 0 ? config.modalTtsUrlChar1 : config.modalTtsUrlChar2);

        if (!url) {
            const envVar = useRunpod
                ? 'RUNPOD_TTS_URL_CHAR1'
                : (charIdx === 0 ? 'MODAL_TTS_URL_CHAR1' : 'MODAL_TTS_URL_CHAR2');
            throw new Error(`${envVar} not configured in backend/.env`);
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`${config.voicePipelineProvider} TTS char${charIdx} ${res.status}: ${errText}`);
        }

        const json: any = await res.json();
        return { data: json.audio_base64, mimeType: json.mimeType || 'audio/wav' };
    }
}
