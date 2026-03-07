'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, User, Bot, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/apiClient'
import Image from 'next/image'

interface MentorChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    scenario: any;
    evaluationReport: any;
}

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export default function MentorChatModal({ isOpen, onClose, scenario, evaluationReport }: MentorChatModalProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial greeting when opened
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'model',
                content: "Chào bạn! Mình là Ni. Bạn đã vất vả trong phiên luyện tập vừa qua. Bạn muốn mình giải thích rõ hơn về phần nào trong đánh giá, hay cần mẹo để cải thiện không?"
            }]);
        }
    }, [isOpen, messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        setInput("");

        const newHistory = [...messages, { role: 'user', content: userText } as ChatMessage];
        setMessages(newHistory);
        setIsTyping(true);

        try {
            const data = await apiClient.chatWithMentor(scenario, evaluationReport, userText, messages);
            setMessages(prev => [...prev, { role: 'model', content: data.chat_response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: "Xin lỗi, Ni đang gặp chút sự cố kết nối. Bạn chờ một lát nhé!" }]);
        } finally {
            setIsTyping(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex justify-end items-end p-4 md:p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                className="w-full md:w-[450px] h-[80vh] md:h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden mr-4 lg:mr-10 border border-slate-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-[#0b1325] text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-slate-600 overflow-hidden shrink-0 pt-1 bg-slate-800 flex justify-center">
                            <Image src="/ni-avatar.png" alt="Ni" width={40} height={40} className="object-cover" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm">Ni - Cố vấn cá nhân</h2>
                            <p className="text-[11px] text-teal-400">Trực tuyến</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50">
                    <AnimatePresence>
                        {messages.map((m, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-start gap-3 w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {m.role === 'model' && (
                                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 shrink-0 border border-teal-200 mt-1">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                )}
                                <div className={`px-4 py-3 rounded-2xl max-w-[80%] shadow-sm text-[14px] ${m.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 leading-relaxed'
                                    }`}>
                                    {m.content}
                                </div>
                            </motion.div>
                        ))}
                        {isTyping && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-3 w-full justify-start"
                            >
                                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 shrink-0 border border-teal-200">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-bl-none flex items-center justify-center shadow-sm">
                                    <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-end gap-2">
                    <textarea
                        className="flex-1 max-h-32 min-h-[44px] bg-slate-100 border-none rounded-xl px-4 py-3 text-[14px] focus:ring-0 resize-none outline-none text-slate-800 placeholder-slate-400"
                        placeholder="Hỏi Ni về cách trả lời mượt hơn..."
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="w-[44px] h-[44px] shrink-0 bg-[#0b1325] hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors"
                    >
                        <Send className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
