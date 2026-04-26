import { Request, Response } from 'express';
import { BrainAgent } from '../agents/brain.agent';
import { VoiceAgent } from '../agents/voice.agent';
import { AnalystAgent } from '../agents/analyst.agent';
import { MentorAgent } from '../agents/mentor.agent';
import { StorageService } from '../services/storage.service';
import { DatabaseService } from '../services/database.service';
import { AudioService } from '../services/audio.service';
import { LiveKitService } from '../services/livekit.service';
import { ContentFilterService } from '../services/content-filter.service';
import { TranscriptionService } from '../services/transcription.service';
import { FullScenarioContext } from '../contracts/data.contracts';
import { config } from '../config/env';
import fetch from 'node-fetch';

const brainAgent = new BrainAgent();
const voiceAgent = new VoiceAgent();
const analystAgent = new AnalystAgent();
const mentorAgent = new MentorAgent();
const storageService = new StorageService();
const databaseService = new DatabaseService();
const audioService = new AudioService();
const livekitService = new LiveKitService();
const contentFilter = new ContentFilterService();
const transcriptionService = new TranscriptionService();

/**
 * Controller handling all business logic for the practice sessions.
 * Acts as the orchestrator between the Frontend and the three core AI Agents:
 * BrainAgent (Context Creation), VoiceAgent (Interactive Conversation), and AnalystAgent (Evaluation).
 */
export class PracticeController {

    // [Step 474 setupScenario] ...
    public async setupScenario(req: Request, res: Response): Promise<void> {
        try {
            const { userGoal } = req.body;
            if (!userGoal) {
                res.status(400).json({ error: 'userGoal is required' });
                return;
            }

            const filterResult = contentFilter.filterContent(userGoal);
            if (!filterResult.safe) {
                console.warn(`[ContentFilter] setupScenario blocked: ${filterResult.category}`);
                res.status(400).json({ error: filterResult.reason, filtered: true });
                return;
            }

            const scenarioContext: FullScenarioContext = await brainAgent.generateScenario(userGoal);
            res.status(200).json({ data: scenarioContext });
        } catch (err: any) {
            console.error("[PracticeController] Setup scenario failed:", err);
            res.status(500).json({ error: 'Failed to generate scenario' });
        }
    }

    // [Step 474 createLivekitSession] ...
    public async createLivekitSession(req: Request, res: Response): Promise<void> {
        try {
            const { scenarioStr, conversationHistoryStr } = req.body;
            const userName = req.user?.email?.split('@')[0] || 'bạn';
            const identity = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const roomName = `speakmate-${Date.now()}`;

            let scenarioContext;
            try {
                const scenario = JSON.parse(scenarioStr || '{}');
                scenarioContext = { scenario, evalRules: { categories: [] } };
            } catch {
                scenarioContext = { scenario: {}, evalRules: { categories: [] } };
            }

            // DB session is optional — don't block LiveKit if Supabase is down
            let sessionId = `local_${Date.now()}`;
            try {
                sessionId = await databaseService.createSession(
                    req.user?.id || null,
                    'safe',
                    scenarioContext
                );
            } catch (dbErr) {
                console.warn("[PracticeController] DB session creation failed (non-blocking):", (dbErr as any)?.message);
            }

            const token = await livekitService.generateToken(roomName, identity, sessionId);

            // Fire-and-forget: wake Modal LiveKit agent worker
            if (config.modalWakeAgentUrl) {
                fetch(config.modalWakeAgentUrl, { method: 'POST' })
                    .then(r => {
                        if (!r.ok) console.error(`[LiveKit] Wake agent returned ${r.status}. App may be stopped — run: modal deploy modal_pipeline.py`);
                    })
                    .catch(e => console.warn('[LiveKit] Wake agent call failed:', e));
            }

            res.status(200).json({
                token,
                roomName,
                sessionId,
                livekitUrl: config.livekitUrl
            });
        } catch (err) {
            console.error("[PracticeController] LiveKit session creation failed:", err);
            res.status(500).json({ error: 'Failed to create LiveKit session' });
        }
    }

    // Gemini Live Pipeline (v3) — creates room + dispatches "gemini-live" local agent
    public async createGeminiLiveSession(req: Request, res: Response): Promise<void> {
        try {
            const { scenarioStr } = req.body;
            const identity = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const roomName = `speakmate-live-${Date.now()}`;

            let scenarioContext;
            try {
                const scenario = JSON.parse(scenarioStr || '{}');
                scenarioContext = { scenario, evalRules: { categories: [] } };
            } catch {
                scenarioContext = { scenario: {}, evalRules: { categories: [] } };
            }

            // DB session is optional — don't block Gemini Live if Supabase is down
            let sessionId = `local_${Date.now()}`;
            try {
                sessionId = await databaseService.createSession(
                    req.user?.id || null, 'safe', scenarioContext
                );
            } catch (dbErr) {
                console.warn("[PracticeController] DB session creation failed (non-blocking):", (dbErr as any)?.message);
            }

            const token = await livekitService.generateToken(roomName, identity, sessionId);

            // Dispatch "gemini-live" agent — dynamic import to avoid ESM/CJS conflict
            const livekitApiUrl = config.livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
            const { AgentDispatchClient } = await import('livekit-server-sdk');
            const dispatchClient = new AgentDispatchClient(livekitApiUrl, config.livekitApiKey, config.livekitApiSecret);
            await dispatchClient.createDispatch(roomName, 'gemini-live');

            res.status(200).json({ token, roomName, sessionId, livekitUrl: config.livekitUrl });
        } catch (err) {
            console.error("[PracticeController] Gemini Live session creation failed:", err);
            res.status(500).json({ error: 'Failed to create Gemini Live session' });
        }
    }

