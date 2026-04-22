'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BookOpen, Dumbbell, Sparkles, Send, Loader2 } from 'lucide-react'
import DifficultyStars from './DifficultyStars'
import { apiClient } from '@/lib/apiClient'
import type { FeedbackAnalysis } from '@/types/api.contracts'

interface FeedbackResultsProps {
    analysis: FeedbackAnalysis;
    challengeTitle: string;
    completed: boolean;
}

// XP count-up animation hook
function useCountUp(target: number, duration = 1500) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        if (target === 0) return
        const start = performance.now()
        const raf = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(raf)
        }
        requestAnimationFrame(raf)
    }, [target, duration])
    return count
}

interface ChatMessage {
    role: 'ni' | 'user'
    text: string
}

export default function FeedbackResults({ analysis, challengeTitle, completed }: FeedbackResultsProps) {
    const router = useRouter()
    const xpDisplay = useCountUp(analysis.xpEarned)

    // Inline Ni chat
    const [chatOpen, setChatOpen] = useState(false)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const [isSending, setIsSending] = useState(false)
    const chatBottomRef = useRef<HTMLDivElement>(null)

    // Auto-open chat after 1.5s
    useEffect(() => {
        const t = setTimeout(() => {
            setChatOpen(true)
            setChatMessages([{
                role: 'ni',
                text: completed
                    ? 'Bạn đã làm được rồi! Cảm giác sau khi vượt qua thử thách đó thế nào?'
                    : 'Lần này chưa được như ý — nhưng dám thử là đã tiến bộ rồi. Bạn gặp khó nhất ở chỗ nào vậy?'
            }])
        }, 1500)
        return () => clearTimeout(t)
    }, [completed])

    // Scroll to bottom on new messages
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    const sendChat = async () => {
        const text = chatInput.trim()
        if (!text || isSending) return
        setChatInput('')
        setChatMessages(prev => [...prev, { role: 'user', text }])
        setIsSending(true)
        try {
            const result = await apiClient.sendMentorChatMessage(text)
            const reply = (result?.message as any)?.content || (result as any)?.reply || 'Mình nghe rồi! Bạn cứ hỏi thêm nhé.'
            setChatMessages(prev => [...prev, { role: 'ni', text: reply }])
        } catch {
            setChatMessages(prev => [...prev, { role: 'ni', text: 'Xin lỗi, Ni đang bận. Thử lại sau nhé!' }])
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="flex flex-col gap-5">
            {/* XP Earned — count-up animation */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex flex-col items-center py-6"
            >
                <div className="text-5xl font-black" style={{ color: 'var(--teal)' }}>
                    +{xpDisplay}
                </div>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    XP nhận được
                </p>
            </motion.div>

            {/* Ni's personalized comment */}
            {analysis.niComment && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start gap-3"
                >
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                        <Image src="/ni-avatar.png" alt="Ni" width={40} height={40} className="object-cover" />
                    </div>
                    <div
                        className="flex-1 rounded-2xl rounded-tl-none px-4 py-3"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                    >
                        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--foreground)' }}>
                            {analysis.niComment}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Dialogue analysis (if user provided what they said) */}
            {analysis.dialogueAnalysis && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl p-4 border"
                    style={{ backgroundColor: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.3)' }}
                >
                    <p className="text-[11px] font-bold text-amber-600 mb-2 uppercase tracking-wider">Ni phân tích câu bạn nói</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--foreground)' }}>
                        {analysis.dialogueAnalysis}
                    </p>
                    {analysis.betterPhrasing && (
                        <div className="mt-3 bg-white rounded-xl p-3 border border-amber-100">
                            <p className="text-[11px] text-slate-400 mb-1">Gợi ý nói hay hơn:</p>
                            <p className="text-[13px] font-medium text-teal-700">"{analysis.betterPhrasing}"</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Progress Card (fallback if no niComment) */}
            {!analysis.niComment && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl p-5 border"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                >
                    <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--muted-foreground)' }}>
                        {analysis.comparisonWithGym}
                    </p>
                    {analysis.progressNote && (
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--muted)' }}>
                            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--foreground)' }}>
                                {analysis.progressNote}
                            </p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Next Challenge */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl p-5 border"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={18} className="text-amber-500" />
                    <h3 className="font-bold text-[15px]" style={{ color: 'var(--foreground)' }}>Thử thách tiếp theo</h3>
                </div>
                <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--muted-foreground)' }}>
                    {analysis.nextChallengeHint}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium" style={{ color: 'var(--muted-foreground)' }}>Độ khó:</span>
                    <DifficultyStars level={analysis.nextDifficulty} size={12} />
                </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex flex-col gap-3 pt-2"
            >
                {analysis.newStoryCandidate && (
                    <button
                        onClick={() => router.push(`/stories/create?prefill=${encodeURIComponent(analysis.newStorySuggestion || '')}&source=challenge`)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm border-2 transition-colors"
                        style={{ borderColor: 'var(--teal)', color: 'var(--teal)', backgroundColor: 'transparent' }}
                    >
                        <BookOpen size={18} /> Thêm vào Story Bank
                    </button>
                )}
                <button
                    onClick={() => router.push('/setup')}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white"
                    style={{ backgroundColor: 'var(--teal)' }}
                >
                    <Dumbbell size={18} /> Vào Phòng gym luyện tiếp <ArrowRight size={16} />
                </button>
            </motion.div>

            {/* Inline Ni Chat — auto-opens after 1.5s */}
            <AnimatePresence>
                {chatOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-2xl border overflow-hidden"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
                    >
                        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                                <Image src="/ni-avatar.png" alt="Ni" width={28} height={28} className="object-cover" />
                            </div>
                            <span className="text-[13px] font-bold" style={{ color: 'var(--foreground)' }}>Chat với Ni</span>
                        </div>

                        {/* Messages */}
                        <div className="px-4 py-3 flex flex-col gap-3 max-h-64 overflow-y-auto">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                                    {msg.role === 'ni' && (
                                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-1">
                                            <Image src="/ni-avatar.png" alt="Ni" width={24} height={24} className="object-cover" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                                        style={{
                                            backgroundColor: msg.role === 'user' ? 'var(--teal)' : 'var(--muted)',
                                            color: msg.role === 'user' ? 'white' : 'var(--foreground)',
                                        }}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isSending && (
                                <div className="flex justify-start gap-2">
                                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                                        <Image src="/ni-avatar.png" alt="Ni" width={24} height={24} className="object-cover" />
                                    </div>
                                    <div className="px-3 py-2 rounded-2xl rounded-tl-none" style={{ backgroundColor: 'var(--muted)' }}>
                                        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={chatBottomRef} />
                        </div>

                        {/* Input */}
                        <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                                placeholder="Nhắn gì đó cho Ni..."
                                className="flex-1 rounded-xl px-3 py-2 text-[13px] border focus:outline-none"
                                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                            />
                            <button
                                onClick={sendChat}
                                disabled={!chatInput.trim() || isSending}
                                className="p-2 rounded-xl disabled:opacity-40 transition-opacity"
                                style={{ backgroundColor: 'var(--teal)', color: 'white' }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
