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

export class PracticeController {

    // Phase 1: Setup Scenario 
    public async setupScenario(req: Request, res: Response): Promise<void> {
        try {
            const { userGoal } = req.body;
            if (!userGoal) {
                res.status(400).json({ error: 'userGoal is required' });
                return;
            }

            // Model 1: The Brain designs scenario based on raw input
            const scenarioContext: FullScenarioContext = await brainAgent.generateScenario(userGoal);
            res.status(200).json({ data: scenarioContext });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: 'Failed to generate scenario' });
        }
    }

    // Phase 2: Audio interaction (Split Stream handling)
    public async interactAudio(req: Request, res: Response): Promise<void> {
        try {
            // Multer parses file into req.file
            const audioFile = req.file;
            const { scenarioStr, conversationHistoryStr } = req.body;

            if (!audioFile) {
                res.status(400).json({ error: 'Audio file missing' });
                return;
            }

            // Step 1: Detect MIME Type and handle Safari `audio/mp4` transcoding risk
            const mimeType = audioFile.mimetype;
            let finalBuffer = audioFile.buffer;

            if (audioService.isTranscodingRequired(mimeType)) {
                console.log("Safari detected: Transcoding MP4 to PCM...");
                finalBuffer = await audioService.transcodeToPcm(audioFile.buffer);
            }

            const scenario = JSON.parse(scenarioStr || '{}');
            const history = JSON.parse(conversationHistoryStr || '[]');

            // STREAM 1: Low-latency execution to Model 2 (Multimodal: STT + AI Gen)
            const result = await voiceAgent.interactAudioStream(scenario, history, finalBuffer);
            const userTranscriptText = result.userTranscript;
            const botResponseText = result.aiResponse;

            // STREAM 2: Background upload HIGH-FIDELITY audio to Supabase for Analyst
            const tempFileName = `session_${Date.now()}.wav`;
            storageService.uploadAudio(tempFileName, finalBuffer, 'audio/wav')
                .then(path => console.log('Bg upload success to:', path))
                .catch(e => console.error('Bg upload fail:', e));

            // Tạo Data URI Audio từ text bằng google-tts-api (tránh lỗi CORS trên Frontend)
            let botAudioUrl = '';
            try {
                const results = await googleTTS.getAllAudioBase64(botResponseText, {
                    lang: 'vi',
                    slow: false,
                    host: 'https://translate.google.com',
                });

                // Nối các đoạn base64 (MP3 format hỗ trợ nối buffer trực tiếp)
                const buffers = results.map(r => Buffer.from(r.base64, 'base64'));
                const combinedBuffer = Buffer.concat(buffers);
                const combinedBase64 = combinedBuffer.toString('base64');
                botAudioUrl = `data:audio/mp3;base64,${combinedBase64}`;
            } catch (ttsErr) {
                console.error("Google TTS failed:", ttsErr);
            }

            // Respond immediately to Client with both transcript and response
            res.status(200).json({
                userTranscript: userTranscriptText,
                botResponse: botResponseText,
                audioUploadedKey: tempFileName,
                botAudioUrl: botAudioUrl
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Interaction failed' });
        }
    }

    // Phase 3: Final Analysis
    public async evaluateSession(req: Request, res: Response): Promise<void> {
        try {
            const { rubricStr, audioFileKeys, fullTranscript } = req.body;
            const rubric = JSON.parse(rubricStr || '{}');

            // Get secure signed URL for Model 3
            const signedUrls = await Promise.all(
                (audioFileKeys || []).map((k: string) => storageService.getSignedUrl(k))
            );

            // Model 3: The Analyst evaluates everything
            const report = await analystAgent.evaluateSession(rubric, signedUrls[0] || '', fullTranscript);

            res.status(200).json({ evaluationReport: report });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Analysis failed' });
        }
    }
}
