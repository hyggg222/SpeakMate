import { Router } from 'express';
import multer from 'multer';
import { PracticeController } from '../controllers/practice.controller';
import { authOptional, authRequired } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
    setupScenarioSchema,
    interactAudioSchema,
    evaluateSessionSchema,
    generateHintsSchema,
    adjustScenarioSchema,
    suggestionsSchema,
    livekitSessionSchema,
    geminiLiveSessionSchema,
    geminiDirectTokenSchema,
    mentorChatSchema,
    generateChallengeSchema,
    setDeadlineSchema,
    reportChallengeSchema,
} from '../validators/practice.validators';

import rateLimit from 'express-rate-limit';

const router = Router();
const practiceController = new PracticeController();

// Rate limiter specifically for LiveKit session creation to prevent GPU abuse
const livekitLimiter = rateLimit({
    windowMs: 60 * 1000,   // 1 minute
    max: 5,                // 5 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' }
});

// Use memory storage to enable real-time transcoding / streaming for audio
const upload = multer({ storage: multer.memoryStorage() });

// Apply auth middleware to all routes (optional — guest mode still works)
router.use(authOptional);

// 1. Generate new scenario using "The Brain" (Gemini 1.5 Pro)
router.post('/scenario', validate(setupScenarioSchema), (req, res) => practiceController.setupScenario(req, res));

// 1.5. LiveKit Token generation
router.post('/livekit-session', livekitLimiter, validate(livekitSessionSchema), (req, res) => practiceController.createLivekitSession(req, res));

// 1.6. Gemini Live Pipeline v3 session
router.post('/gemini-live-session', livekitLimiter, validate(geminiLiveSessionSchema), (req, res) => practiceController.createGeminiLiveSession(req, res));

// 1.7. Gemini Direct — ephemeral token for browser-to-Gemini WebSocket
router.post('/gemini-direct-token', livekitLimiter, validate(geminiDirectTokenSchema), (req, res) => practiceController.createGeminiDirectToken(req, res));

// 2. Transcode (if needed), upload to Supabase & get real-time response from "The Voice" (Gemini 1.5 Flash)
router.post('/interact', upload.single('audio'), validate(interactAudioSchema), (req, res) => practiceController.interactAudio(req, res));

// 2.5 Dual-character HTTP round-trip: each character scores relevance, winner responds with own voice
router.post('/interact-dual', upload.single('audio'), validate(interactAudioSchema), (req, res) => practiceController.interactDualChar(req, res));

// 2.6 Dual-character text-only (no audio): for text input mode
router.post('/interact-dual-text', (req, res) => practiceController.interactDualCharText(req, res));

// 2.7 TTS synthesis for initial room greeting (dual-char mode)
router.post('/tts', (req, res) => practiceController.synthesizeSpeech(req, res));

// 2.5. Text-only interaction (no audio, for testing)
router.post('/interact-text', (req, res) => practiceController.interactText(req, res));

// 3. Evaluate the entire session using "The Analyst" (Gemini 1.5 Pro)
router.post('/analyze', validate(evaluateSessionSchema), (req, res) => practiceController.evaluateSession(req, res));

// 4. Generate scaffolding hints ("Ni ơi, cứu!") using "The Brain"
router.post('/hints', validate(generateHintsSchema), (req, res) => practiceController.generateHints(req, res));

// 5. Adjust an existing scenario with user modifications
router.post('/scenario/adjust', validate(adjustScenarioSchema), (req, res) => practiceController.adjustScenario(req, res));

// 6. Generate context-aware suggestions based on current scenario
router.post('/scenario/suggestions', validate(suggestionsSchema), (req, res) => practiceController.generateSuggestions(req, res));

// 6.5 Mentor Ni Chat (Phase 3)
router.post('/mentor-chat', validate(mentorChatSchema), (req, res) => practiceController.mentorChat(req, res));

// 6.6 Mentor Ni Eval Comment (Bridge to Reality)
router.post('/mentor-eval-comment', (req, res) => practiceController.generateEvalComment(req, res));

// Gamification (Phase 3)
router.post('/challenge/generate', authOptional, validate(generateChallengeSchema), (req, res) => practiceController.generateChallenge(req, res));
router.post('/challenge/adjust', authRequired, (req, res) => practiceController.adjustChallenge(req, res));
router.get('/challenges', authOptional, (req, res) => practiceController.getUserChallenges(req, res));
router.post('/challenge/deadline', authRequired, validate(setDeadlineSchema), (req, res) => practiceController.setChallengeDeadline(req, res));
router.post('/challenge/report', authRequired, upload.single('audio'), (req, res) => practiceController.reportChallenge(req, res));
router.post('/challenge/feedback/voice', authRequired, upload.single('audio'), (req, res) => practiceController.submitFeedbackVoice(req, res));
router.post('/challenge/feedback/form', authRequired, upload.single('audio'), (req, res) => practiceController.submitFeedbackForm(req, res));
// Free share — no challenge required (auth optional so guests can also share)
// Accepts up to 2 audio files: 'voiceBlob' (mic recording) and 'audioFile' (upload)
router.post('/feedback/free', authOptional, upload.fields([{ name: 'voiceBlob', maxCount: 1 }, { name: 'audioFile', maxCount: 1 }]), (req, res) => practiceController.submitFeedbackFree(req, res));
router.post('/challenge/skip', authRequired, (req, res) => practiceController.skipChallenge(req, res));

// 6.7 Custom Mentor Avatar & Project Assets (Developer Tool)
router.post('/mentor/avatar', upload.single('image'), (req, res) => practiceController.uploadAsset(req, res));

// Real-world audio upload & analysis
router.post('/realworld/upload', authOptional, upload.single('audio'), (req, res) => practiceController.uploadRealWorldAudio(req, res));

// Debug: save audio for VAD inspection
router.post('/debug-audio', upload.single('audio'), (req, res) => practiceController.saveDebugAudio(req, res));

// 7. Dashboard / History endpoints (require authenticated user)
router.get('/sessions', authRequired, (req, res) => practiceController.getUserSessions(req, res));
router.get('/sessions/:id', authRequired, (req, res) => practiceController.getSessionById(req, res));
router.get('/stats', authRequired, (req, res) => practiceController.getUserStats(req, res));

// 8. Progress tracking
router.get('/progress', authRequired, (req, res) => practiceController.getUserProgress(req, res));
router.get('/progress/detail', authRequired, (req, res) => practiceController.getProgressDetail(req, res));
router.get('/previous-metrics', authRequired, (req, res) => practiceController.getPreviousMetrics(req, res));

export default router;