    // Gemini Direct — ephemeral token for browser-to-Gemini WebSocket (no LiveKit)
    public async createGeminiDirectToken(req: Request, res: Response): Promise<void> {
        try {
            const { scenarioStr } = req.body;
            const scenario = JSON.parse(scenarioStr || '{}');

            const userName = req.user?.email?.split('@')[0] || 'bạn';
            const characters = scenario.characters || [];
            const isDual = characters.length >= 2;

            // Build system prompt — single or dual character
            const promptService = new (await import('../services/prompt.service')).PromptService();
            const systemPrompt = promptService.buildConversationPrompt(scenario, userName);

            // Voice selection based on character gender
            // Gemini voices: Kore (female), Aoede (female), Puck (male), Charon (male)
            const VOICE_MAP: Record<string, string> = {
                'female_1': 'Kore',
                'female_2': 'Aoede',
                'male_1': 'Puck',
                'male_2': 'Charon',
            };
            let voiceName = 'Kore'; // default
            if (isDual) {
                // Use first character's gender for primary voice
                const gender1 = characters[0]?.gender || 'female';
                voiceName = gender1 === 'male' ? 'Puck' : 'Kore';
            } else if (scenario.interviewerPersona) {
                // Heuristic: detect gender hints in persona
                const personaLower = (scenario.interviewerPersona || '').toLowerCase();
                if (personaLower.includes('anh ') || personaLower.includes('thầy') || personaLower.includes(' nam')) {
                    voiceName = 'Puck';
                }
            }

            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: config.geminiApiKey || config.geminiApiKeyFallback, httpOptions: { timeout: 30000 } });

