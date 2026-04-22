import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

export interface ChatMessage {
    id: string;
    role: 'user' | 'mentor';
    content: string;
    intent?: 'query' | 'action' | 'support' | null;
    actionTaken?: {
        type: string;
        prefillData?: any;
        label: string;
        href: string;
    } | null;
    dataCards?: {
        stories?: any[];
        challenges?: any[];
        progress?: any;
    } | null;
    createdAt: string;
}

function createGreeting(): ChatMessage {
    return {
        id: 'greeting',
        role: 'mentor',
        content: 'Chào bạn! Mình là Ni, mentor giao tiếp cá nhân của bạn. Hôm nay mình giúp gì được nè?',
        intent: null,
        createdAt: new Date().toISOString(),
    };
}

/**
 * Hook for Mentor Ni Chat — real API integration.
 * Server persists full history; UI shows fresh greeting + new messages.
 * Ni has access to past context via server-side history.
 */
export function useMentorChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    // On mount: load history from server, or show greeting if empty
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        apiClient.getMentorChatHistory(50).then(({ sessionId: sid, messages: serverMessages }) => {
            if (sid) setSessionId(sid);

            if (serverMessages && serverMessages.length > 0) {
                // Map server messages to ChatMessage format
                const loaded: ChatMessage[] = serverMessages.map((m: any) => ({
                    id: m.id || `srv-${Math.random()}`,
                    role: m.role as 'user' | 'mentor',
                    content: m.content,
                    intent: m.intent || null,
                    actionTaken: m.action_taken || m.actionTaken || null,
                    dataCards: m.data_cards || m.dataCards || null,
                    createdAt: m.created_at || m.createdAt || new Date().toISOString(),
                }));
                setMessages(loaded);
            } else {
                setMessages([createGreeting()]);
            }
        }).catch(() => {
            setMessages([createGreeting()]);
        });
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || loading) return;

        // Add user message optimistically
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const { sessionId: sid, message: mentorResponse } = await apiClient.sendMentorChatMessage(text);
            if (sid) setSessionId(sid);

            const mentorMsg: ChatMessage = {
                id: mentorResponse.id || `mentor-${Date.now()}`,
                role: 'mentor',
                content: mentorResponse.content,
                intent: mentorResponse.intent || null,
                actionTaken: mentorResponse.actionTaken || mentorResponse.action_taken || null,
                dataCards: mentorResponse.dataCards || mentorResponse.data_cards || null,
                createdAt: mentorResponse.createdAt || mentorResponse.created_at || new Date().toISOString(),
            };
            setMessages(prev => [...prev, mentorMsg]);
        } catch (err) {
            // Show error as Ni message
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'mentor',
                content: 'Xin lỗi, Ni đang gặp trục trặc. Bạn thử lại sau nhé!',
                intent: 'support',
                createdAt: new Date().toISOString(),
            }]);
        } finally {
            setLoading(false);
        }
    }, [loading]);

    const clearHistory = useCallback(async () => {
        const ok = await apiClient.clearMentorChatHistory();
        if (ok) {
            setMessages([createGreeting()]);
            setSessionId(null);
        }
    }, []);

    return { messages, loading, sessionId, sendMessage, clearHistory, scrollRef };
}
