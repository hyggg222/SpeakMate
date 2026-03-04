-- 001_initial_schema.sql
-- SpeakMate persistence layer: profiles, sessions, turns, evaluations
-- Run this in the Supabase SQL editor (Dashboard → SQL → New Query)

-- ============================================================
-- 1. TABLES
-- ============================================================

-- profiles — mirrors auth.users; auto-populated by trigger
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    full_name   TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- practice_sessions — one row per conversation session
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,  -- nullable for guest sessions
    mode          TEXT NOT NULL DEFAULT 'safe'
                      CHECK (mode IN ('safe', 'stage', 'debate')),
    scenario      JSONB NOT NULL,                                          -- stores FullScenarioContext
    status        TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'completed', 'abandoned')),
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- conversation_turns — ordered dialogue within a session
CREATE TABLE IF NOT EXISTS public.conversation_turns (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    turn_number      INTEGER NOT NULL,
    user_transcript  TEXT,
    ai_response      TEXT,
    audio_file_key   TEXT,       -- Supabase storage key for user audio
    bot_audio_url    TEXT,       -- signed URL / key for TTS output
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- evaluations — one per session (UNIQUE constraint doubles as index)
CREATE TABLE IF NOT EXISTS public.evaluations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       UUID NOT NULL UNIQUE REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    overall_score    NUMERIC(5,2),
    overall_feedback TEXT,
    radar_data       JSONB,     -- category scores for radar chart
    strengths        JSONB,     -- text[]  equivalent
    improvements     JSONB,     -- text[]  equivalent
    turn_highlights  JSONB,     -- per-turn feedback
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id
    ON public.practice_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at
    ON public.practice_sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_turns_session_turn
    ON public.conversation_turns (session_id, turn_number);

-- evaluations(session_id) is already covered by the UNIQUE constraint

-- ============================================================
-- 3. ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations        ENABLE ROW LEVEL SECURITY;

-- profiles: users can read and update their own row
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- practice_sessions: full CRUD on own sessions
CREATE POLICY sessions_select_own ON public.practice_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY sessions_insert_own ON public.practice_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sessions_update_own ON public.practice_sessions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY sessions_delete_own ON public.practice_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- conversation_turns: CRUD where the parent session belongs to the user
CREATE POLICY turns_select_own ON public.conversation_turns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions ps
            WHERE ps.id = session_id AND ps.user_id = auth.uid()
        )
    );

CREATE POLICY turns_insert_own ON public.conversation_turns
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.practice_sessions ps
            WHERE ps.id = session_id AND ps.user_id = auth.uid()
        )
    );

CREATE POLICY turns_update_own ON public.conversation_turns
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions ps
            WHERE ps.id = session_id AND ps.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.practice_sessions ps
            WHERE ps.id = session_id AND ps.user_id = auth.uid()
        )
    );

CREATE POLICY turns_delete_own ON public.conversation_turns
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions ps
            WHERE ps.id = session_id AND ps.user_id = auth.uid()
        )
    );

-- evaluations: read-only for the session owner
CREATE POLICY evaluations_select_own ON public.evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions ps
            WHERE ps.id = session_id AND ps.user_id = auth.uid()
        )
    );

-- ============================================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
    );
    RETURN NEW;
END;
$$;

-- Drop if exists so migration is re-runnable
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