            const tokenConfig = {
                config: {
                    uses: 1,
                    expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                    httpOptions: { apiVersion: 'v1alpha' },
                    liveConnectConstraints: {
                        model: 'gemini-3.1-flash-live-preview',
                        config: {
                            responseModalities: isDual ? ['TEXT' as any] : ['AUDIO' as any],
                            systemInstruction: systemPrompt,
                            speechConfig: isDual ? undefined : {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName }
                                }
                            }
                        }
                    }
                }
            };

            // Retry up to 3 times (Windows DNS can timeout on first attempt)
            let authToken: any;
            let lastErr: unknown;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    authToken = await ai.authTokens.create(tokenConfig);
                    break;
                } catch (e) {
                    lastErr = e;
                    console.warn(`[GeminiDirect] Token attempt ${attempt}/3 failed:`, (e as any)?.message);
                    if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }
            if (!authToken) throw lastErr;

            res.status(200).json({
                token: (authToken as any).name || (authToken as any).token || authToken,
                model: 'gemini-3.1-flash-live-preview',
                characters: isDual ? characters : undefined
            });
        } catch (err) {
            console.error("[PracticeController] Gemini Direct token creation failed:", err);
            res.status(500).json({ error: 'Failed to create Gemini Direct token' });
        }
    }

    // Text-only interaction (no audio — for testing in noisy environments)
    public async interactText(req: Request, res: Response): Promise<void> {
        try {
            const { scenarioStr, conversationHistoryStr, userMessage } = req.body;
            if (!userMessage) {
                res.status(400).json({ error: 'userMessage is required' });
                return;
            }

            const scenario = JSON.parse(scenarioStr || '{}');
            const history = JSON.parse(conversationHistoryStr || '[]');
            const userName = req.user?.email?.split('@')[0] || undefined;

            const response = await voiceAgent.interactText(scenario, history, userMessage, userName);
            res.status(200).json({ botResponse: response });
        } catch (err) {
            console.error("[PracticeController] Text interaction failed:", err);
            res.status(500).json({ error: 'Text interaction failed' });
        }
    }

    // [Step 474 interactAudio] ...
    public async interactAudio(req: Request, res: Response): Promise<void> {
        try {
            const audioFile = req.file;
            const { scenarioStr, conversationHistoryStr } = req.body;

            if (!audioFile) {
                res.status(400).json({ error: 'Audio file missing' });
                return;
            }

            const mimeType = audioFile.mimetype;
            let finalBuffer = audioFile.buffer;

            if (audioService.isTranscodingRequired(mimeType)) {
                console.log("Safari detected: Transcoding MP4 to PCM...");
                finalBuffer = await audioService.transcodeToPcm(audioFile.buffer);
            }

            const scenario = JSON.parse(scenarioStr || '{}');
            const history = JSON.parse(conversationHistoryStr || '[]');

            const userName = req.user?.email?.split('@')[0] || undefined;
            const result = await voiceAgent.interactAudioStream(scenario, history, finalBuffer, userName);
            const userTranscriptText = contentFilter.redactPII(result.userTranscript);
            const botResponseText = contentFilter.redactPII(result.aiResponse);

            const tempFileName = `session_${Date.now()}.wav`;
            storageService.uploadAudio(tempFileName, finalBuffer, 'audio/wav')
                .then(path => console.log('[PracticeController] Background upload success:', path))
                .catch(e => console.error('[PracticeController] Background upload failed:', e));

            const botAudioUrl = result.botAudioUrl || '';

            res.status(200).json({
                userTranscript: userTranscriptText,
                botResponse: botResponseText,
                audioUploadedKey: tempFileName,
                botAudioUrl: botAudioUrl
            });
        } catch (err) {
            console.error("[PracticeController] Audio interaction failed:", err);
            res.status(500).json({ error: 'Interaction failed' });
        }
    }

    // Dual-character text-only: skip STT, use userMessage directly → scoring → TTS
    public async interactDualCharText(req: Request, res: Response): Promise<void> {
        try {
            const { scenarioStr, conversationHistoryStr, userMessage } = req.body;
            if (!userMessage?.trim()) {
                res.status(400).json({ error: 'userMessage is required' });
                return;
            }

            const scenario = JSON.parse(scenarioStr || '{}');
            const history = JSON.parse(conversationHistoryStr || '[]');
            const characters = scenario.characters || [];

            if (characters.length < 2) {
                res.status(400).json({ error: 'Dual-char mode requires at least 2 characters in scenario' });
                return;
            }

            const userName = req.user?.email?.split('@')[0] || undefined;
            const result = await voiceAgent.interactDualCharText(
                scenario, characters, history, userMessage, userName
            );

            res.status(200).json({
                userTranscript: result.userTranscript,
                botResponse: result.aiResponse,
                characterId: result.characterId,
                characterName: result.characterName,
                audioBase64: result.audioBase64,
                audioMimeType: result.audioMimeType,
            });
        } catch (err) {
            console.error("[PracticeController] Dual-char text interaction failed:", err);
            res.status(500).json({ error: 'Dual-char text interaction failed' });
        }
    }

    // Synthesize TTS for a given text + character index (used for initial room greeting)
    public async synthesizeSpeech(req: Request, res: Response): Promise<void> {
        try {
            const { text, charIdx } = req.body;
            if (!text?.trim()) {
                res.status(400).json({ error: 'text is required' });
                return;
            }
            const result = await voiceAgent.synthesizeTTS(text, typeof charIdx === 'number' ? charIdx : 0);
            res.json({ audioBase64: result.data, mimeType: result.mimeType });
        } catch (err) {
            console.error('[PracticeController] synthesizeSpeech failed:', err);
            res.status(500).json({ error: 'TTS failed' });
        }
    }

    // Dual-character HTTP round-trip: STT → parallel scoring → winner TTS
    public async interactDualChar(req: Request, res: Response): Promise<void> {
        try {
            const audioFile = req.file;
            const { scenarioStr, conversationHistoryStr } = req.body;

            if (!audioFile) {
                res.status(400).json({ error: 'Audio file missing' });
                return;
            }

            const scenario = JSON.parse(scenarioStr || '{}');
            const history = JSON.parse(conversationHistoryStr || '[]');
            const characters = scenario.characters || [];

            if (characters.length < 2) {
                res.status(400).json({ error: 'Dual-char mode requires at least 2 characters in scenario' });
                return;
            }

            let mimeType = audioFile.mimetype;
            let finalBuffer = audioFile.buffer;

            if (audioService.isTranscodingRequired(mimeType)) {
                console.log("[DualChar] Safari detected: Transcoding MP4 to PCM...");
                finalBuffer = await audioService.transcodeToPcm(audioFile.buffer);
                mimeType = 'audio/wav';
            }

            const userName = req.user?.email?.split('@')[0] || undefined;
            const result = await voiceAgent.interactDualCharacter(
                scenario, characters, history, finalBuffer, mimeType, userName
            );

            res.status(200).json({
                userTranscript: result.userTranscript,
                botResponse: result.aiResponse,
                characterId: result.characterId,
                characterName: result.characterName,
                audioBase64: result.audioBase64,
                audioMimeType: result.audioMimeType,
            });
        } catch (err) {
            console.error("[PracticeController] Dual-char interaction failed:", err);
            res.status(500).json({ error: 'Dual-char interaction failed' });
        }
    }

    // [Step 474 evaluateSession] ...
    public async evaluateSession(req: Request, res: Response): Promise<void> {
        try {
            const { rubricStr, audioFileKeys, fullTranscript, sessionId } = req.body;
            const rubric = JSON.parse(rubricStr || '{}');

            const signedUrls = await Promise.all(
                (audioFileKeys || []).map((k: string) => storageService.getSignedUrl(k))
            );

            const report = await analystAgent.evaluateSession(rubric, signedUrls[0] || '', fullTranscript);

            // Compute avgResponseTime synchronously so it can be included in response
            let avgResponseTime = 0;
            if (sessionId) {
                avgResponseTime = await databaseService.computeAvgResponseTime(sessionId).catch(() => 0);
                // Attach to report so frontend can display it
                if (report.sessionMetrics) {
                    (report.sessionMetrics as any).avgResponseTime = avgResponseTime;
                }
            }

            // Fire-and-forget: save SessionMetrics + update UserProgress
            if (sessionId && req.user?.id) {
                const userId = req.user.id;
                (async () => {
                    try {
                        await databaseService.saveSessionMetrics(sessionId, userId, report.sessionMetrics, avgResponseTime);
                        await databaseService.updateUserProgress(userId, report.sessionMetrics, report);
                        await databaseService.saveEvaluation(sessionId, report);
                    } catch (e) {
                        console.error('[PracticeController] Metrics/progress save failed (non-blocking):', e);
                    }
                })();
            }

            res.status(200).json({ evaluationReport: report });
        } catch (err) {
            console.error("[PracticeController] Evaluation failed:", err);
            res.status(500).json({ error: 'Analysis failed' });
        }
    }

    public async getPreviousMetrics(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const { sessionId } = req.query;
            const data = await databaseService.getPreviousSessionMetrics(req.user.id, String(sessionId || '')).catch(() => null);
            res.status(200).json({ data });
        } catch (err) {
            res.status(200).json({ data: null });
        }
    }

    // [Step 474 generateHints] ...
    public async generateHints(req: Request, res: Response): Promise<void> {
        try {
            const { scenarioStr, conversationHistoryStr } = req.body;
            const scenario = JSON.parse(scenarioStr || '{}');
            const history = JSON.parse(conversationHistoryStr || '[]');

            const hints = await brainAgent.generateHints(scenario, history);
            res.status(200).json({ hints });
        } catch (err) {
            console.error("[PracticeController] Hint generation failed:", err);
            res.status(500).json({ error: 'Failed to generate hints' });
        }
    }

    // [Step 474 adjustScenario] ...
    public async adjustScenario(req: Request, res: Response): Promise<void> {
        try {
            const { currentScenario, adjustmentText } = req.body;
            if (!currentScenario || !adjustmentText) {
                res.status(400).json({ error: 'currentScenario and adjustmentText are required' });
                return;
            }

            const adjustedScenario = await brainAgent.adjustScenario(currentScenario, adjustmentText);
            res.status(200).json({ data: adjustedScenario });
        } catch (err: any) {
            console.error("[PracticeController] Adjust scenario failed:", err);
            res.status(500).json({ error: 'Failed to adjust scenario' });
        }
    }

    // [Step 474 generateSuggestions] ...
    public async generateSuggestions(req: Request, res: Response): Promise<void> {
        try {
            const { currentScenario } = req.body;
            if (!currentScenario) {
                res.status(400).json({ error: 'currentScenario is required' });
                return;
            }

            const suggestions = await brainAgent.generateSuggestions(currentScenario);
            res.status(200).json({ suggestions });
        } catch (err) {
            console.error("[PracticeController] Suggestion generation failed:", err);
            res.status(500).json({ error: 'Failed to generate suggestions' });
        }
    }

    // [Mentor Chat]
    public async mentorChat(req: Request, res: Response): Promise<void> {
        try {
            const { scenario, evaluationReport, userMessage, conversationHistory } = req.body;
            if (!scenario || !evaluationReport || !userMessage) {
                res.status(400).json({ error: 'Missing required chat parameters' });
                return;
            }

            const response = await mentorAgent.chat(scenario, evaluationReport, userMessage, conversationHistory || []);
            res.status(200).json({ data: response });
        } catch (err: any) {
            console.error("[PracticeController] Mentor chat failed:", err);
            res.status(500).json({ error: 'Failed to chat with mentor' });
        }
    }

    // [Mentor Eval Comment]
    public async generateEvalComment(req: Request, res: Response): Promise<void> {
        try {
            const { evalReport, storyCoverage, streak, previousScore } = req.body;
            if (!evalReport) {
                res.status(400).json({ error: 'evalReport is required' });
                return;
            }
            const comment = await mentorAgent.generateEvalComment(evalReport, storyCoverage, streak, previousScore);
            res.status(200).json({ data: { comment } });
        } catch (err: any) {
            console.error("[PracticeController] Eval comment failed:", err);
            res.status(500).json({ error: 'Failed to generate eval comment' });
        }
    }

    // [Gamification]
    public async generateChallenge(req: Request, res: Response): Promise<void> {
        try {
            const { sessionId, scenarioStr, evaluationStr } = req.body;

            // Try to get scenario + evaluation from DB first, fallback to body payload
            let scenarioData: any = null;
            let evaluationData: any = null;

            const isValidUuid = sessionId && /^[0-9a-f-]{36}$/i.test(sessionId);
            if (isValidUuid) {
                const [session, evaluation] = await Promise.all([
                    databaseService.getSession(sessionId).catch(() => null),
                    databaseService.getEvaluation(sessionId).catch(() => null),
                ]);
                scenarioData = session?.scenario ?? null;
                evaluationData = evaluation;
            }

            // Fallback to body-provided data (guest / local session)
            if (!scenarioData && scenarioStr) {
                try { scenarioData = JSON.parse(scenarioStr); } catch { /* ignore */ }
            }
            if (!evaluationData && evaluationStr) {
                try { evaluationData = JSON.parse(evaluationStr); } catch { /* ignore */ }
            }

            if (!scenarioData && !evaluationData) {
                res.status(400).json({ error: 'No scenario or evaluation data available' });
                return;
            }

            const challengeData = await brainAgent.generateChallenge(scenarioData || {}, evaluationData || {});

            // Save to DB only if user is authenticated
            let challenge = { ...challengeData, id: `local_${Date.now()}` };
            if (req.user?.id) {
                try {
                    const saved = await databaseService.createChallenge(req.user.id, sessionId || null, challengeData);
                    if (saved) challenge = saved;
                } catch { /* continue with local challenge */ }
            }

            res.status(200).json({ data: challenge });
        } catch (err: any) {
            console.error("[PracticeController] generateChallenge error:", err);
            res.status(500).json({ error: 'Failed to generate challenge' });
        }
    }

    public async adjustChallenge(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const { challengeId, userRequest, sessionId } = req.body;
            if (!challengeId || !userRequest) {
                res.status(400).json({ error: 'challengeId and userRequest are required' });
                return;
            }

            // Fetch current challenge + session context
            const [currentChallenge, session] = await Promise.all([
                databaseService.getChallengeById(challengeId, req.user.id),
                sessionId ? databaseService.getSession(sessionId).catch(() => null) : Promise.resolve(null),
            ]);

            if (!currentChallenge) {
                res.status(404).json({ error: 'Challenge not found' });
                return;
            }

            const evaluation = currentChallenge.session_id
                ? await databaseService.getEvaluation(currentChallenge.session_id).catch(() => null)
                : null;

            const adjustedData = await brainAgent.adjustChallenge(
                {
                    title: currentChallenge.title,
                    description: currentChallenge.description,
                    difficulty: currentChallenge.difficulty || 3,
                    sourceWeakness: currentChallenge.source_weakness,
                },
                userRequest,
                session?.scenario || {},
                evaluation || {}
            );

            // Update in DB
            const updated = await databaseService.updateChallengeContent(challengeId, req.user.id, adjustedData);
            res.status(200).json({ data: updated || { ...currentChallenge, ...adjustedData } });
        } catch (err) {
            console.error("[PracticeController] adjustChallenge error:", err);
            res.status(500).json({ error: 'Failed to adjust challenge' });
        }
    }

    public async getUserChallenges(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) { res.status(200).json({ data: [] }); return; }
            const challenges = await databaseService.getUserChallenges(req.user.id);
            res.status(200).json({ data: challenges });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch challenges' });
        }
    }

    public async setChallengeDeadline(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const { challengeId, deadline } = req.body;
            await databaseService.setChallengeDeadline(challengeId, req.user.id, deadline);
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to set deadline' });
        }
    }

    public async reportChallenge(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const { challengeId } = req.body;
            await databaseService.addExp(req.user.id, 50, 'Completed Gamification Challenge');
            res.status(200).json({ success: true, expEarned: 50, message: "Thử thách hoàn thành! Bạn nhận được 50 EXP." });
        } catch (err) {
            console.error("[PracticeController] reportChallenge error:", err);
            res.status(500).json({ error: 'Failed to report challenge' });
        }
    }

    // [Challenge Feedback — Voice]
    public async submitFeedbackVoice(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const { challengeId, completed, whatUserSaid, othersReaction, whatWorked, whatStuck, situation, emotionBefore, emotionAfter } = req.body;
            if (!challengeId) { res.status(400).json({ error: 'challengeId is required' }); return; }

            const isCompleted = completed === 'true' || completed === true;
            const status = isCompleted ? 'completed' : 'skipped';

            // Transcribe audio if provided
            let voiceTranscript: string | null = null;
            if (req.file) {
                try {
                    voiceTranscript = await transcriptionService.transcribeAudio(req.file.buffer, req.file.mimetype);
                } catch (err) {
                    console.warn('[PracticeController] Voice transcription failed, continuing without transcript:', err);
                }
            }

            // Fetch challenge for context
            const challenge = await databaseService.getChallengeById(challengeId, req.user.id);
            const feedbackData = { completed: isCompleted, situation, emotionBefore, emotionAfter, whatUserSaid, othersReaction, whatWorked, whatStuck };

            // Run Ni analysis (non-blocking fallback)
            let analysis: any;
            try {
                analysis = await mentorAgent.analyzeFeedback(
                    challenge || { title: 'Thử thách', description: '', difficulty: 3 },
                    feedbackData,
                    voiceTranscript
                );
            } catch (err) {
                console.warn('[PracticeController] analyzeFeedback failed, using defaults:', err);
                analysis = { xpEarned: isCompleted ? 150 : 75, nextDifficulty: 3, nextChallengeHint: 'Tiếp tục luyện tập!', newStoryCandidate: false };
            }

            await databaseService.updateChallengeStatus(challengeId, req.user.id, status);
            if (req.user?.id) {
                await databaseService.addExp(req.user.id, analysis.xpEarned, 'Challenge feedback (voice)').catch(() => {});
            }

            res.status(200).json({ data: { status, analysis } });
        } catch (err) {
            console.error("[PracticeController] submitFeedbackVoice error:", err);
            res.status(500).json({ error: 'Failed to submit voice feedback' });
        }
    }

    // [Challenge Feedback — Form]
    public async submitFeedbackForm(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const { challengeId, completed, situation, emotionBefore, emotionAfter, whatUserSaid, othersReaction, whatWorked, whatStuck } = req.body;
            if (!challengeId) { res.status(400).json({ error: 'challengeId is required' }); return; }

            const isCompleted = completed === true || completed === 'true';
            const status = isCompleted ? 'completed' : 'skipped';

            // Transcribe uploaded audio if present
            let voiceTranscript: string | null = null;
            if (req.file) {
                try {
                    voiceTranscript = await transcriptionService.transcribeAudio(req.file.buffer, req.file.mimetype);
                } catch (err) {
                    console.warn('[PracticeController] Form audio transcription failed:', err);
                }
            }

            // Fetch challenge for context
            const challenge = await databaseService.getChallengeById(challengeId, req.user.id);
            const feedbackData = { completed: isCompleted, situation, emotionBefore, emotionAfter, whatUserSaid, othersReaction, whatWorked, whatStuck };

            // Run Ni analysis
            let analysis: any;
            try {
                analysis = await mentorAgent.analyzeFeedback(
                    challenge || { title: 'Thử thách', description: '', difficulty: 3 },
                    feedbackData,
                    voiceTranscript
                );
            } catch (err) {
                console.warn('[PracticeController] analyzeFeedback failed, using defaults:', err);
                analysis = { xpEarned: isCompleted ? 150 : 75, nextDifficulty: 3, nextChallengeHint: 'Tiếp tục luyện tập!', newStoryCandidate: false };
            }

            await databaseService.updateChallengeStatus(challengeId, req.user.id, status);
            if (req.user?.id) {
                await databaseService.addExp(req.user.id, analysis.xpEarned, 'Challenge feedback (form)').catch(() => {});
            }

            res.status(200).json({ data: { status, analysis } });
        } catch (err) {
            console.error("[PracticeController] submitFeedbackForm error:", err);
            res.status(500).json({ error: 'Failed to submit form feedback' });
        }
    }

    // [Free Share — no challenge required]
    public async submitFeedbackFree(req: Request, res: Response): Promise<void> {
        console.log('[submitFeedbackFree] called, body keys:', Object.keys(req.body || {}), 'files:', req.files ? Object.keys(req.files) : 'none');
        try {
            const { situation, emotionBefore, emotionAfter, whatUserSaid, othersReaction, whatWorked, whatStuck, completed, challengeId } = req.body;

            // Collect all audio files — voiceBlob (mic) and/or audioFile (upload)
            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
            const audioFiles = [
                ...(files?.['voiceBlob'] || []),
                ...(files?.['audioFile'] || []),
                ...(req.file ? [req.file] : []),
            ];

            // Transcribe all audio files in parallel, concatenate with separator
            let voiceTranscript: string | null = null;
            if (audioFiles.length > 0) {
                const transcripts = await Promise.all(
                    audioFiles.map(f =>
                        transcriptionService.transcribeAudio(f.buffer, f.mimetype).catch(() => null)
                    )
                );
                const joined = transcripts.filter(Boolean).join('\n\n---\n\n');
                if (joined) voiceTranscript = joined;
            }

            const isCompleted = completed === 'true' || completed === true || (!challengeId);
            const feedbackData = {
                completed: isCompleted,
                situation,
                emotionBefore,
                emotionAfter,
                whatUserSaid,
                othersReaction,
                whatWorked,
                whatStuck,
            };

            // Fetch challenge context if linked
            const challenge = challengeId && req.user?.id
                ? await databaseService.getChallengeById(challengeId, req.user.id).catch(() => null)
                : null;

            // Fetch previous real-world metrics for comparison
            const previousMetricsRows = req.user?.id
                ? await databaseService.getPreviousRealWorldMetrics(req.user.id, 5).catch(() => [])
                : [];

            // Compute average previous metrics if available
            const prevMetrics = previousMetricsRows.length > 0 ? {
                coherenceScore: Math.round(previousMetricsRows.reduce((s: number, r: any) => s + (r.coherence_score || 0), 0) / previousMetricsRows.length),
                jargonCount: Math.round(previousMetricsRows.reduce((s: number, r: any) => s + (r.jargon_count || 0), 0) / previousMetricsRows.length),
                fillerPerMinute: parseFloat((previousMetricsRows.reduce((s: number, r: any) => s + (r.filler_per_minute || 0), 0) / previousMetricsRows.length).toFixed(1)),
                fluencyScore: 0,
                jargonList: [],
                fillerCount: 0,
                fillerList: [],
                fluencyNote: '',
            } : null;

            console.log('[submitFeedbackFree] transcript length:', voiceTranscript?.length ?? 0, '| prevMetrics:', !!prevMetrics);
            const tStart = Date.now();
            // Run full real-world analysis (new pipeline)
            const analysis = await mentorAgent.analyzeFeedbackFull(
                challenge ? { title: challenge.title, description: challenge.description, difficulty: challenge.difficulty || 3, sourceWeakness: challenge.source_weakness } : null,
                feedbackData,
                voiceTranscript,
                prevMetrics
            );
            console.log('[submitFeedbackFree] analyzeFeedbackFull done in', Date.now() - tStart, 'ms | niComment:', analysis.niComment?.slice(0, 60));

            // Save metrics to DB (non-blocking) if user logged in and has expression data
            if (req.user?.id && analysis.expression) {
                databaseService.saveRealWorldMetrics(
                    req.user.id,
                    analysis.expression,
                    { trend: analysis.psychology.trend, trendNote: analysis.psychology.trendNote }
                ).catch(() => {});
            }

            // Attach previousExpression so frontend can show ▲/▼ comparison arrows
            if (prevMetrics) analysis.previousExpression = prevMetrics;
            res.status(200).json({ data: { analysis, transcript: voiceTranscript } });
        } catch (err) {
            console.error("[PracticeController] submitFeedbackFree error:", err);
            res.status(200).json({
                data: {
                    analysis: {
                        hasAudio: false,
                        sourceType: 'realworld',
                        xpEarned: 50,
                        niComment: 'Cảm ơn bạn đã chia sẻ! Mỗi trải nghiệm là một bài học quý.',
                        nextDifficulty: 3,
                        nextChallengeHint: 'Tiếp tục luyện tập nhé!',
                        newStoryCandidate: false,
                        psychology: { trend: 'unknown', trendNote: '' },
                        strengths: [],
                        improvements: [],
                    }
                }
            });
        }
    }

    // [Challenge Skip]
    public async skipChallenge(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const { challengeId } = req.body;
            if (!challengeId) { res.status(400).json({ error: 'challengeId is required' }); return; }

            await databaseService.updateChallengeStatus(challengeId, req.user.id, 'skipped');
            res.status(200).json({ success: true });
        } catch (err) {
            console.error("[PracticeController] skipChallenge error:", err);
            res.status(500).json({ error: 'Failed to skip challenge' });
        }
    }

    // [Dashboard]
    public async getUserSessions(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(200).json({ data: [] });
                return;
            }
            const userId = req.user.id;
            const limit = parseInt(String(req.query.limit)) || 20;
            const offset = parseInt(String(req.query.offset)) || 0;

            const sessions = await databaseService.getUserSessions(userId, limit, offset);
            res.status(200).json({ data: sessions });
        } catch (err) {
            console.error("[PracticeController] Get sessions failed:", err);
            res.status(200).json({ data: [] });
        }
    }

    public async getSessionById(req: Request, res: Response): Promise<void> {
        try {
            const id = String(req.params.id);
            const session = await databaseService.getSession(id);
            const turns = await databaseService.getSessionTurns(id);
            const evaluation = await databaseService.getEvaluation(id);

            res.status(200).json({ data: { session, turns, evaluation } });
        } catch (err) {
            console.error("[PracticeController] Get session by ID failed:", err);
            res.status(200).json({ data: { session: null, turns: [], evaluation: null } });
        }
    }

    public async getUserStats(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(200).json({ data: { totalSessions: 0, completedSessions: 0, averageScore: 0, currentStreak: 0 } });
                return;
            }
            const userId = req.user.id;
            const stats = await databaseService.getUserStats(userId);
            res.status(200).json({ data: stats });
        } catch (err) {
            console.error("[PracticeController] Get user stats failed:", err);
            res.status(200).json({ data: { totalSessions: 0, completedSessions: 0, averageScore: 0, currentStreak: 0 } });
        }
    }
    public async getUserProgress(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(200).json({ data: null });
                return;
            }
            const progress = await databaseService.getUserProgress(req.user.id);
            res.status(200).json({ data: progress });
        } catch (err) {
            console.error("[PracticeController] Get user progress failed:", err);
            res.status(200).json({ data: null });
        }
    }

    public async getProgressDetail(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
            const [userProgress, gymHistory, realworldHistory] = await Promise.all([
                databaseService.getUserProgress(req.user.id).catch(() => null),
                databaseService.getRecentSessionMetrics(req.user.id, 10, 'gym').catch(() => []),
                databaseService.getRecentSessionMetrics(req.user.id, 10, 'realworld').catch(() => []),
            ]);
            res.status(200).json({ data: { userProgress, gymHistory, realworldHistory } });
        } catch (err) {
            console.error("[PracticeController] getProgressDetail failed:", err);
            res.status(200).json({ data: { userProgress: null, gymHistory: [], realworldHistory: [] } });
        }
    }

    public async uploadAsset(req: Request, res: Response): Promise<void> {
        try {
            const file = req.file;
            const { targetPath } = req.body;

            if (!file || !targetPath) {
                res.status(400).json({ error: 'No file or targetPath provided' });
                return;
            }

            // Security check
            if (targetPath.includes('..') || targetPath.startsWith('/') || targetPath.startsWith('C:')) {
                res.status(403).json({ error: 'Invalid target path' });
                return;
            }

            const fs = require('fs');
            const path = require('path');
            const targetDir = path.join(__dirname, '..', '..', '..', 'frontend', 'public');
            const finalPath = path.join(targetDir, targetPath);

            // Ensure parent directory exists
            const parentDir = path.dirname(finalPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            fs.writeFileSync(finalPath, file.buffer);

            res.status(200).json({ success: true, url: '/' + targetPath.replace(/\\/g, '/') });
        } catch (err) {
            console.error("[PracticeController] Asset upload failed:", err);
            res.status(500).json({ error: 'Upload failed' });
        }
    }

    // Debug: save audio to debug_audio/ folder
    /**
     * Real-world audio upload: transcribe + evaluate in one call.
     * POST /realworld/upload — multipart audio + contextDescription field.
     */
    public async uploadRealWorldAudio(req: Request, res: Response): Promise<void> {
        try {
            const audioFile = req.file;
            const { contextDescription } = req.body;

            if (!audioFile) {
                res.status(400).json({ error: 'Audio file is required' });
                return;
            }

            if (!contextDescription || contextDescription.trim().length === 0) {
                res.status(400).json({ error: 'Vui lòng mô tả ngữ cảnh cuộc hội thoại' });
                return;
            }

            // Max 10MB
            if (audioFile.size > 10 * 1024 * 1024) {
                res.status(400).json({ error: 'File quá lớn. Tối đa 10MB.' });
                return;
            }

            // Content filter on context description
            const filterResult = contentFilter.filterContent(contextDescription);
            if (!filterResult.safe && filterResult.category !== 'pii') {
                res.status(400).json({ error: filterResult.reason, filtered: true });
                return;
            }

            // Transcode if Safari MP4
            let finalBuffer = audioFile.buffer;
            let mimeType = audioFile.mimetype;
            if (audioService.isTranscodingRequired(mimeType)) {
                console.log("[RealWorld] Transcoding MP4 to WAV...");
                finalBuffer = await audioService.transcodeToPcm(audioFile.buffer);
                mimeType = 'audio/wav';
            }

            // Step 1: Transcribe
            console.log(`[RealWorld] Transcribing ${(finalBuffer.length / 1024).toFixed(0)}KB audio...`);
            const transcript = await transcriptionService.transcribeAudio(finalBuffer, mimeType);

            if (!transcript || transcript.trim().length === 0) {
                res.status(400).json({ error: 'Không thể nhận diện nội dung audio. Vui lòng thử file khác.' });
                return;
            }

            // Step 2: Evaluate
            console.log(`[RealWorld] Evaluating transcript (${transcript.length} chars)...`);
            const evaluation = await analystAgent.evaluateRealWorldConversation(transcript, contextDescription);

            res.status(200).json({
                transcript,
                evaluation,
            });
        } catch (err) {
            console.error("[PracticeController] Real-world upload failed:", err);
            res.status(500).json({ error: 'Phân tích thất bại. Vui lòng thử lại.' });
        }
    }

    public async saveDebugAudio(req: Request, res: Response): Promise<void> {
        try {
            const file = req.file;
            const { filename } = req.body;
            if (!file || !filename) {
                res.status(400).json({ error: 'Missing file or filename' });
                return;
            }
            const fs = require('fs');
            const path = require('path');
            const dir = path.join(__dirname, '..', '..', '..', 'debug_audio');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const safe = filename.replace(/[^a-zA-Z0-9_\-.]/g, '');
            fs.writeFileSync(path.join(dir, safe), file.buffer);
            console.log(`[Debug] Saved ${safe} (${file.buffer.length} bytes)`);
            res.status(200).json({ success: true });
        } catch (err) {
            console.error("[PracticeController] Debug audio save failed:", err);
            res.status(500).json({ error: 'Save failed' });
        }
    }
}
