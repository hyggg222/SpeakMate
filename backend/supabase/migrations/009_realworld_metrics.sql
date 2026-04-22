-- Migration 009: Add source_type and realworld-specific columns to session_metrics
-- Allows separating gym sessions from real-world feedback in progress charts

ALTER TABLE public.session_metrics
    ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'gym'
        CHECK (source_type IN ('gym', 'realworld')),
    ADD COLUMN IF NOT EXISTS fluency_score INT,     -- 0-100
    ADD COLUMN IF NOT EXISTS fluency_note TEXT,
    ADD COLUMN IF NOT EXISTS emotion_trend TEXT,    -- 'improved'|'same'|'declined'|'unknown'
    ADD COLUMN IF NOT EXISTS emotion_trend_note TEXT,
    ADD COLUMN IF NOT EXISTS transcript TEXT;       -- short transcript snippet for realworld (optional)

-- Index for filtering by source_type
CREATE INDEX IF NOT EXISTS idx_session_metrics_source_type
    ON public.session_metrics(user_id, source_type, created_at DESC);
