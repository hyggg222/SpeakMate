-- 007_eval_progress.sql
-- SpeakMate Evaluation & Progress: SessionMetrics + UserProgress

-- 1. SESSION METRICS — output from Analyst per gym session
CREATE TABLE IF NOT EXISTS public.session_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- 4 chỉ số diễn đạt
    coherence_score NUMERIC(5,2) DEFAULT 0,        -- Độ mạch lạc (0-100)
    jargon_count INT DEFAULT 0,                     -- Số từ chuyên môn thừa
    jargon_list JSONB DEFAULT '[]'::jsonb,          -- [{word, suggestion}]
    avg_response_time NUMERIC(5,2) DEFAULT 0,       -- Thời gian phản xạ TB (giây)
    filler_count INT DEFAULT 0,                     -- Số từ đệm tổng
    filler_per_minute NUMERIC(5,2) DEFAULT 0,       -- Từ đệm/phút
    filler_list JSONB DEFAULT '[]'::jsonb,          -- [{word, count}]

    -- Story Bank coverage
    story_coverage JSONB DEFAULT NULL,              -- {usedStories[], unusedRelevant[], missedParts[]}

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_session_metrics UNIQUE (session_id)
);

-- 2. USER PROGRESS — aggregated, updated after each session/challenge
CREATE TABLE IF NOT EXISTS public.user_progress (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Communication Level (1-10)
    communication_level INT NOT NULL DEFAULT 1,
    total_xp INT NOT NULL DEFAULT 0,
    current_streak INT NOT NULL DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,               -- ["Khởi động", "Kiên trì", ...]

    -- Averages (last 5 sessions)
    total_sessions INT NOT NULL DEFAULT 0,
    avg_coherence NUMERIC(5,2) DEFAULT 0,
    avg_response_time NUMERIC(5,2) DEFAULT 0,

    -- Story Bank stats
    story_bank_stats JSONB DEFAULT '{"total":0,"battleReady":0,"fromPractice":0,"uniqueTags":[]}'::jsonb,

    -- Challenge stats
    challenge_stats JSONB DEFAULT '{"total":0,"completed":0,"highestDifficulty":0,"completionRate":0}'::jsonb,

    -- Emotion trend (last 5 challenges)
    emotion_trend JSONB DEFAULT '[]'::jsonb,        -- [{challengeId, before, after}]

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_session_metrics_user ON public.session_metrics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_metrics_session ON public.session_metrics(session_id);

-- 4. RLS
ALTER TABLE public.session_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_metrics_select_own ON public.session_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_progress_select_own ON public.user_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Backend (service key) handles inserts/updates, so no insert/update policies for users.
