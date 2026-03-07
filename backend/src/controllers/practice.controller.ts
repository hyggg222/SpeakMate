import { Request, Response } from 'express';
import { BrainAgent } from '../agents/brain.agent';
import { VoiceAgent } from '../agents/voice.agent';
import { AnalystAgent } from '../agents/analyst.agent';
import { MentorAgent } from '../agents/mentor.agent';
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
const mentorAgent = new MentorAgent();
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

    // [Step 474 setupScenario] ...
    public async setupScenario(req: Request, res: Response): Promise<void> {
        try {
            const { userGoal } = req.body;
            if (!userGoal) {
                res.status(400).json({ error: 'userGoal is required' });
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

            const sessionId = await databaseService.createSession(
                req.user?.id || null,
                'safe',
                scenarioContext
            );

            const token = await livekitService.generateToken(roomName, identity, sessionId);

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
            const userTranscriptText = result.userTranscript;
            const botResponseText = result.aiResponse;

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

    // [Step 474 evaluateSession] ...
    public async evaluateSession(req: Request, res: Response): Promise<void> {
        try {
            const { rubricStr, audioFileKeys, fullTranscript } = req.body;
            const rubric = JSON.parse(rubricStr || '{}');

            const signedUrls = await Promise.all(
                (audioFileKeys || []).map((k: string) => storageService.getSignedUrl(k))
            );

            const report = await analystAgent.evaluateSession(rubric, signedUrls[0] || '', fullTranscript);

            res.status(200).json({ evaluationReport: report });
        } catch (err) {
            console.error("[PracticeController] Evaluation failed:", err);
            res.status(500).json({ error: 'Analysis failed' });
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

    // [Gamification]
    public async generateChallenge(req: Request, res: Response): Promise<void> {
        try {
            const { sessionId } = req.body;
            if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const session = await databaseService.getSession(sessionId);
            const evaluation = await databaseService.getEvaluation(sessionId);
            if (!session || !evaluation) {
                res.status(400).json({ error: 'Session or Evaluation not found' });
                return;
            }

            const challengeData = await brainAgent.generateChallenge(session.scenario, evaluation);
            const challenge = await databaseService.createChallenge(req.user.id, sessionId, challengeData);
            res.status(200).json({ data: challenge });
        } catch (err: any) {
            console.error("[PracticeController] generateChallenge error:", err);
            res.status(500).json({ error: 'Failed to generate challenge' });
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
}
