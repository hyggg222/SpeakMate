-- 006_multi_character.sql
-- Support for dual-character conversation sessions.
-- Adds per-turn speaker identity columns. Nullable for backward compatibility.

ALTER TABLE public.conversation_turns
    ADD COLUMN IF NOT EXISTS speaker_type TEXT CHECK (speaker_type IN ('user', 'ai')),
    ADD COLUMN IF NOT EXISTS speaker_id TEXT,
    ADD COLUMN IF NOT EXISTS speaker_name TEXT,
    ADD COLUMN IF NOT EXISTS content TEXT;
