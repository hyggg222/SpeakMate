import { Router } from 'express';
import multer from 'multer';
import { PracticeController } from '../controllers/practice.controller';

const router = Router();
const practiceController = new PracticeController();

// Use memory storage to enable real-time transcoding / streaming for audio
const upload = multer({ storage: multer.memoryStorage() });

// 1. Generate new scenario using "The Brain" (Gemini 1.5 Pro)
router.post('/scenario', (req, res) => practiceController.setupScenario(req, res));

// 2. Transcode (if needed), upload to Supabase & get real-time response from "The Voice" (Gemini 1.5 Flash)
router.post('/interact', upload.single('audio'), (req, res) => practiceController.interactAudio(req, res));

// 3. Evaluate the entire session using "The Analyst" (Gemini 1.5 Pro)
router.post('/analyze', (req, res) => practiceController.evaluateSession(req, res));

// 4. Generate scaffolding hints ("Ni ơi, cứu!") using "The Brain"
router.post('/hints', (req, res) => practiceController.generateHints(req, res));

export default router;
