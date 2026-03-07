'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

const SESSION_KEY = 'speakmate_story_creation_session';

export interface ChatMessage {
    role: 'user' | 'mentor';
    content: string;
    fieldTargeted: string | null;
    timestamp: string;
}

export interface StoryCreationSession {
    id: string;
    framework: string;
    initialInput: string;
    inputMethod: 'text' | 'voice' | 'upload';
    chatMessages: ChatMessage[];
    totalTurns: number;
    status: 'chatting' | 'structuring' | 'previewing' | 'saved';
    createdAt: string;
}

export interface StructuredResult {
    title: string;
    structured: Record<string, string>;
    fullScript: string;
    estimatedDuration: number;
    suggestedTags: string[];
    framework: string;
    missingFields: string[];
    completenessNote: string | null;
}

export function useStoryChat() {
    const [session, setSession] = useState<StoryCreationSession | null>(null);
    const [structuredResult, setStructuredResult] = useState<StructuredResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Persist session to localStorage on every change
    useEffect(() => {
        if (session && session.status !== 'saved') {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    }, [session]);

    // Auto-scroll on new messages
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [session?.chatMessages.length]);

    const hasExistingSession = useCallback((): boolean => {
        const saved = localStorage.getItem(SESSION_KEY);
        if (!saved) return false;
        try {
            const parsed = JSON.parse(saved);
            return parsed.status === 'chatting' || parsed.status === 'previewing';
        } catch {
            return false;
        }
    }, []);

    const restoreSession = useCallback((): StoryCreationSession | null => {
        const saved = localStorage.getItem(SESSION_KEY);
        if (!saved) return null;
        try {
            const parsed: StoryCreationSession = JSON.parse(saved);
            if (parsed.status === 'chatting' || parsed.status === 'previewing') {
                setSession(parsed);
                return parsed;
            }
        } catch { /* ignore corrupt data */ }
        return null;
    }, []);

    const startSession = useCallback((framework: string, initialInput: string, inputMethod: 'text' | 'voice' | 'upload') => {
        const newSession: StoryCreationSession = {
            id: crypto.randomUUID(),
            framework,
            initialInput,
            inputMethod,
            chatMessages: [],
            totalTurns: 0,
            status: 'chatting',
            createdAt: new Date().toISOString(),
        };
        setSession(newSession);
        setStructuredResult(null);
        setError(null);
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        if (!session || loading) return;
        setError(null);

        // Add user message immediately
        const userMsg: ChatMessage = {
            role: 'user',
            content: text,
            fieldTargeted: null,
            timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...session.chatMessages, userMsg];
        setSession(prev => prev ? { ...prev, chatMessages: updatedMessages, totalTurns: prev.totalTurns + 1 } : null);

        setLoading(true);
        try {
            const result = await apiClient.chatForStory(
                session.framework,
                session.initialInput,
                session.inputMethod,
                updatedMessages
            );

            const mentorMsg: ChatMessage = {
                role: 'mentor',
                content: result.chatMessage,
                fieldTargeted: result.fieldTargeted,
                timestamp: new Date().toISOString(),
            };

            setSession(prev => prev ? {
                ...prev,
                chatMessages: [...prev.chatMessages, mentorMsg],
            } : null);
        } catch (err: any) {
            setError(err.message || 'Ni đang bận, thử lại nhé.');
        } finally {
            setLoading(false);
        }
    }, [session, loading]);

    const initChat = useCallback(async () => {
        if (!session || loading) return;
        setLoading(true);
        setError(null);

        try {
            // Send empty chatMessages to get Ni's initial greeting + first question
            const result = await apiClient.chatForStory(
                session.framework,
                session.initialInput,
                session.inputMethod,
                []
            );

            const mentorMsg: ChatMessage = {
                role: 'mentor',
                content: result.chatMessage,
                fieldTargeted: result.fieldTargeted,
                timestamp: new Date().toISOString(),
            };

            setSession(prev => prev ? {
                ...prev,
                chatMessages: [mentorMsg],
            } : null);
        } catch (err: any) {
            setError(err.message || 'Không thể kết nối với Ni.');
        } finally {
            setLoading(false);
        }
    }, [session, loading]);

    const structureNow = useCallback(async () => {
        if (!session || loading) return;
        setLoading(true);
        setError(null);
        setSession(prev => prev ? { ...prev, status: 'structuring' } : null);

        try {
            const result = await apiClient.structureStory(
                session.initialInput,
                session.inputMethod,
                undefined,
                session.chatMessages.length > 0 ? session.chatMessages : undefined,
                session.framework
            );

            setStructuredResult({
                title: result.title || '',
                structured: result.structured || {},
                fullScript: result.fullScript || '',
                estimatedDuration: result.estimatedDuration || 30,
                suggestedTags: result.suggestedTags || [],
                framework: result.framework || session.framework,
                missingFields: result.missingFields || [],
                completenessNote: result.completenessNote || null,
            });

            setSession(prev => prev ? { ...prev, status: 'previewing' } : null);
        } catch (err: any) {
            setError(err.message || 'Không thể cấu trúc hóa. Vui lòng thử lại.');
            setSession(prev => prev ? { ...prev, status: 'chatting' } : null);
        } finally {
            setLoading(false);
        }
    }, [session, loading]);

    const backToChat = useCallback(() => {
        setSession(prev => prev ? { ...prev, status: 'chatting' } : null);
        setError(null);
    }, []);

    const clearSession = useCallback(() => {
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        setStructuredResult(null);
        setError(null);
    }, []);

    return {
        session,
        structuredResult,
        loading,
        error,
        scrollRef,
        hasExistingSession,
        restoreSession,
        startSession,
        initChat,
        sendMessage,
        structureNow,
        backToChat,
        clearSession,
    };
}
