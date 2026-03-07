import { DatabaseService } from './database.service';

export interface MentorContext {
    stats: {
        totalSessions: number;
        completedSessions: number;
        averageScore: number;
        currentStreak: number;
    } | null;
    recentSessions: any[];
    stories: any[];
    activeChallenges: any[];
}

// Vietnamese stopwords for keyword extraction
const STOPWORDS = new Set([
    'em', 'mình', 'tôi', 'bạn', 'có', 'không', 'là', 'và', 'của', 'cho',
    'với', 'này', 'đó', 'thì', 'được', 'đã', 'sẽ', 'đang', 'rồi', 'nhé',
    'ơi', 'nè', 'nha', 'à', 'ạ', 'vậy', 'thế', 'gì', 'nào', 'đâu',
    'muốn', 'hỏi', 'xem', 'cho', 'về', 'ở', 'trong', 'ngoài', 'trên', 'dưới',
    'the', 'is', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
]);

function removeDiacritics(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function extractKeywords(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[\s,.\-!?;:]+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

export class MentorContextService {
    private db: DatabaseService;

    constructor() {
        this.db = new DatabaseService();
    }

    /**
     * Aggregate all user data for Ni's context window.
     * Runs DB calls in parallel for speed (~300ms).
     */
    async getUserContext(userId: string): Promise<MentorContext> {
        const [stats, sessionsResult, storiesResult, challenges] = await Promise.all([
            this.db.getUserStats(userId).catch(() => null),
            this.db.getUserSessions(userId, 5, 0).catch(() => ({ data: [] })),
            this.db.getUserStories(userId, { limit: 5 }).catch(() => ({ data: [] })),
            this.db.getUserChallenges(userId).catch(() => []),
        ]);

        const recentSessions = Array.isArray(sessionsResult) ? sessionsResult : (sessionsResult?.data || []);
        const stories = Array.isArray(storiesResult) ? storiesResult : (storiesResult?.data || []);
        const activeChallenges = (Array.isArray(challenges) ? challenges : [])
            .filter((c: any) => c.status === 'pending' || c.status === 'in_progress')
            .slice(0, 3);

        return { stats, recentSessions, stories, activeChallenges };
    }

    /**
     * Match stories by extracting keywords from user message and matching against story tags.
     * Uses diacritics-free fuzzy matching (same pattern as useStoryBankSuggestions).
     */
    matchStories(stories: any[], userMessage: string, limit: number = 5): any[] {
        if (!stories.length || !userMessage.trim()) return [];

        const keywords = extractKeywords(userMessage);
        const keywordsNorm = keywords.map(removeDiacritics);

        const scored = stories.map(story => {
            const tags: string[] = story.tags || [];
            const tagsNorm = tags.map(removeDiacritics);
            const titleNorm = removeDiacritics(story.title || '');

            let score = 0;
            for (const kw of keywordsNorm) {
                // Tag match
                if (tagsNorm.some(t => t.includes(kw) || kw.includes(t))) score += 2;
                // Title match
                if (titleNorm.includes(kw)) score += 1;
            }

            // Boost battle-tested stories
            if (story.status === 'battle-tested') score += 1;
            if (story.status === 'ready') score += 0.5;

            return { story, score };
        });

        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(s => s.story);
    }

    /**
     * Format context into a structured text block for the LLM system prompt.
     */
    formatContextForPrompt(ctx: MentorContext): string {
        let text = '';

        // Stats
        if (ctx.stats) {
            text += `[THỐNG KÊ USER]\n`;
            text += `Tổng phiên: ${ctx.stats.totalSessions}, Hoàn thành: ${ctx.stats.completedSessions}, `;
            text += `Điểm TB: ${ctx.stats.averageScore}, Streak: ${ctx.stats.currentStreak} ngày\n\n`;
        } else {
            text += `[THỐNG KÊ USER]\nChưa có dữ liệu luyện tập.\n\n`;
        }

        // Recent sessions
        if (ctx.recentSessions.length > 0) {
            text += `[PHIÊN GẦN ĐÂY] (${ctx.recentSessions.length} phiên)\n`;
            ctx.recentSessions.forEach((s: any, i: number) => {
                const name = s.scenario?.scenarioName || s.scenario?.scenario?.scenarioName || 'Phiên luyện tập';
                const score = s.overall_score || s.score || '?';
                const date = s.created_at ? new Date(s.created_at).toLocaleDateString('vi-VN') : '?';
                text += `${i + 1}. "${name}" - ${score}/100 - ${date}\n`;
            });
            text += '\n';
        }

        // Stories
        if (ctx.stories.length > 0) {
            text += `[STORY BANK] (${ctx.stories.length} stories)\n`;
            ctx.stories.forEach((s: any, i: number) => {
                const tags = (s.tags || []).join(', ');
                text += `${i + 1}. "${s.title}" [${s.framework || 'STAR'}] - tags: ${tags} - status: ${s.status} - luyện: ${s.practice_count || 0} lần\n`;
            });
            text += '\n';
        } else {
            text += `[STORY BANK]\nChưa có story nào.\n\n`;
        }

        // Challenges
        if (ctx.activeChallenges.length > 0) {
            text += `[CHALLENGE ĐANG HOẠT ĐỘNG] (${ctx.activeChallenges.length})\n`;
            ctx.activeChallenges.forEach((c: any, i: number) => {
                text += `${i + 1}. "${c.title}" - Lv${c.difficulty} - ${c.status}\n`;
            });
            text += '\n';
        }

        return text;
    }
}
