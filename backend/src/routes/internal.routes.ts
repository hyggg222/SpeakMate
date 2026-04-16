import { Router, Request, Response } from 'express';
import { verifyInternalKey } from '../middleware/internal.middleware';
import { DatabaseService } from '../services/database.service';
import { PromptService } from '../services/prompt.service';

const router = Router();
const db = new DatabaseService();
const promptService = new PromptService();

/**
 * GET /api/internal/sessions/:id/context
 * Called by Modal worker on startup to fetch full session context.
 * Returns: { scenario, history, systemPrompt, userName }
 */
router.get('/sessions/:id/context', verifyInternalKey, async (req: Request, res: Response) => {
    const sessionId = req.params.id as string;
    const turnId = `${sessionId}_boot`;
    try {
        const session = await db.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        const turns = await db.getSessionTurns(sessionId);

        // Convert paired DB rows to speaker/line format for the agent
        const history: { speaker: string; line: string }[] = [];
        for (const t of turns) {
            if (t.user_transcript) history.push({ speaker: 'User', line: t.user_transcript });
            if (t.ai_response) history.push({ speaker: 'AI', line: t.ai_response });
        }

        const scenario = session.scenario?.scenario || session.scenario || {};
        const userName = session.user_name || 'bạn';
        const systemPrompt = promptService.buildConversationPrompt(scenario, userName);

        console.log(`[${turnId}] context served: ${history.length} turns, user=${userName}`);

        res.json({ scenario, history, systemPrompt, userName });
    } catch (err) {
        console.error(`[${turnId}] context fetch failed:`, err);
        res.status(500).json({ error: 'Failed to fetch session context' });
    }
});

/**
 * POST /api/internal/turns
 * Called by Modal worker after each STT+LLM turn to persist transcript.
 * Body: { session_id, turn_index, speaker, line }
 */
router.post('/turns', verifyInternalKey, async (req: Request, res: Response) => {
    const { session_id, turn_index, speaker, line } = req.body;
    const turnId = `${session_id}_${turn_index}`;

    if (!session_id || turn_index == null || !speaker || !line) {
        res.status(400).json({ error: 'Missing required fields: session_id, turn_index, speaker, line' });
        return;
    }

    try {
        // Use the existing paired schema: even turns = User, odd turns = AI
        // turn_index 0,1 → turn_number 1 (user=0, ai=1)
        // turn_index 2,3 → turn_number 2 (user=2, ai=3)
        const turnNumber = Math.floor(turn_index / 2) + 1;

        if (speaker === 'User') {
            await db.addTurn(session_id, turnNumber, {
                userTranscript: line,
                aiResponse: '',  // AI response will be updated shortly
            });
        } else {
            // Update existing row with AI response
            await db.updateTurnAiResponse(session_id, turnNumber, line);
        }

        console.log(`[${turnId}] persisted: ${speaker}`);
        res.json({ turn_id: turnId });
    } catch (err) {
        console.error(`[${turnId}] persist failed:`, err);
        res.status(500).json({ error: 'Failed to persist turn' });
    }
});

/**
 * PATCH /api/internal/turns/:turnNumber/interrupted
 * Called by Modal worker when AI is interrupted by user.
 */
router.patch('/turns/:turnNumber/interrupted', verifyInternalKey, async (req: Request, res: Response) => {
    const turnNumber = parseInt(req.params.turnNumber as string);
    const { session_id, delivered_chars } = req.body as { session_id: string; delivered_chars: number };

    if (!session_id || isNaN(turnNumber)) {
        res.status(400).json({ error: 'Missing required fields: session_id, turnNumber' });
        return;
    }

    try {
        await db.markTurnInterrupted(session_id, turnNumber, delivered_chars || 0);
        console.log(`[${session_id}_${turnNumber}] marked interrupted: ${delivered_chars} chars`);
        res.json({ ok: true });
    } catch (err) {
        console.error(`[internal] markTurnInterrupted failed:`, err);
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
