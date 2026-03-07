import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { FullScenarioContext } from '../contracts/data.contracts';

// Admin client — uses service key; RLS is bypassed.
// Auth-level access control is handled by middleware before reaching this service.

const supabaseUrl = config.supabaseUrl;
const supabaseKey = config.supabaseKey;

const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: globalThis.fetch }
});

export interface TurnData {
    userTranscript: string;
    aiResponse: string;
    audioFileKey?: string;
    botAudioUrl?: string;
}

export interface UserStats {
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    currentStreak: number;
}

export class DatabaseService {

    /**
     * Returns true if the error indicates a missing table (migration not yet run).
     */
    private isTableMissing(error: any): boolean {
        return error?.code === 'PGRST205' || error?.code === 'PGRST204';
    }

    // ----------------------------------------------------------------
    // Sessions
    // ----------------------------------------------------------------

    /**
     * Creates a new practice session and returns its UUID.
     */
    async createSession(
        userId: string | null,
        mode: string,
        scenario: FullScenarioContext
    ): Promise<string> {
        try {
            const { data, error } = await supabase
                .from('practice_sessions')
                .insert({
                    user_id: userId,
                    mode,
                    scenario: scenario as any,
                    status: 'active',
                })
                .select('id')
                .single();

            if (error) {
                console.error('[DatabaseService] createSession error:', error);
                throw error;
            }
            return data.id;
        } catch (err) {
            console.error('[DatabaseService] createSession failed:', err);
            throw err;
        }
    }

