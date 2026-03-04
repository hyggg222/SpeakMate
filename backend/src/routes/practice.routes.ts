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
} from '../validators/practice.validators';

const router = Router();
const practiceController = new PracticeController();

// Use memory storage to enable real-time transcoding / streaming for audio
const upload = multer({ storage: multer.memoryStorage() });

// Apply auth middleware to all routes (optional — guest mode still works)
router.use(authOptional);

// 1. Generate new scenario using "The Brain" (Gemini 1.5 Pro)
router.post('/scenario', validate(setupScenarioSchema), (req, res) => practiceController.setupScenario(req, res));

// 1.5. LiveKit Token generation
router.post('/livekit-session', validate(livekitSessionSchema), (req, res) => practiceController.createLivekitSession(req, res));

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

// 7. Dashboard / History endpoints (require authenticated user)
router.get('/sessions', authRequired, (req, res) => practiceController.getUserSessions(req, res));
router.get('/sessions/:id', authRequired, (req, res) => practiceController.getSessionById(req, res));
router.get('/stats', authRequired, (req, res) => practiceController.getUserStats(req, res));

export default router;
