-- 005_mentor_chat.sql
-- Mentor Ni Chat: persistent chat sessions and messages

-- One session per user (continuous conversation)
CREATE TABLE IF NOT EXISTS public.mentor_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_chat_sessions_user
    ON public.mentor_chat_sessions(user_id);

-- Individual chat messages
CREATE TABLE IF NOT EXISTS public.mentor_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.mentor_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'mentor')),
    content TEXT NOT NULL,
    intent TEXT CHECK (intent IN ('query', 'action', 'support')),
    action_taken JSONB DEFAULT NULL,
    data_cards JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_chat_messages_session
    ON public.mentor_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_mentor_chat_messages_created
    ON public.mentor_chat_messages(created_at DESC);

-- RLS (backend uses service key, but policies for direct access)
ALTER TABLE public.mentor_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY mentor_chat_sessions_user_policy ON public.mentor_chat_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY mentor_chat_messages_user_policy ON public.mentor_chat_messages
    FOR ALL USING (
        session_id IN (SELECT id FROM public.mentor_chat_sessions WHERE user_id = auth.uid())
    );
