'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Star, Clock, BookOpen, Zap, Loader2, Pencil, ChevronDown, ChevronUp, Check, SkipForward } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { useLanguage } from '@/context/LanguageContext'

interface Props {
    sessionId: string;
    isVisible: boolean;
    onAccepted: () => void;
    onSkipped: () => void;
    evalReport?: any;
    scenario?: any;
}

export default function InlineChallengeCard({ sessionId, isVisible, onAccepted, onSkipped, evalReport, scenario }: Props) {
    const router = useRouter()
    const { t } = useLanguage()
    const cardRef = useRef<HTMLDivElement>(null)

    const ADJUST_PRESETS = [
        { label: t('challenge.preset.easier'), value: 'Làm cho thử thách dễ hơn, phù hợp với người mới bắt đầu' },
        { label: t('challenge.preset.harder'), value: 'Tăng độ thách thức, yêu cầu tình huống phức tạp hơn' },
        { label: t('challenge.preset.work'), value: 'Thay đổi bối cảnh sang môi trường công việc/văn phòng' },
        { label: t('challenge.preset.school'), value: 'Thay đổi bối cảnh sang môi trường học tập/giảng đường' },
        { label: t('challenge.preset.shorter'), value: 'Rút ngắn thử thách, chỉ cần 1 câu nói thay vì cả đoạn hội thoại' },
    ]

    const [challenge, setChallenge] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [deadline, setDeadline] = useState('7')
    const [accepting, setAccepting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [adjustOpen, setAdjustOpen] = useState(false)
    const [adjustRequest, setAdjustRequest] = useState('')
    const [adjusting, setAdjusting] = useState(false)

    useEffect(() => {
        if (!isVisible || challenge) return
        fetchChallenge()
    }, [isVisible])

    const fetchChallenge = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient.generateChallenge(sessionId, scenario, evalReport)
            setChallenge(data)
        } catch (err) {
            console.error('generateChallenge failed:', err)
            setError(t('challenge.error'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isVisible && !loading && challenge && cardRef.current) {
            setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
        }
    }, [isVisible, loading, challenge])

    const handleAccept = () => {
        if (!challenge) return
        setAccepting(true)
        try {
            const d = new Date()
            d.setDate(d.getDate() + parseInt(deadline))
            const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
            const filtered = stored.filter((c: any) => c.id !== challenge.id)
            filtered.unshift({ ...challenge, status: 'pending', deadline: d.toISOString(), accepted_at: new Date().toISOString() })
            localStorage.setItem('speakmate_challenges', JSON.stringify(filtered.slice(0, 20)))
        } catch { /* ignore */ }
        setAccepting(false)
        onAccepted()
        router.push(`/feedback/new?challengeId=${encodeURIComponent(challenge.id)}`)
    }

    const handleSkip = () => {
        try {
            if (challenge?.id) {
                const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
                const updated = stored.map((c: any) => c.id === challenge.id ? { ...c, status: 'skipped' } : c)
                localStorage.setItem('speakmate_challenges', JSON.stringify(updated))
            }
        } catch { /* ignore */ }
        setChallenge(null)
        onSkipped()
    }

    const handleAdjust = async (requestText?: string) => {
        const req = requestText || adjustRequest.trim()
        if (!req || !challenge?.id) return
        setAdjusting(true)
        setAdjustRequest('')
        try {
            const updated = await apiClient.adjustChallenge(challenge.id, req, sessionId)
            setChallenge(updated)
            setAdjustOpen(false)
        } catch {
            // Keep old challenge on error
        } finally {
            setAdjusting(false)
        }
    }

    const difficulty = challenge?.difficulty || 3
    const sourceWeakness = challenge?.source_weakness || challenge?.sourceWeakness
    const suggestedStories: { id: string; title: string }[] = challenge?.suggested_stories || challenge?.suggestedStories || []

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    ref={cardRef}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="overflow-hidden"
                >
                    <section className="bg-white rounded-2xl border border-teal-200 shadow-md mt-4">
                        {/* Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-t-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white">
                                <Target size={22} />
                                <div>
                                    <h3 className="font-bold text-[15px]">{t('challenge.realTask')}</h3>
                                    <p className="text-teal-100 text-xs">{t('challenge.fromGymToReal')}</p>
                                </div>
                            </div>
                            {!loading && challenge && (
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Star key={i} size={14} className={i <= difficulty ? 'text-amber-300 fill-amber-300' : 'text-teal-400'} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            {/* Loading */}
                            {loading && (
                                <div className="flex flex-col items-center py-8 text-slate-400 gap-3">
                                    <Loader2 size={28} className="animate-spin text-teal-500" />
                                    <p className="text-sm">{adjusting ? t('challenge.adjust.adjusting') : t('challenge.generating')}</p>
                                </div>
                            )}

                            {/* Error */}
                            {!loading && error && (
                                <div className="py-6 text-center">
                                    <p className="text-sm text-red-500 mb-3">{error}</p>
                                    <button onClick={fetchChallenge} className="px-4 py-2 rounded-xl text-sm font-bold text-teal-600 border border-teal-300 hover:bg-teal-50 transition-colors">
                                        {t('common.retry')}
                                    </button>
                                </div>
                            )}

                            {/* Challenge content */}
                            {!loading && !error && challenge && (
                                <div className="space-y-4">
                                    {/* Title + Description */}
                                    <div>
                                        <h4 className="text-[16px] font-bold text-slate-800 mb-2">{challenge.title}</h4>
                                        <p className="text-[14px] text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            {challenge.description}
                                        </p>
                                    </div>

                                    {/* Source weakness */}
                                    {sourceWeakness && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                                            <Zap size={14} className="text-amber-500 shrink-0" />
                                            <span className="text-[12px] font-medium text-slate-700">
                                                {t('challenge.weaknessLabel')} <strong>{sourceWeakness}</strong>
                                            </span>
                                        </div>
                                    )}

                                    {/* ── ADJUST PANEL ── */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setAdjustOpen(v => !v)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Pencil size={13} className="text-teal-500" />
                                                {t('challenge.adjust.title')}
                                            </span>
                                            {adjustOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                                        </button>

                                        <AnimatePresence>
                                            {adjustOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="overflow-hidden border-t border-slate-100"
                                                >
                                                    <div className="p-4 space-y-3 bg-slate-50">
                                                        {/* Preset chips */}
                                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('challenge.adjust.quick')}</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {ADJUST_PRESETS.map(preset => (
                                                                <button
                                                                    key={preset.label}
                                                                    onClick={() => handleAdjust(preset.value)}
                                                                    disabled={adjusting}
                                                                    className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-teal-200 text-teal-700 bg-white hover:bg-teal-50 disabled:opacity-50 transition-colors"
                                                                >
                                                                    {preset.label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* Free text input */}
                                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-2">{t('challenge.adjust.custom')}</p>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={adjustRequest}
                                                                onChange={e => setAdjustRequest(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleAdjust()}
                                                                placeholder={t('challenge.adjust.placeholder')}
                                                                className="flex-1 rounded-xl px-3 py-2 text-[13px] border border-slate-200 bg-white focus:outline-none focus:border-teal-400"
                                                            />
                                                            <button
                                                                onClick={() => handleAdjust()}
                                                                disabled={!adjustRequest.trim() || adjusting}
                                                                className="px-3 py-2 rounded-xl text-sm font-bold text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-40 transition-colors"
                                                            >
                                                                {adjusting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Opener hints */}
                                    {challenge.opener_hints?.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('challenge.openerHints')}</p>
                                            <div className="space-y-2">
                                                {challenge.opener_hints.map((hint: string, i: number) => (
                                                    <div key={i} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[13px] text-slate-700">
                                                        &ldquo;{hint}&rdquo;
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Suggested stories */}
                                    {suggestedStories.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('challenge.suggestedStories')}</p>
                                            <div className="space-y-1.5">
                                                {suggestedStories.map((s, i) => (
                                                    <button key={i} onClick={() => router.push(`/stories/${s.id}`)}
                                                        className="flex items-center gap-2 text-[13px] font-medium hover:underline"
                                                        style={{ color: 'var(--teal)' }}>
                                                        <BookOpen size={13} /> {s.title}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Deadline */}
                                    <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                                        <Clock size={14} className="text-slate-400" />
                                        <span className="text-[13px] text-slate-500">{t('challenge.deadlineLabel')}</span>
                                        <select
                                            value={deadline}
                                            onChange={e => setDeadline(e.target.value)}
                                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none bg-white focus:border-teal-400"
                                        >
                                            <option value="1">{t('challenge.deadline.1d')}</option>
                                            <option value="3">{t('challenge.deadline.3d')}</option>
                                            <option value="7">{t('challenge.deadline.7d')}</option>
                                        </select>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={handleAccept}
                                            disabled={accepting}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white shadow hover:opacity-90 transition-all disabled:opacity-60"
                                            style={{ backgroundColor: 'var(--teal)' }}
                                        >
                                            {accepting ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
                                            {t('challenge.accept')}
                                        </button>
                                        <button
                                            onClick={handleSkip}
                                            className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                                        >
                                            <SkipForward size={15} /> {t('challenges.skip')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
