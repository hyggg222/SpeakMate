-- Add columns to support barge-in (interruption) tracking
ALTER TABLE public.conversation_turns
    ADD COLUMN IF NOT EXISTS interrupted     BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS delivered_chars INTEGER;
