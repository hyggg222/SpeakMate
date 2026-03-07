import { Request, Response } from 'express';
import { StoryBankAgent } from '../agents/storybank.agent';
import { AnalystAgent } from '../agents/analyst.agent';
import { MentorAgent } from '../agents/mentor.agent';
import { DatabaseService } from '../services/database.service';

const storyBankAgent = new StoryBankAgent();
const analystAgent = new AnalystAgent();
const mentorAgent = new MentorAgent();
const databaseService = new DatabaseService();

export class StoryBankController {

    /**
     * POST /api/storybank/chat
     * Chat with Mentor Ni to explore and enrich story idea.
     */
    public async chatForStory(req: Request, res: Response): Promise<void> {
        try {
            const { framework, initialInput, inputMethod, chatMessages } = req.body;
            const result = await mentorAgent.chatForStory(framework, initialInput, chatMessages, inputMethod);
            res.status(200).json({ data: result });
        } catch (err: any) {
            console.error('[StoryBankController] chatForStory failed:', err);
            res.status(500).json({ error: 'Ni đang bận, thử lại nhé.' });
        }
    }

    /**
     * POST /api/storybank/structure
     * Takes raw user input and structures it via AI (STAR framework).
     * May return follow-up questions if input is insufficient.
     */
    public async structureStory(req: Request, res: Response): Promise<void> {
        try {
            const { rawInput, inputMethod, followUpAnswers, chatHistory } = req.body;
            const result = await storyBankAgent.structureStory(rawInput, inputMethod, followUpAnswers, chatHistory);
            res.status(200).json({ data: result });
        } catch (err: any) {
            console.error('[StoryBankController] structureStory failed:', err);
            res.status(500).json({ error: 'Không thể cấu trúc hóa câu chuyện. Vui lòng thử lại.' });
        }
    }

    /**
     * POST /api/storybank/
     * Saves a structured story to the database.
     */
    public async saveStory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const storyId = await databaseService.createStoryEntry(userId, req.body);
            const story = await databaseService.getStoryEntry(storyId, userId);
            res.status(201).json({ data: story });
        } catch (err: any) {
            console.error('[StoryBankController] saveStory failed:', err);
            res.status(500).json({ error: 'Không thể lưu câu chuyện. Vui lòng thử lại.' });
        }
    }

    /**
     * GET /api/storybank/
     * Lists user's stories with optional filters.
     */
    public async listStories(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const tags = req.query.tags as string | undefined;
            const status = req.query.status as string | undefined;
            const search = req.query.search as string | undefined;
            const limit = req.query.limit as string | undefined;
            const offset = req.query.offset as string | undefined;
            const result = await databaseService.getUserStories(userId, {
                tags,
                status,
                search,
                limit: limit ? parseInt(limit, 10) : 20,
                offset: offset ? parseInt(offset, 10) : 0,
            });
            res.status(200).json({ data: result.data, total: result.total });
        } catch (err: any) {
            console.error('[StoryBankController] listStories failed:', err);
            res.status(500).json({ error: 'Không thể tải danh sách câu chuyện.' });
        }
    }

    /**
     * GET /api/storybank/:id
     * Fetches a single story by ID.
     */
    public async getStory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const story = await databaseService.getStoryEntry(String(req.params.id), userId);
            if (!story) {
                res.status(404).json({ error: 'Không tìm thấy câu chuyện.' });
                return;
            }

            const practiceHistory = await databaseService.getStoryPracticeHistory(String(req.params.id));
            res.status(200).json({ data: { ...story, practiceHistory } });
        } catch (err: any) {
            console.error('[StoryBankController] getStory failed:', err);
            res.status(500).json({ error: 'Không thể tải câu chuyện.' });
        }
    }

    /**
     * PUT /api/storybank/:id
     * Updates an existing story.
     */
    public async updateStory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Verify ownership
            const existing = await databaseService.getStoryEntry(String(req.params.id), userId);
            if (!existing) {
                res.status(404).json({ error: 'Không tìm thấy câu chuyện.' });
                return;
            }

            await databaseService.updateStoryEntry(String(req.params.id), userId, req.body);
            const updated = await databaseService.getStoryEntry(String(req.params.id), userId);
            res.status(200).json({ data: updated });
        } catch (err: any) {
            console.error('[StoryBankController] updateStory failed:', err);
            res.status(500).json({ error: 'Không thể cập nhật câu chuyện.' });
        }
    }

    /**
     * DELETE /api/storybank/:id
     * Deletes a story.
     */
    public async deleteStory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const existing = await databaseService.getStoryEntry(String(req.params.id), userId);
            if (!existing) {
                res.status(404).json({ error: 'Không tìm thấy câu chuyện.' });
                return;
            }

            await databaseService.deleteStoryEntry(String(req.params.id), userId);
            res.status(200).json({ message: 'Đã xóa câu chuyện.' });
        } catch (err: any) {
            console.error('[StoryBankController] deleteStory failed:', err);
            res.status(500).json({ error: 'Không thể xóa câu chuyện.' });
        }
    }

    /**
     * POST /api/storybank/compare
     * Compares a Story Bank entry with actual practice transcript.
     */
    public async compareWithStoryBank(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const { storyId, sessionId, transcript } = req.body;

            const story = await databaseService.getStoryEntry(storyId, userId);
            if (!story) {
                res.status(404).json({ error: 'Không tìm thấy câu chuyện.' });
                return;
            }

            const result = await analystAgent.compareWithStoryBank(story, transcript);

            // Save practice history
            await databaseService.createStoryPracticeHistory({
                storyId,
                sessionId: sessionId || null,
                coverageScore: result.coverageScore || 0,
                missedParts: result.missedParts || [],
                addedParts: result.addedParts || [],
                feedback: result.feedback || '',
            });

            // Update story stats
            const newCount = (story.practice_count || 0) + 1;
            await databaseService.updateStoryAfterPractice(storyId, newCount, result.coverageScore || 0);

            res.status(200).json({ data: result });
        } catch (err: any) {
            console.error('[StoryBankController] compareWithStoryBank failed:', err);
            res.status(500).json({ error: 'Không thể so sánh Story Bank.' });
        }
    }
}
