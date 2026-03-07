import { Request, Response } from 'express';
import { MentorAgent } from '../agents/mentor.agent';
import { DatabaseService } from '../services/database.service';
import { MentorContextService } from '../services/mentor-context.service';

const mentorAgent = new MentorAgent();
const databaseService = new DatabaseService();
const contextService = new MentorContextService();

export class MentorChatController {

    /**
     * POST /api/mentor-chat/send
     * Send a message to Mentor Ni and get a response.
     */
    public async sendMessage(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id || null;
            const { message } = req.body;

            // 1. Get or create chat session (non-blocking — chat works without DB)
            let sessionId = `local_${Date.now()}`;
            if (userId) {
                try {
                    const session = await databaseService.getOrCreateMentorChatSession(userId);
                    sessionId = session.id;
                } catch (dbErr) {
                    console.warn('[MentorChat] DB session failed (non-blocking):', (dbErr as any)?.message);
                }
            }

            // 2. Save user message (non-blocking)
            if (userId) {
                try {
                    await databaseService.saveMentorChatMessage(sessionId, {
                        role: 'user',
                        content: message,
                    });
                } catch (dbErr) {
                    console.warn('[MentorChat] Save user msg failed (non-blocking):', (dbErr as any)?.message);
                }
            }

            // 3. Load recent history for context window (non-blocking)
            let conversationHistory: { role: string; content: string }[] = [];
            if (userId) {
                try {
                    const recentMessages = await databaseService.getMentorChatMessages(sessionId, 10);
                    conversationHistory = recentMessages
                        .slice(0, -1) // Exclude the message we just saved (it's the latest)
                        .map(m => ({
                            role: m.role as string,
                            content: m.content as string,
                        }));
                } catch (dbErr) {
                    console.warn('[MentorChat] Load history failed (non-blocking):', (dbErr as any)?.message);
                }
            }

            // 4. Aggregate user context (parallel DB calls — already has .catch() internally)
            const userContext = userId
                ? await contextService.getUserContext(userId)
                : { stats: null, recentSessions: [], stories: [], activeChallenges: [] };

            // 5. Match stories if relevant
            const matchedStories = contextService.matchStories(userContext.stories, message, 3);

            // 6. Format context for LLM
            const contextStr = contextService.formatContextForPrompt(userContext);

            // 7. Call LLM (Gemini)
            const response = await mentorAgent.generalChat(message, conversationHistory, contextStr);

            // 8. Enrich dataCards with matched stories if intent is query and no stories already
            if (matchedStories.length > 0 && (!response.dataCards?.stories || response.dataCards.stories.length === 0)) {
                if (!response.dataCards) response.dataCards = {};
                response.dataCards.stories = matchedStories.map(s => ({
                    id: s.id,
                    title: s.title,
                    tags: s.tags || [],
                    status: s.status,
                    framework: s.framework || 'STAR',
                    practice_count: s.practice_count || 0,
                    last_score: s.last_score || null,
                }));
            }

            // 9. Save mentor response (non-blocking, only if authenticated)
            let msgId = `msg_${Date.now()}`;
            if (userId) {
                try {
                    msgId = await databaseService.saveMentorChatMessage(sessionId, {
                        role: 'mentor',
                        content: response.reply,
                        intent: response.intent,
                        actionTaken: response.actionTaken,
                        dataCards: response.dataCards,
                    });
                } catch (dbErr) {
                    console.warn('[MentorChat] Save mentor msg failed (non-blocking):', (dbErr as any)?.message);
                }
            }

            res.status(200).json({
                data: {
                    sessionId,
                    message: {
                        id: msgId,
                        role: 'mentor',
                        content: response.reply,
                        intent: response.intent,
                        actionTaken: response.actionTaken,
                        dataCards: response.dataCards,
                        createdAt: new Date().toISOString(),
                    },
                },
            });
        } catch (err: any) {
            console.error('[MentorChatController] sendMessage failed:', err);
            res.status(500).json({ error: 'Ni đang gặp trục trặc. Vui lòng thử lại.' });
        }
    }

    /**
     * GET /api/mentor-chat/history?limit=20
     * Get chat history for the current user.
     */
    public async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                // Guest — no history
                res.status(200).json({ data: { sessionId: '', messages: [] } });
                return;
            }

            const limit = parseInt(req.query.limit as string, 10) || 20;

            let sessionId = '';
            let messages: any[] = [];
            try {
                const session = await databaseService.getOrCreateMentorChatSession(userId);
                sessionId = session.id;
                if (!session.isNew) {
                    messages = await databaseService.getMentorChatMessages(sessionId, limit);
                }
            } catch (dbErr) {
                console.warn('[MentorChat] getHistory DB failed (non-blocking):', (dbErr as any)?.message);
            }

            res.status(200).json({ data: { sessionId, messages } });
        } catch (err: any) {
            console.error('[MentorChatController] getHistory failed:', err);
            res.status(200).json({ data: { sessionId: '', messages: [] } });
        }
    }

    /**
     * DELETE /api/mentor-chat/clear
     * Delete all chat history for the current user.
     */
    public async clearHistory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            await databaseService.clearMentorChatHistory(userId);
            res.status(200).json({ success: true });
        } catch (err: any) {
            console.error('[MentorChatController] clearHistory failed:', err);
            res.status(500).json({ error: 'Failed to clear history' });
        }
    }
}
