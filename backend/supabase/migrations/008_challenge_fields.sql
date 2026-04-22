-- Migration 008: Add missing fields to realworld_challenges
-- Adds: difficulty, source_weakness, suggested_stories, completed_at
-- Fixes: status constraint to include 'skipped'

ALTER TABLE public.realworld_challenges
    ADD COLUMN IF NOT EXISTS difficulty INT NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS source_weakness TEXT,
    ADD COLUMN IF NOT EXISTS suggested_stories JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Fix status constraint to include 'skipped'
ALTER TABLE public.realworld_challenges
    DROP CONSTRAINT IF EXISTS realworld_challenges_status_check;

ALTER TABLE public.realworld_challenges
    ADD CONSTRAINT realworld_challenges_status_check
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'expired'));
