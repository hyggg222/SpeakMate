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
                        overall_score: report.overallScore ?? null,
                        overall_feedback: report.overallFeedback ?? null,
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
                    exp_reward: 50
                })
                .select('*')
                .single();
            if (error) {
                if (this.isTableMissing(error)) {
                    console.warn('[DatabaseService] gamification tables missing');
                    return null;
                }
                throw error;
            }
            return data;
        } catch (err) {
            console.error('[DatabaseService] createChallenge failed:', err);
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
