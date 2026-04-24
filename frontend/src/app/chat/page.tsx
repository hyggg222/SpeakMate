'use client';

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import Image from "next/image";
import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { useMentorChat } from "@/hooks/useMentorChat";
import NavigationButton from "@/components/mentorchat/NavigationButton";
import StoryDataCard from "@/components/mentorchat/StoryDataCard";
import ChallengeDataCard from "@/components/mentorchat/ChallengeDataCard";
import type { ChatMessage } from "@/hooks/useMentorChat";

export default function MentorNiChatPage() {
    const { messages, loading, sendMessage, clearHistory, scrollRef } = useMentorChat();
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!input.trim() || loading) return;
        sendMessage(input.trim());
        setInput('');
        // Reset textarea height
        if (inputRef.current) inputRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    // Focus input on mount
    useEffect(() => { inputRef.current?.focus(); }, []);

    // Build history summary — group messages into conversation snippets
    const historySummary = useMemo(() => {
        const userMessages = messages.filter(m => m.role === 'user');
        return userMessages.map(m => ({
            id: m.id,
            preview: m.content.length > 50 ? m.content.slice(0, 50) + '...' : m.content,
            time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            date: new Date(m.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        }));
    }, [messages]);

    return (
        <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
            <Sidebar />

            <main className="flex flex-col flex-1 overflow-hidden">
                <Topbar />

                <div className="flex-1 flex overflow-hidden">
                    {/* Chat Container */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">

                        {/* Chat Header */}
                        <div className="flex items-center gap-3 px-6 py-3 bg-white border-b shadow-sm">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--teal)]/30 flex-shrink-0 bg-slate-100">
                                <Image src="/ni-avatar.png" alt="Mentor Ni" width={40} height={40} className="object-cover" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-slate-800">Mentor Ni</h2>
                                <p className="text-[11px] text-slate-400">Trung tâm đồng hành cá nhân</p>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-[11px] text-slate-400">Online</span>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 space-y-4">
                            {messages.map((msg) => (
                                <ChatBubble key={msg.id} message={msg} />
                            ))}

                            {/* Typing indicator */}
                            {loading && (
                                <div className="flex items-start gap-3 max-w-2xl">
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                                        <Image src="/ni-avatar.png" alt="Ni" width={32} height={32} className="object-cover" />
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="px-4 sm:px-8 lg:px-12 pb-4 pt-2 bg-[#f8fafc]">
                            <div className="max-w-2xl mx-auto flex items-end gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm focus-within:border-[var(--teal)] focus-within:ring-2 focus-within:ring-[var(--teal)]/20 transition-all">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhắn tin cho Ni..."
                                    rows={1}
                                    className="flex-1 resize-none outline-none text-sm leading-relaxed max-h-[120px] py-1.5"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:shadow-md"
                                    style={{ backgroundColor: 'var(--teal)' }}
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                            </div>
                            <p className="text-center text-[10px] text-slate-400 mt-2">
                                Ni trả lời dựa trên dữ liệu thật của bạn. Không roleplay, không chấm điểm.
                            </p>
                        </div>
                    </div>

                    {/* Right Sidebar — Chat History (desktop only) */}
                    <aside className="hidden lg:flex w-[280px] flex-col bg-white border-l border-slate-200 shrink-0">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <MessageSquare size={14} className="text-slate-400" />
                                Lịch sử trò chuyện
                            </h3>
                            {historySummary.length > 0 && (
                                <button
                                    onClick={() => { if (confirm('Xóa toàn bộ lịch sử trò chuyện?')) clearHistory(); }}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Xóa toàn bộ"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {historySummary.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                    <MessageSquare size={28} className="text-slate-200 mb-2" />
                                    <p className="text-xs text-slate-400">Chưa có tin nhắn nào</p>
                                </div>
                            ) : (
                                <div className="flex flex-col py-2">
                                    {historySummary.map((item) => (
                                        <div
                                            key={item.id}
                                            className="px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-default border-b border-slate-50 last:border-b-0"
                                        >
                                            <p className="text-[13px] text-slate-700 font-medium leading-snug truncate">
                                                {item.preview}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {item.date} &middot; {item.time}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}

/** Chat bubble component */
function ChatBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse max-w-2xl ml-auto' : 'max-w-2xl'}`}>
            {/* Avatar */}
            {!isUser && (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 mt-0.5">
                    <Image src="/ni-avatar.png" alt="Ni" width={32} height={32} className="object-cover" />
                </div>
            )}

            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                {/* Bubble */}
                <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                        ? 'bg-[var(--navy)] text-white rounded-2xl rounded-tr-none shadow-md'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-none shadow-sm'
                }`}>
                    {message.content}
                </div>

                {/* Intent badge (mentor only) */}
                {!isUser && message.intent && (
                    <span className={`text-[9px] mt-1 px-2 py-0.5 rounded-full font-medium ${
                        message.intent === 'query' ? 'bg-blue-50 text-blue-500' :
                        message.intent === 'action' ? 'bg-amber-50 text-amber-600' :
                        'bg-purple-50 text-purple-500'
                    }`}>
                        {message.intent === 'query' ? 'Truy vấn dữ liệu' :
                         message.intent === 'action' ? 'Hành động' : 'Hỗ trợ tâm lý'}
                    </span>
                )}

                {/* Data Cards */}
                {!isUser && message.dataCards?.stories?.map((s: any) => (
                    <StoryDataCard key={s.id} story={s} />
                ))}
                {!isUser && message.dataCards?.challenges?.map((c: any) => (
                    <ChallengeDataCard key={c.id} challenge={c} />
                ))}

                {/* Progress Card */}
                {!isUser && message.dataCards?.progress && (
                    <ProgressCard progress={message.dataCards.progress} />
                )}

                {/* Navigation Button */}
                {!isUser && message.actionTaken && (
                    <NavigationButton label={message.actionTaken.label} href={message.actionTaken.href} />
                )}

                {/* Timestamp */}
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
}

/** Inline progress card */
function ProgressCard({ progress }: { progress: any }) {
    return (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-200 bg-white mt-2 w-full">
            <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'var(--teal)' }}>{progress.sessionsThisWeek}</p>
                <p className="text-[9px] text-slate-400">Phiên/tuần</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
                <p className="text-lg font-bold text-slate-800">{progress.averageScore}</p>
                <p className="text-[9px] text-slate-400">Điểm TB</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
                <p className="text-lg font-bold text-amber-500">{progress.streak}</p>
                <p className="text-[9px] text-slate-400">Streak</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
                <p className="text-sm font-bold text-emerald-500">{progress.improvement}</p>
                <p className="text-[9px] text-slate-400">So tuần trước</p>
            </div>
        </div>
    );
}
