import { Request, Response } from 'express';
import { BrainAgent } from '../agents/brain.agent';
import { VoiceAgent } from '../agents/voice.agent';
import { AnalystAgent } from '../agents/analyst.agent';
import { StorageService } from '../services/storage.service';
import { DatabaseService } from '../services/database.service';
import { AudioService } from '../services/audio.service';
import { LiveKitService } from '../services/livekit.service';
import { FullScenarioContext } from '../contracts/data.contracts';
import { config } from '../config/env';
import fetch from 'node-fetch';

const brainAgent = new BrainAgent();
const voiceAgent = new VoiceAgent();
const analystAgent = new AnalystAgent();
const storageService = new StorageService();
const databaseService = new DatabaseService();
const audioService = new AudioService();
const livekitService = new LiveKitService();

/**
 * Controller handling all business logic for the practice sessions.
 * Acts as the orchestrator between the Frontend and the three core AI Agents:
 * BrainAgent (Context Creation), VoiceAgent (Interactive Conversation), and AnalystAgent (Evaluation).
 */
export class PracticeController {

    /**
     * Phase 1: Scenario Setup
     * Initiates the BrainAgent to design a custom practice scenario based on user goals.
     *
     * @param {Request} req - Express request containing `userGoal`.
     * @param {Response} res - Express response.
     */
    public async setupScenario(req: Request, res: Response): Promise<void> {
        try {
            const { userGoal } = req.body;
            if (!userGoal) {
                res.status(400).json({ error: 'userGoal is required' });
                return;
            }

            // BrainAgent designs the scenario structure based on raw input
            const scenarioContext: FullScenarioContext = await brainAgent.generateScenario(userGoal);
            res.status(200).json({ data: scenarioContext });
        } catch (err: any) {
            console.error("[PracticeController] Setup scenario failed:", err);
            res.status(500).json({ error: 'Failed to generate scenario' });
        }
    }

    /**
     * Phase 1 (LiveKit): Create Session Token for Streaming
     * Connects frontend users to the Modal LiveKitAgentWorker.
     */
    public async createLivekitSession(req: Request, res: Response): Promise<void> {
        try {
            const { scenarioStr, conversationHistoryStr } = req.body;
            // The auth middleware guarantees req.user if present
            // We use username 'bạn' if unauthenticated
            const userName = req.user?.email?.split('@')[0] || 'bạn';
            const identity = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const roomName = `speakmate-${Date.now()}`;

            const token = await livekitService.generateToken(roomName, identity, userName, scenarioStr, conversationHistoryStr);

            res.status(200).json({
                token,
                roomName,
                livekitUrl: config.livekitUrl
            });
        } catch (err) {
            console.error("[PracticeController] LiveKit session creation failed:", err);
            res.status(500).json({ error: 'Failed to create LiveKit session' });
        }
    }

    /**
     * Phase 2: Audio Interaction (Split-Stream Handling)
     * Processes user audio input, handles STT, generates AI response, converts AI response to TTS,
     * and asynchronously uploads the high-fidelity user audio for later analysis.
     *
     * @param {Request} req - Express request containing multipart form data (audio file + JSON strings).
     * @param {Response} res - Express response.
     */
    public async interactAudio(req: Request, res: Response): Promise<void> {
        try {
            // Multer parses the incoming audio file into req.file
            const audioFile = req.file;
            const { scenarioStr, conversationHistoryStr } = req.body;

            if (!audioFile) {
                res.status(400).json({ error: 'Audio file missing' });
                return;
            }

            // Process MIME Type and handle Safari `audio/mp4` transcoding requirements
            const mimeType = audioFile.mimetype;
            let finalBuffer = audioFile.buffer;

            if (audioService.isTranscodingRequired(mimeType)) {
                console.log("Safari detected: Transcoding MP4 to PCM...");
                finalBuffer = await audioService.transcodeToPcm(audioFile.buffer);
            }

            const scenario = JSON.parse(scenarioStr || '{}');
            const history = JSON.parse(conversationHistoryStr || '[]');

            // STREAM 1: Low-latency execution via VoiceAgent (Multimodal: STT + AI Gen)
            const userName = req.user?.email?.split('@')[0] || undefined;
            const result = await voiceAgent.interactAudioStream(scenario, history, finalBuffer, userName);
            const userTranscriptText = result.userTranscript;
            const botResponseText = result.aiResponse;

            // STREAM 2: Background upload HIGH-FIDELITY audio to Supabase for later evaluation
            const tempFileName = `session_${Date.now()}.wav`;
            storageService.uploadAudio(tempFileName, finalBuffer, 'audio/wav')
                .then(path => console.log('[PracticeController] Background upload success:', path))
                .catch(e => console.error('[PracticeController] Background upload failed:', e));

            const botAudioUrl = result.botAudioUrl || '';

            // Respond immediately with transcript, reply, and the unified Cloud audio
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

    /**
     * Phase 3: Final Session Analysis
     * Initiates the AnalystAgent to score and provide feedback for the entire completed session.
     *
     * @param {Request} req - Express request containing full transcript and evaluation rubric.
     * @param {Response} res - Express response.
     */
    public async evaluateSession(req: Request, res: Response): Promise<void> {
        try {
            const { rubricStr, audioFileKeys, fullTranscript } = req.body;
            const rubric = JSON.parse(rubricStr || '{}');

            // Generate secure signed URLs to pass valid audio references to the AnalystAgent
            const signedUrls = await Promise.all(
                (audioFileKeys || []).map((k: string) => storageService.getSignedUrl(k))
            );

            // AnalystAgent evaluates the entire history context
            const report = await analystAgent.evaluateSession(rubric, signedUrls[0] || '', fullTranscript);

            res.status(200).json({ evaluationReport: report });
        } catch (err) {
            console.error("[PracticeController] Evaluation failed:", err);
            res.status(500).json({ error: 'Analysis failed' });
        }
    }

    /**
     * Phase 4: Scaffolding Hints
     * Generates real-time conversational hints when the user is stuck.
     *
     * @param {Request} req - Express request containing current scenario and conversation history.
     * @param {Response} res - Express response.
     */
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

    /**
     * Phase 5: Adjust Existing Scenario
     * Modifies the current scenario based on user adjustments instead of regenerating from scratch.
     *
     * @param {Request} req - Express request containing `currentScenario` and `adjustmentText`.
     * @param {Response} res - Express response.
     */
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

    /**
     * Phase 6: Generate Context-Aware Suggestions
     * Returns dynamic suggestions based on the current scenario to help users refine their context.
     *
     * @param {Request} req - Express request containing `currentScenario`.
     * @param {Response} res - Express response.
     */
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

    // ----------------------------------------------------------------
    // Dashboard / History Endpoints (authRequired)
    // ----------------------------------------------------------------

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
}
