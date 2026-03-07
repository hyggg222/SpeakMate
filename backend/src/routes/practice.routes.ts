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

// 2. Transcode (if needed), upload to Supabase & get real-time response from "The Voice" (Gemini 1.5 Flash)
router.post('/interact', upload.single('audio'), validate(interactAudioSchema), (req, res) => practiceController.interactAudio(req, res));

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

// Gamification (Phase 3)
router.post('/challenge/generate', authRequired, validate(generateChallengeSchema), (req, res) => practiceController.generateChallenge(req, res));
router.get('/challenges', authRequired, (req, res) => practiceController.getUserChallenges(req, res));
router.post('/challenge/deadline', authRequired, validate(setDeadlineSchema), (req, res) => practiceController.setChallengeDeadline(req, res));
router.post('/challenge/report', authRequired, upload.single('audio'), validate(reportChallengeSchema), (req, res) => practiceController.reportChallenge(req, res));

// 7. Dashboard / History endpoints (require authenticated user)
router.get('/sessions', authRequired, (req, res) => practiceController.getUserSessions(req, res));
router.get('/sessions/:id', authRequired, (req, res) => practiceController.getSessionById(req, res));
router.get('/stats', authRequired, (req, res) => practiceController.getUserStats(req, res));

export default router;
