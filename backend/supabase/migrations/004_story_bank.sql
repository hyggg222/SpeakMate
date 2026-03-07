-- Migration 004: Story Bank
-- Adds story_entries and story_practice_history tables for the Story Bank feature.

-- story_entries: kho chuyện cá nhân
CREATE TABLE IF NOT EXISTS public.story_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    raw_input TEXT NOT NULL,
    input_method TEXT NOT NULL CHECK (input_method IN ('text', 'voice', 'upload')),
    framework TEXT NOT NULL DEFAULT 'STAR' CHECK (framework IN ('STAR', 'PREP', 'CAR')),
    structured JSONB NOT NULL,
    full_script TEXT NOT NULL,
    estimated_duration INTEGER NOT NULL DEFAULT 30,
    tags TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'battle-tested')),
    practice_count INTEGER NOT NULL DEFAULT 0,
    last_score NUMERIC(5,2) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_story_entries_user_id ON public.story_entries(user_id);
CREATE INDEX idx_story_entries_tags ON public.story_entries USING GIN(tags);
CREATE INDEX idx_story_entries_status ON public.story_entries(status);

-- story_practice_history: lịch sử luyện tập theo story
CREATE TABLE IF NOT EXISTS public.story_practice_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.story_entries(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
    coverage_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    missed_parts JSONB DEFAULT '[]',
    added_parts JSONB DEFAULT '[]',
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_story_practice_history_story_id ON public.story_practice_history(story_id);

-- RLS
ALTER TABLE public.story_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_practice_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stories" ON public.story_entries
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own practice history" ON public.story_practice_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.story_entries WHERE id = story_practice_history.story_id AND user_id = auth.uid())
    );
