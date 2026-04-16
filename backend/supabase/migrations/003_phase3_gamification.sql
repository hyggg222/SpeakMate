-- 003_phase3_gamification.sql
-- SpeakMate Phase 3: Gamification, Real-world Challenges, and Session Versioning

-- 1. ADD COLUMNS TO EXISTING TABLES

-- Add total_exp to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_exp INT NOT NULL DEFAULT 0;

-- Add version_number and parent_session_id to practice_sessions
ALTER TABLE public.practice_sessions
ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS version_number INT NOT NULL DEFAULT 1;

-- 2. CREATE NEW TABLES

-- Realworld Challenges
CREATE TABLE IF NOT EXISTS public.realworld_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    opener_hints JSONB,           -- Suggestions on how to start the conversation (array of strings)
    deadline TIMESTAMPTZ,         -- User-set deadline
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'expired')),
    exp_reward INT NOT NULL DEFAULT 50, -- Base reward
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EXP Logs (To track how EXP was earned)
CREATE TABLE IF NOT EXISTS public.user_exp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    reason TEXT NOT NULL,
    related_challenge_id UUID REFERENCES public.realworld_challenges(id) ON DELETE SET NULL,
    related_session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON public.realworld_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.realworld_challenges(status);
CREATE INDEX IF NOT EXISTS idx_exp_logs_user_id ON public.user_exp_logs(user_id);

-- 4. RLS POLICIES
ALTER TABLE public.realworld_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exp_logs ENABLE ROW LEVEL SECURITY;

-- Challenges: CRUD on own challenges
CREATE POLICY challenges_select_own ON public.realworld_challenges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY challenges_insert_own ON public.realworld_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY challenges_update_own ON public.realworld_challenges
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY challenges_delete_own ON public.realworld_challenges
    FOR DELETE USING (auth.uid() = user_id);

-- EXP Logs: Read-only on own logs
CREATE POLICY exp_logs_select_own ON public.user_exp_logs
    FOR SELECT USING (auth.uid() = user_id);
-- Insert is done by backend (Service Key) so users can't forge EXP.