    /**
     * Marks a session as completed and stamps completed_at.
     */
    async completeSession(sessionId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('practice_sessions')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', sessionId);

            if (error) {
                console.error('[DatabaseService] completeSession error:', error);
                throw error;
            }
        } catch (err) {
            console.error('[DatabaseService] completeSession failed:', err);
            throw err;
        }
    }

    /**
     * Fetches a single session by ID (includes scenario JSONB).
     */
    async getSession(sessionId: string): Promise<any> {
        try {
            const { data, error } = await supabase
                .from('practice_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (error) {
                console.error('[DatabaseService] getSession error:', error);
                throw error;
            }
            return data;
        } catch (err) {
            console.error('[DatabaseService] getSession failed:', err);
            throw err;
        }
    }

    /**
     * Lists sessions for a given user, newest first.
     */
    async getUserSessions(
        userId: string,
        limit = 20,
        offset = 0
    ): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('practice_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                if (this.isTableMissing(error)) {
                    console.warn('[DatabaseService] practice_sessions table not found — run migration. Returning [].');
                    return [];
                }
                console.error('[DatabaseService] getUserSessions error:', error);
                throw error;
            }
            return data || [];
        } catch (err) {
            console.error('[DatabaseService] getUserSessions failed:', err);
            throw err;
        }
    }

    // ----------------------------------------------------------------
    // Turns
    // ----------------------------------------------------------------

    /**
     * Inserts a conversation turn and returns its UUID.
     */
    async addTurn(
        sessionId: string,
        turnNumber: number,
        data: TurnData
    ): Promise<string> {
        try {
            const { data: row, error } = await supabase
                .from('conversation_turns')
                .insert({
                    session_id: sessionId,
                    turn_number: turnNumber,
                    user_transcript: data.userTranscript,
                    ai_response: data.aiResponse,
                    audio_file_key: data.audioFileKey || null,
                    bot_audio_url: data.botAudioUrl || null,
                })
                .select('id')
                .single();

            if (error) {
                console.error('[DatabaseService] addTurn error:', error);
                throw error;
            }
            return row.id;
        } catch (err) {
            console.error('[DatabaseService] addTurn failed:', err);
            throw err;
        }
    }

    /**
     * Updates the AI response for an existing turn row (used by internal API when
     * Python agent sends the AI turn after the User turn).
     */
    async updateTurnAiResponse(sessionId: string, turnNumber: number, aiResponse: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('conversation_turns')
                .update({ ai_response: aiResponse })
                .eq('session_id', sessionId)
                .eq('turn_number', turnNumber);

            if (error) {
                console.error('[DatabaseService] updateTurnAiResponse error:', error);
                throw error;
            }
        } catch (err) {
            console.error('[DatabaseService] updateTurnAiResponse failed:', err);
            throw err;
        }
    }

    /**
     * Marks a turn as interrupted and records how many characters were spoken.
     */
    async markTurnInterrupted(sessionId: string, turnNumber: number, deliveredChars: number): Promise<void> {
        try {
            const { error } = await supabase
                .from('conversation_turns')
                .update({ interrupted: true, delivered_chars: deliveredChars })
                .eq('session_id', sessionId)
                .eq('turn_number', turnNumber);

            if (error) {
                console.error('[DatabaseService] markTurnInterrupted error:', error);
                throw error;
            }
        } catch (err) {
            console.error('[DatabaseService] markTurnInterrupted failed:', err);
            throw err;
        }
    }

    /**
     * Returns all turns for a session, ordered by turn_number.
     */
    async getSessionTurns(sessionId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('conversation_turns')
                .select('*')
                .eq('session_id', sessionId)
                .order('turn_number', { ascending: true });

            if (error) {
                console.error('[DatabaseService] getSessionTurns error:', error);
                throw error;
            }
            return data || [];
        } catch (err) {
            console.error('[DatabaseService] getSessionTurns failed:', err);
            throw err;
        }
    }

    // ----------------------------------------------------------------
    // Evaluations
    // ----------------------------------------------------------------

    /**
     * Saves (upserts) an evaluation report for a session. Returns evaluation UUID.
     */
    async saveEvaluation(sessionId: string, report: any): Promise<string> {
        try {
            const { data, error } = await supabase
                .from('evaluations')
                .upsert(
                    {
                        session_id: sessionId,
                        overall_score: report.goalProgress ?? report.overallScore ?? null,
                        overall_feedback: report.overallFeedback ?? null,
                        report_data: report,
                        // Legacy fields for backward compat
                        radar_data: report.radarData ?? null,
                        strengths: report.strengths ?? null,
                        improvements: report.improvements ?? null,
                        turn_highlights: report.turnHighlights ?? null,
                    },
                    { onConflict: 'session_id' }
                )
                .select('id')
                .single();

            if (error) {
                console.error('[DatabaseService] saveEvaluation error:', error);
                throw error;
            }
            return data.id;
        } catch (err) {
            console.error('[DatabaseService] saveEvaluation failed:', err);
            throw err;
        }
    }

    /**
     * Fetches the evaluation for a given session (or null if none exists).
     */
    async getEvaluation(sessionId: string): Promise<any> {
        try {
            const { data, error } = await supabase
                .from('evaluations')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 = "no rows found" — not a real error, just means no evaluation yet
                console.error('[DatabaseService] getEvaluation error:', error);
                throw error;
            }
            return data || null;
        } catch (err) {
            console.error('[DatabaseService] getEvaluation failed:', err);
            throw err;
        }
    }

    // ----------------------------------------------------------------
    // Progress / Stats
    // ----------------------------------------------------------------

    /**
     * Aggregates high-level stats for a user's dashboard.
     */
    async getUserStats(userId: string): Promise<UserStats> {
        try {
            // Total & completed session counts
            const { data: sessions, error: sessErr } = await supabase
                .from('practice_sessions')
                .select('id, status, created_at')
                .eq('user_id', userId);

            if (sessErr) {
                if (this.isTableMissing(sessErr)) {
                    console.warn('[DatabaseService] practice_sessions table not found — run migration. Returning defaults.');
                    return { totalSessions: 0, completedSessions: 0, averageScore: 0, currentStreak: 0 };
                }
                console.error('[DatabaseService] getUserStats sessions error:', sessErr);
                throw sessErr;
            }

            const all = sessions || [];
            const totalSessions = all.length;
            const completedSessions = all.filter(s => s.status === 'completed').length;

            // Average score across evaluations for this user's completed sessions
            const completedIds = all
                .filter(s => s.status === 'completed')
                .map(s => s.id);

            let averageScore = 0;
            if (completedIds.length > 0) {
                const { data: evals, error: evalErr } = await supabase
                    .from('evaluations')
                    .select('overall_score')
                    .in('session_id', completedIds);

                if (evalErr) {
                    console.error('[DatabaseService] getUserStats evaluations error:', evalErr);
                    throw evalErr;
                }

                const scores = (evals || [])
                    .map(e => Number(e.overall_score))
                    .filter(n => !isNaN(n));

                if (scores.length > 0) {
                    averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                    averageScore = Math.round(averageScore * 100) / 100;
                }
            }

            // Current streak: consecutive days (ending today) with at least one completed session
            const currentStreak = this.computeStreak(all);

            return { totalSessions, completedSessions, averageScore, currentStreak };
        } catch (err) {
            console.error('[DatabaseService] getUserStats failed:', err);
            throw err;
        }
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    /**
     * Computes a day-based streak of consecutive completed sessions
     * ending on or before today.
     */
    private computeStreak(sessions: any[]): number {
        const completed = sessions.filter(s => s.status === 'completed');
        if (completed.length === 0) return 0;

        // Unique dates (YYYY-MM-DD) with completed sessions, sorted descending
        const uniqueDays = [
            ...new Set(
                completed.map(s => new Date(s.created_at).toISOString().slice(0, 10))
            )
        ].sort((a, b) => (a > b ? -1 : 1));

        let streak = 1;
        for (let i = 1; i < uniqueDays.length; i++) {
            const prev = new Date(uniqueDays[i - 1]);
            const curr = new Date(uniqueDays[i]);
            const diffMs = prev.getTime() - curr.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    // ----------------------------------------------------------------
    // Gamification (Challenges & EXP)
    // ----------------------------------------------------------------
    async createChallenge(userId: string, sessionId: string, challengeData: any): Promise<any> {
        try {
            const { data, error } = await supabase
                .from('realworld_challenges')
                .insert({
                    user_id: userId,
                    session_id: sessionId || null,
                    title: challengeData.title,
                    description: challengeData.description,
                    opener_hints: challengeData.opener_hints || [],
                    difficulty: challengeData.difficulty || 3,
                    source_weakness: challengeData.sourceWeakness || null,
                    suggested_stories: challengeData.suggestedStories || [],
                    exp_reward: 50 + (challengeData.difficulty || 3) * 10,
                })
                .select('*')
                .single();
            if (error) {
                if (this.isTableMissing(error)) {
                    console.warn('[DatabaseService] gamification tables missing');
                    return null;
                }
                // Column might not exist yet (migration 008 pending) — fallback insert
                if (error.code === '42703') {
                    const { data: fallback, error: e2 } = await supabase
                        .from('realworld_challenges')
                        .insert({
                            user_id: userId,
                            session_id: sessionId || null,
                            title: challengeData.title,
                            description: challengeData.description,
                            opener_hints: challengeData.opener_hints || [],
                            exp_reward: 50,
                        })
                        .select('*')
                        .single();
                    if (e2) throw e2;
                    return { ...fallback, difficulty: challengeData.difficulty || 3, source_weakness: challengeData.sourceWeakness, suggested_stories: [] };
                }
                throw error;
            }
            return data;
        } catch (err) {
            console.error('[DatabaseService] createChallenge failed:', err);
            throw err;
        }
    }

    async updateChallengeContent(challengeId: string, userId: string, challengeData: any): Promise<any> {
        try {
            const fields: any = {
                title: challengeData.title,
                description: challengeData.description,
                opener_hints: challengeData.opener_hints || [],
            };
            if (challengeData.difficulty != null) fields.difficulty = challengeData.difficulty;
            if (challengeData.sourceWeakness != null) fields.source_weakness = challengeData.sourceWeakness;
            if (challengeData.suggestedStories != null) fields.suggested_stories = challengeData.suggestedStories;

            const { data, error } = await supabase
                .from('realworld_challenges')
                .update(fields)
                .eq('id', challengeId)
                .eq('user_id', userId)
                .select('*')
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[DatabaseService] updateChallengeContent failed:', err);
            throw err;
        }
    }

    async getUserChallenges(userId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('realworld_challenges')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) {
                if (this.isTableMissing(error)) return [];
                throw error;
            }
            return data || [];
        } catch (err) {
            console.error('[DatabaseService] getUserChallenges failed:', err);
            throw err;
        }
    }

    async getChallengeById(challengeId: string, userId: string): Promise<any | null> {
        try {
            const { data, error } = await supabase
                .from('realworld_challenges')
                .select('*')
                .eq('id', challengeId)
                .eq('user_id', userId)
                .single();
            if (error) {
                if (this.isTableMissing(error)) return null;
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    async updateChallengeStatus(challengeId: string, userId: string, status: string): Promise<void> {
        try {
            const updateFields: any = { status };
            if (status === 'completed') {
                updateFields.completed_at = new Date().toISOString();
            }
            const { error } = await supabase
                .from('realworld_challenges')
                .update(updateFields)
                .eq('id', challengeId)
                .eq('user_id', userId);
            if (error) throw error;
        } catch (err) {
            console.error('[DatabaseService] updateChallengeStatus failed:', err);
            throw err;
        }
    }

    async setChallengeDeadline(challengeId: string, userId: string, deadline: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('realworld_challenges')
                .update({ deadline })
                .eq('id', challengeId)
                .eq('user_id', userId);
            if (error) throw error;
        } catch (err) {
            console.error('[DatabaseService] setChallengeDeadline failed:', err);
            throw err;
        }
    }

    // ----------------------------------------------------------------
    // Story Bank
    // ----------------------------------------------------------------

    async createStoryEntry(userId: string, data: any): Promise<string> {
        try {
            const { data: row, error } = await supabase
                .from('story_entries')
                .insert({
                    user_id: userId,
                    title: data.title,
                    raw_input: data.rawInput,
                    input_method: data.inputMethod,
                    framework: data.framework || 'STAR',
                    structured: data.structured,
                    full_script: data.fullScript,
                    estimated_duration: data.estimatedDuration || 30,
                    tags: data.tags || [],
                    status: data.status || 'draft',
                })
                .select('id')
                .single();
            if (error) {
                if (this.isTableMissing(error)) {
                    console.warn('[DatabaseService] story_entries table missing — run migration 004.');
                    throw new Error('Story Bank tables not found. Run migration 004_story_bank.sql.');
                }
                throw error;
            }
            return row.id;
        } catch (err) {
            console.error('[DatabaseService] createStoryEntry failed:', err);
            throw err;
        }
    }

    async updateStoryEntry(storyId: string, userId: string, data: any): Promise<void> {
        try {
            const updateFields: any = { updated_at: new Date().toISOString() };
            if (data.title !== undefined) updateFields.title = data.title;
            if (data.structured !== undefined) updateFields.structured = data.structured;
            if (data.fullScript !== undefined) updateFields.full_script = data.fullScript;
            if (data.estimatedDuration !== undefined) updateFields.estimated_duration = data.estimatedDuration;
            if (data.tags !== undefined) updateFields.tags = data.tags;
            if (data.status !== undefined) updateFields.status = data.status;
            if (data.framework !== undefined) updateFields.framework = data.framework;

            const { error } = await supabase
                .from('story_entries')
                .update(updateFields)
                .eq('id', storyId)
                .eq('user_id', userId);
            if (error) throw error;
        } catch (err) {
            console.error('[DatabaseService] updateStoryEntry failed:', err);
            throw err;
        }
    }

    async deleteStoryEntry(storyId: string, userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('story_entries')
                .delete()
                .eq('id', storyId)
                .eq('user_id', userId);
            if (error) throw error;
        } catch (err) {
            console.error('[DatabaseService] deleteStoryEntry failed:', err);
            throw err;
        }
    }

    async getStoryEntry(storyId: string, userId: string): Promise<any> {
        try {
            const { data, error } = await supabase
                .from('story_entries')
                .select('*')
                .eq('id', storyId)
                .eq('user_id', userId)
                .single();
            if (error) {
                if (this.isTableMissing(error)) return null;
                if (error.code === 'PGRST116') return null; // not found
                throw error;
            }
            return data;
        } catch (err) {
            console.error('[DatabaseService] getStoryEntry failed:', err);
            throw err;
        }
    }

    async getUserStories(
        userId: string,
        options: { tags?: string; status?: string; search?: string; limit?: number; offset?: number } = {}
    ): Promise<{ data: any[]; total: number }> {
        try {
            const limit = options.limit || 20;
            const offset = options.offset || 0;

            let query = supabase
                .from('story_entries')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (options.status) {
                query = query.eq('status', options.status);
            }
            if (options.search) {
                query = query.ilike('title', `%${options.search}%`);
            }
            if (options.tags) {
                const tagList = options.tags.split(',').map(t => t.trim()).filter(Boolean);
                if (tagList.length > 0) {
                    query = query.contains('tags', tagList);
                }
            }

            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;
            if (error) {
                if (this.isTableMissing(error)) return { data: [], total: 0 };
                throw error;
            }
            return { data: data || [], total: count || 0 };
        } catch (err) {
            console.error('[DatabaseService] getUserStories failed:', err);
            throw err;
        }
    }

    async updateStoryAfterPractice(storyId: string, practiceCount: number, lastScore: number): Promise<void> {
        try {
            const updateFields: any = {
                practice_count: practiceCount,
                last_score: lastScore,
                updated_at: new Date().toISOString(),
            };
            // Auto-promote to battle-tested after first practice
            if (practiceCount >= 1) {
                updateFields.status = 'battle-tested';
            }
            const { error } = await supabase
                .from('story_entries')
                .update(updateFields)
                .eq('id', storyId);
            if (error) throw error;
        } catch (err) {
            console.error('[DatabaseService] updateStoryAfterPractice failed:', err);
            throw err;
        }
    }

    async createStoryPracticeHistory(data: any): Promise<string> {
        try {
            const { data: row, error } = await supabase
                .from('story_practice_history')
                .insert({
                    story_id: data.storyId,
                    session_id: data.sessionId || null,
                    coverage_score: data.coverageScore || 0,
                    missed_parts: data.missedParts || [],
                    added_parts: data.addedParts || [],
                    feedback: data.feedback || null,
                })
                .select('id')
                .single();
            if (error) throw error;
            return row.id;
        } catch (err) {
            console.error('[DatabaseService] createStoryPracticeHistory failed:', err);
            throw err;
        }
    }

    async getStoryPracticeHistory(storyId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('story_practice_history')
                .select('*')
                .eq('story_id', storyId)
                .order('created_at', { ascending: false });
            if (error) {
                if (this.isTableMissing(error)) return [];
                throw error;
            }
            return data || [];
        } catch (err) {
            console.error('[DatabaseService] getStoryPracticeHistory failed:', err);
            throw err;
        }
    }

    // ----------------------------------------------------------------
    // Gamification (Challenges & EXP)
    // ----------------------------------------------------------------

    // ----------------------------------------------------------------
    // Mentor Ni Chat
    // ----------------------------------------------------------------

    async getOrCreateMentorChatSession(userId: string): Promise<{ id: string; isNew: boolean }> {
        try {
            // Try to find existing session
            const { data: existing, error: findErr } = await supabase
                .from('mentor_chat_sessions')
                .select('id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (findErr && !this.isTableMissing(findErr)) throw findErr;

            if (existing) {
                // Touch updated_at
                await supabase.from('mentor_chat_sessions')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
                return { id: existing.id, isNew: false };
            }

            // Create new session
            const { data: created, error: createErr } = await supabase
                .from('mentor_chat_sessions')
                .insert({ user_id: userId })
                .select('id')
                .single();
            if (createErr) throw createErr;
            return { id: created.id, isNew: true };
        } catch (err) {
            console.error('[DatabaseService] getOrCreateMentorChatSession failed:', err);
            throw err;
        }
    }

    async saveMentorChatMessage(sessionId: string, msg: {
        role: 'user' | 'mentor';
        content: string;
        intent?: string | null;
        actionTaken?: any;
        dataCards?: any;
    }): Promise<string> {
        try {
            const { data, error } = await supabase
                .from('mentor_chat_messages')
                .insert({
                    session_id: sessionId,
                    role: msg.role,
                    content: msg.content,
                    intent: msg.intent || null,
                    action_taken: msg.actionTaken || null,
                    data_cards: msg.dataCards || null,
                })
                .select('id')
                .single();
            if (error) throw error;
            return data.id;
        } catch (err) {
            console.error('[DatabaseService] saveMentorChatMessage failed:', err);
            throw err;
        }
    }

    async clearMentorChatHistory(userId: string): Promise<void> {
        try {
            // Get all sessions for this user
            const { data: sessions } = await supabase
                .from('mentor_chat_sessions')
                .select('id')
                .eq('user_id', userId);

            if (sessions && sessions.length > 0) {
                const sessionIds = sessions.map(s => s.id);
                // Delete messages first (FK constraint)
                await supabase
                    .from('mentor_chat_messages')
                    .delete()
                    .in('session_id', sessionIds);
                // Delete sessions
                await supabase
                    .from('mentor_chat_sessions')
                    .delete()
                    .eq('user_id', userId);
            }
        } catch (err) {
            console.error('[DatabaseService] clearMentorChatHistory failed:', err);
            throw err;
        }
    }

    async getMentorChatMessages(sessionId: string, limit: number = 20): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('mentor_chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true })
                .limit(limit);

            if (error) {
                if (this.isTableMissing(error)) return [];
                throw error;
            }
            return data || [];
        } catch (err) {
            console.error('[DatabaseService] getMentorChatMessages failed:', err);
            return [];
        }
    }

    // ----------------------------------------------------------------
    // Gamification (Challenges & EXP)
    // ----------------------------------------------------------------

    // ----------------------------------------------------------------
    // Session Metrics & User Progress (Evaluation Spec)
    // ----------------------------------------------------------------

    /**
     * Save SessionMetrics after evaluation (coherence, jargon, filler, etc.)
     */
    async getRecentSessionMetrics(userId: string, limit = 10): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('session_metrics')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                if (this.isTableMissing(error)) return [];
                throw error;
            }
            return (data || []).reverse(); // chronological order for charts
        } catch {
            return [];
        }
    }

    async saveSessionMetrics(sessionId: string, userId: string | null, metrics: any, avgResponseTime: number): Promise<void> {
        try {
            const { error } = await supabase.from('session_metrics').upsert({
                session_id: sessionId,
                user_id: userId,
                coherence_score: metrics.coherenceScore ?? 0,
                jargon_count: metrics.jargonCount ?? 0,
                jargon_list: metrics.jargonList ?? [],
                avg_response_time: avgResponseTime,
                filler_count: metrics.fillerCount ?? 0,
                filler_per_minute: metrics.fillerPerMinute ?? 0,
                filler_list: metrics.fillerList ?? [],
            }, { onConflict: 'session_id' });
            if (error) {
                if (this.isTableMissing(error)) return;
                console.error('[DatabaseService] saveSessionMetrics error:', error);
            }
        } catch (err) {
            console.error('[DatabaseService] saveSessionMetrics failed:', err);
        }
    }

    /**
     * Compute avgResponseTime from conversation_turns for a session.
     * Measures time between consecutive user→AI turn pairs.
     */
    async computeAvgResponseTime(sessionId: string): Promise<number> {
        try {
            const { data: turns, error } = await supabase
                .from('conversation_turns')
                .select('turn_number, created_at')
                .eq('session_id', sessionId)
                .order('turn_number', { ascending: true });

            if (error || !turns || turns.length < 2) return 0;

            // Calculate time gaps between consecutive turns (user → AI)
            const gaps: number[] = [];
            for (let i = 1; i < turns.length; i++) {
                const prev = new Date(turns[i - 1].created_at).getTime();
                const curr = new Date(turns[i].created_at).getTime();
                const diffSeconds = (curr - prev) / 1000;
                if (diffSeconds > 0 && diffSeconds < 60) {
                    gaps.push(diffSeconds);
                }
            }
            if (gaps.length === 0) return 0;
            return parseFloat((gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2));
        } catch {
            return 0;
        }
    }

    /**
     * Get the previous SessionMetrics for comparison.
     */
    async getPreviousSessionMetrics(userId: string, currentSessionId: string): Promise<any | null> {
        try {
            const { data, error } = await supabase
                .from('session_metrics')
                .select('*')
                .eq('user_id', userId)
                .neq('session_id', currentSessionId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) return null;
            return data;
        } catch {
            return null;
        }
    }

    /**
     * Get or create UserProgress for a user.
     */
    async getUserProgress(userId: string): Promise<any | null> {
        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (this.isTableMissing(error)) return null;
                if (error.code === 'PGRST116') return null; // no row
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    /**
     * Update UserProgress after a session evaluation.
     * Recalculates averages from last 5 session_metrics.
     */
    async updateUserProgress(userId: string, sessionMetrics: any, evalReport: any): Promise<void> {
        try {
            // Get last 5 session metrics for averages
            const { data: recentMetrics } = await supabase
                .from('session_metrics')
                .select('coherence_score, avg_response_time')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(5);

            const avgCoherence = recentMetrics && recentMetrics.length > 0
                ? parseFloat((recentMetrics.reduce((s: number, m: any) => s + (m.coherence_score || 0), 0) / recentMetrics.length).toFixed(2))
                : sessionMetrics?.coherenceScore ?? 0;

            const avgResponseTime = recentMetrics && recentMetrics.length > 0
                ? parseFloat((recentMetrics.reduce((s: number, m: any) => s + (m.avg_response_time || 0), 0) / recentMetrics.length).toFixed(2))
                : 0;

            // Count total sessions
            const { count: totalSessions } = await supabase
                .from('practice_sessions')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'completed');

            // Get current progress or defaults
            const existing = await this.getUserProgress(userId);

            // Calculate Communication Level (1-10)
            // Diễn đạt 40% + Kể chuyện 20% + Thực chiến 40%
            const expressionScore = avgCoherence; // 0-100
            const storyScore = existing?.story_bank_stats?.battleReady ? Math.min(existing.story_bank_stats.battleReady * 20, 100) : 0;
            const challengeRate = existing?.challenge_stats?.completionRate ?? 0; // 0-100
            const compositeScore = expressionScore * 0.4 + storyScore * 0.2 + challengeRate * 0.4;
            const communicationLevel = Math.max(1, Math.min(10, Math.ceil(compositeScore / 10)));

            // Calculate XP earned for this session
            const sessionXP = Math.round((evalReport.goalProgress || 0) * 0.5) + 10; // base 10 + bonus

            const totalXP = (existing?.total_xp ?? 0) + sessionXP;

            // Badges based on streak
            const currentStreak = existing?.current_streak ?? 0;
            const badges: string[] = existing?.badges ?? [];
            if (currentStreak >= 3 && !badges.includes('Khởi động')) badges.push('Khởi động');
            if (currentStreak >= 7 && !badges.includes('Kiên trì')) badges.push('Kiên trì');
            if (currentStreak >= 15 && !badges.includes('Thực chiến gia')) badges.push('Thực chiến gia');

            const { error } = await supabase.from('user_progress').upsert({
                user_id: userId,
                communication_level: communicationLevel,
                total_xp: totalXP,
                current_streak: currentStreak,
                badges,
                total_sessions: totalSessions ?? 0,
                avg_coherence: avgCoherence,
                avg_response_time: avgResponseTime,
                story_bank_stats: existing?.story_bank_stats ?? { total: 0, battleReady: 0, fromPractice: 0, uniqueTags: [] },
                challenge_stats: existing?.challenge_stats ?? { total: 0, completed: 0, highestDifficulty: 0, completionRate: 0 },
                emotion_trend: existing?.emotion_trend ?? [],
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

            if (error && !this.isTableMissing(error)) {
                console.error('[DatabaseService] updateUserProgress error:', error);
            }
        } catch (err) {
            console.error('[DatabaseService] updateUserProgress failed:', err);
        }
    }

    async addExp(userId: string, amount: number, reason: string): Promise<void> {
        try {
            const { error: logErr } = await supabase.from('user_exp_logs')
                .insert({ user_id: userId, amount, reason });
            if (logErr) {
                if (this.isTableMissing(logErr)) return;
                throw logErr;
            }

            const { data: profile, error: readErr } = await supabase
                .from('profiles').select('total_exp').eq('id', userId).single();
            if (readErr) throw readErr;

            const newExp = (profile.total_exp || 0) + amount;
            await supabase.from('profiles').update({ total_exp: newExp }).eq('id', userId);
        } catch (err) {
            console.error('[DatabaseService] addExp failed:', err);
            throw err;
        }
    }
}
