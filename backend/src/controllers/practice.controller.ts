import { Request, Response } from 'express';
import { BrainAgent } from '../agents/brain.agent';
import { VoiceAgent } from '../agents/voice.agent';
import { AnalystAgent } from '../agents/analyst.agent';
import { StorageService } from '../services/storage.service';
import { AudioService } from '../services/audio.service';
import { FullScenarioContext } from '../contracts/data.contracts';
import * as googleTTS from 'google-tts-api';

const brainAgent = new BrainAgent();
const voiceAgent = new VoiceAgent();
const analystAgent = new AnalystAgent();
const storageService = new StorageService();
const audioService = new AudioService();

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
            const result = await voiceAgent.interactAudioStream(scenario, history, finalBuffer);
            const userTranscriptText = result.userTranscript;
            const botResponseText = result.aiResponse;

            // STREAM 2: Background upload HIGH-FIDELITY audio to Supabase for later evaluation
            const tempFileName = `session_${Date.now()}.wav`;
            storageService.uploadAudio(tempFileName, finalBuffer, 'audio/wav')
                .then(path => console.log('[PracticeController] Background upload success:', path))
                .catch(e => console.error('[PracticeController] Background upload failed:', e));

            // Generate TTS Data URI from the bot response using google-tts-api to avoid Frontend CORS issues
            let botAudioUrl = '';
            try {
                const results = await googleTTS.getAllAudioBase64(botResponseText, {
                    lang: 'vi',
                    slow: false,
                    host: 'https://translate.google.com',
                });

                // Concatenate base64 audio chunks (MP3 format supports direct buffer concatenation)
                const buffers = results.map(r => Buffer.from(r.base64, 'base64'));
                const combinedBuffer = Buffer.concat(buffers);
                const combinedBase64 = combinedBuffer.toString('base64');
                botAudioUrl = `data:audio/mp3;base64,${combinedBase64}`;
            } catch (ttsErr) {
                console.error("[PracticeController] Google TTS generation failed:", ttsErr);
            }

            // Respond immediately to Client with both transcript, API reply, and TTS audio
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
}
