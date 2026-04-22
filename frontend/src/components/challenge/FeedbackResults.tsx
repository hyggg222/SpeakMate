'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowRight, BookOpen, Dumbbell, Sparkles, Send, Loader2,
    TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
    CheckCircle2, Zap, MessageSquare
} from 'lucide-react'
import DifficultyStars from './DifficultyStars'
import { apiClient } from '@/lib/apiClient'
import type { RealWorldEvaluation } from '@/types/api.contracts'

interface FeedbackResultsProps {
    analysis: RealWorldEvaluation;
    challengeTitle: string;
    completed: boolean;
}

// XP count-up animation
function useCountUp(target: number, duration = 1500) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        if (target === 0) return
        const start = performance.now()
        const raf = (now: number) => {
            const eased = 1 - Math.pow(1 - Math.min((now - start) / duration, 1), 3)
            setCount(Math.round(eased * target))
            if (eased < 1) requestAnimationFrame(raf)
        }
        requestAnimationFrame(raf)
    }, [target, duration])
    return count
}

function ComparisonBadge({ current, previous, unit, inverse }: { current: number; previous?: number; unit?: string; inverse?: boolean }) {
    if (previous == null) return <span className="text-[10px] text-slate-400 italic">Lần đầu</span>
    const diff = current - previous
    if (Math.abs(diff) < 0.5) return <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Minus size={9} />Giữ nguyên</span>
    const isGood = inverse ? diff < 0 : diff > 0
    const Icon = isGood ? TrendingUp : TrendingDown
    const color = isGood ? 'text-emerald-600' : 'text-rose-500'
    return (
        <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${color}`}>
            <Icon size={9} />{diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit || ''}
        </span>
    )
}

function MetricCard({ label, value, unit, previous, icon, inverse }: {
    label: string; value: number | string; unit?: string; previous?: number; icon: string; inverse?: boolean;
}) {
    return (
        <div className="rounded-xl p-3 border flex flex-col gap-1" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{icon} {label}</span>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</span>
                {unit && <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{unit}</span>}
            </div>
            {typeof value === 'number' && <ComparisonBadge current={value} previous={previous} unit={unit} inverse={inverse} />}
        </div>
    )
}

interface ChatMessage { role: 'ni' | 'user'; text: string }

export default function FeedbackResults({ analysis, challengeTitle, completed }: FeedbackResultsProps) {
    const router = useRouter()
    const xpDisplay = useCountUp(analysis.xpEarned)

    const [transcriptOpen, setTranscriptOpen] = useState(false)
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
                    ? 'Bạn đã chia sẻ xong rồi! Cảm giác sau khi nhìn lại trải nghiệm đó thế nào?'
                    : 'Lần này chưa được như ý — nhưng dám thử là đã tiến bộ rồi. Bạn gặp khó nhất ở đâu vậy?'
            }])
        }, 1500)
        return () => clearTimeout(t)
    }, [completed])

    useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

    const sendChat = async () => {
        const text = chatInput.trim()
        if (!text || isSending) return
        setChatInput('')
        setChatMessages(prev => [...prev, { role: 'user', text }])
        setIsSending(true)
        try {
            const result = await apiClient.sendMentorChatMessage(text)
            const reply = (result?.message as any)?.content || (result as any)?.reply || 'Mình nghe rồi!'
            setChatMessages(prev => [...prev, { role: 'ni', text: reply }])
        } catch {
            setChatMessages(prev => [...prev, { role: 'ni', text: 'Xin lỗi, Ni đang bận. Thử lại sau nhé!' }])
        } finally { setIsSending(false) }
    }

    const exp = analysis.expression
    const prev = analysis.previousExpression
    const psych = analysis.psychology

    return (
        <div className="flex flex-col gap-4">

            {/* ── Section 1: XP + Ni comment ── */}
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex flex-col items-center py-5">
                <div className="text-5xl font-black" style={{ color: 'var(--teal)' }}>+{xpDisplay}</div>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--muted-foreground)' }}>XP nhận được</p>
            </motion.div>

            {analysis.niComment && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                        <Image src="/ni-avatar.png" alt="Ni" width={40} height={40} className="object-cover" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none px-4 py-3" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--foreground)' }}>{analysis.niComment}</p>
                        {analysis.comparisonWithPrevious && (
                            <p className="text-[12px] mt-2 italic" style={{ color: 'var(--muted-foreground)' }}>{analysis.comparisonWithPrevious}</p>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ── Section 2: Transcript (collapsible) ── */}
            {analysis.transcript && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                    className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                    <button onClick={() => setTranscriptOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--foreground)' }}>
                        <span className="flex items-center gap-2"><MessageSquare size={14} /> Transcript bài kể lại</span>
                        {transcriptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <AnimatePresence>
                        {transcriptOpen && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                    <p className="text-[12px] leading-relaxed pt-3 whitespace-pre-wrap" style={{ color: 'var(--muted-foreground)' }}>
                                        {analysis.transcript}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* ── Section 3: Expression Metrics (chỉ khi có transcript) ── */}
            {exp && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
                        Chỉ số diễn đạt <span className="normal-case font-normal">(đo từ bài kể lại)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <MetricCard label="Mạch lạc" value={exp.coherenceScore} unit="/100" icon="🎯"
                            previous={prev?.coherenceScore} />
                        <MetricCard label="Từ CM thừa" value={exp.jargonCount} unit="từ" icon="📝" inverse
                            previous={prev?.jargonCount} />
                        <MetricCard label="Từ đệm" value={exp.fillerPerMinute} unit="/phút" icon="💬" inverse
                            previous={prev?.fillerPerMinute} />
                        <MetricCard label="Lưu loát" value={exp.fluencyScore ?? '—'} unit={exp.fluencyScore != null ? '/100' : undefined} icon="🗣️"
                            previous={prev?.fluencyScore} />
                    </div>
                    {prev && (
                        <p className="text-[10px] text-center mb-2" style={{ color: 'var(--muted-foreground)' }}>
                            Mũi tên so sánh với trung bình {' '}
                            <span className="font-semibold">5 lần chia sẻ trước</span>
                        </p>
                    )}
                    {exp.fluencyNote && (
                        <div className="rounded-xl p-3 mb-2" style={{ backgroundColor: 'var(--muted)' }}>
                            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                                💡 {exp.fluencyNote}
                            </p>
                        </div>
                    )}

                    {/* Jargon list */}
                    {exp.jargonList?.length > 0 && (
                        <div className="mt-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Từ chuyên môn thừa</p>
                            <div className="flex flex-wrap gap-1.5">
                                {exp.jargonList.map((j, i) => (
                                    <span key={i} className="px-2 py-1 rounded-lg text-[11px] bg-amber-50 border border-amber-200">
                                        <span className="line-through text-slate-400">{j.word}</span>
                                        <span className="text-amber-700 ml-1">→ {j.suggestion}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filler list */}
                    {exp.fillerList?.length > 0 && (
                        <div className="mt-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Từ đệm hay dùng</p>
                            <div className="flex flex-wrap gap-1.5">
                                {exp.fillerList.map((f, i) => (
                                    <span key={i} className="px-2 py-1 rounded-full text-[11px] bg-rose-50 border border-rose-200 text-rose-700">
                                        "{f.word}" × {f.count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── Section 4: Psychology ── */}
            {(psych.emotionBefore || psych.emotionAfter || psych.trend !== 'unknown') && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                    className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>Tâm lý</p>
                    <div className="flex items-center gap-3 mb-2">
                        {psych.emotionBefore && (
                            <span className="px-3 py-1.5 rounded-xl text-[12px] font-medium border" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                                {psych.emotionBefore}
                            </span>
                        )}
                        {psych.emotionBefore && psych.emotionAfter && (
                            <ArrowRight size={14} style={{ color: 'var(--muted-foreground)' }} className="shrink-0" />
                        )}
                        {psych.emotionAfter && (
                            <span className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border ${psych.trend === 'improved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : psych.trend === 'declined' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                {psych.emotionAfter}
                            </span>
                        )}
                        {psych.trend === 'improved' && <TrendingUp size={16} className="text-emerald-500" />}
                        {psych.trend === 'declined' && <TrendingDown size={16} className="text-rose-500" />}
                    </div>
                    {psych.trendNote && (
                        <p className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>{psych.trendNote}</p>
                    )}
                </motion.div>
            )}

            {/* ── Section 5: Strengths & Improvements ── */}
            {(analysis.strengths?.length > 0 || analysis.improvements?.length > 0) && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                    className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                    {analysis.strengths?.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>Điểm tốt</p>
                            <div className="space-y-1.5">
                                {analysis.strengths.map((s, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[13px]">
                                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span style={{ color: 'var(--foreground)' }}>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {analysis.improvements?.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>Cần cải thiện</p>
                            <div className="space-y-1.5">
                                {analysis.improvements.map((imp, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[13px]">
                                        <Zap size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                        <span style={{ color: 'var(--foreground)' }}>{imp}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── Section 6: Dialogue analysis ── */}
            {analysis.dialogueAnalysis && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
                    className="rounded-2xl p-4 border" style={{ backgroundColor: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.3)' }}>
                    <p className="text-[11px] font-bold text-amber-600 mb-2 uppercase tracking-wider">Ni phân tích câu bạn nói</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--foreground)' }}>{analysis.dialogueAnalysis}</p>
                    {analysis.betterPhrasing && (
                        <div className="mt-2 bg-white rounded-xl p-3 border border-amber-100">
                            <p className="text-[11px] text-slate-400 mb-1">Gợi ý hay hơn:</p>
                            <p className="text-[13px] font-medium text-teal-700">"{analysis.betterPhrasing}"</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── Section 7: Next Challenge ── */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                className="rounded-2xl p-4 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-amber-500" />
                    <h3 className="font-bold text-[14px]" style={{ color: 'var(--foreground)' }}>Tiếp theo</h3>
                </div>
                <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--muted-foreground)' }}>{analysis.nextChallengeHint}</p>
                <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>Độ khó đề xuất:</span>
                    <DifficultyStars level={analysis.nextDifficulty} size={11} />
                </div>
            </motion.div>

            {/* ── Section 8: Action Buttons ── */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
                className="flex flex-col gap-3 pt-1">
                {analysis.newStoryCandidate && (
                    <button
                        onClick={() => router.push(`/stories/create?prefill=${encodeURIComponent(analysis.newStorySuggestion || '')}&source=feedback`)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm border-2 transition-colors"
                        style={{ borderColor: 'var(--teal)', color: 'var(--teal)', backgroundColor: 'transparent' }}>
                        <BookOpen size={16} /> Lưu vào Story Bank
                    </button>
                )}
                <button onClick={() => router.push('/setup')}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white"
                    style={{ backgroundColor: 'var(--teal)' }}>
                    <Dumbbell size={16} /> Vào Phòng gym luyện tiếp <ArrowRight size={14} />
                </button>
            </motion.div>

            {/* ── Section 9: Inline Ni Chat ── */}
            <AnimatePresence>
                {chatOpen && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                        className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                                <Image src="/ni-avatar.png" alt="Ni" width={28} height={28} className="object-cover" />
                            </div>
                            <span className="text-[13px] font-bold" style={{ color: 'var(--foreground)' }}>Chat với Ni</span>
                        </div>
                        <div className="px-4 py-3 flex flex-col gap-3 max-h-64 overflow-y-auto">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                                    {msg.role === 'ni' && (
                                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-1">
                                            <Image src="/ni-avatar.png" alt="Ni" width={24} height={24} className="object-cover" />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                                        style={{
                                            backgroundColor: msg.role === 'user' ? 'var(--teal)' : 'var(--muted)',
                                            color: msg.role === 'user' ? 'white' : 'var(--foreground)',
                                        }}>
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
                        <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                                placeholder="Nhắn gì đó cho Ni..."
                                className="flex-1 rounded-xl px-3 py-2 text-[13px] border focus:outline-none"
                                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                            <button onClick={sendChat} disabled={!chatInput.trim() || isSending}
                                className="p-2 rounded-xl disabled:opacity-40" style={{ backgroundColor: 'var(--teal)', color: 'white' }}>
                                <Send size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
