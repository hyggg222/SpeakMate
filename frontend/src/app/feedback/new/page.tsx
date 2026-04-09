'use client'

import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, Mic, Square, Upload, Send, Loader2,
    CheckCircle2, XCircle, Target, ChevronDown, ChevronUp,
    Trash2, FileAudio
} from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { getPreviousRealworldMetrics } from '@/lib/seedDemoData'
import FeedbackResults from '@/components/challenge/FeedbackResults'
import type { RealWorldEvaluation } from '@/types/api.contracts'
import { useLanguage } from '@/context/LanguageContext'

function EmotionRadio({ label, options, value, onChange }: {
    label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
    return (
        <div>
            <p className="text-[12px] font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
            <div className="flex gap-2 flex-wrap">
                {options.map(opt => (
                    <button key={opt.value} type="button" onClick={() => onChange(value === opt.value ? '' : opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border-2 transition-all ${value === opt.value ? 'border-teal-500 bg-teal-500/10 text-teal-600' : 'border-transparent text-slate-500'}`}
                        style={value !== opt.value ? { backgroundColor: 'var(--muted)', borderColor: 'var(--border)' } : {}}>
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>
            {children}
        </p>
    )
}

function FeedbackPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const preselectedChallengeId = searchParams.get('challengeId')
    const { t } = useLanguage()

    const EMOTION_BEFORE = [
        { value: 'anxious', label: t('feedback.emotion.anxious') },
        { value: 'slightly_anxious', label: t('feedback.emotion.slightlyAnxious') },
        { value: 'neutral', label: t('feedback.emotion.neutral') },
        { value: 'excited', label: t('feedback.emotion.excited') },
    ]
    const EMOTION_AFTER = [
        { value: 'less_confident', label: t('feedback.emotion.lessConfident') },
        { value: 'same', label: t('feedback.emotion.same') },
        { value: 'more_confident', label: t('feedback.emotion.moreConfident') },
        { value: 'very_confident', label: t('feedback.emotion.veryConfident') },
    ]

    // Challenge linking
    const [activeChallenges, setActiveChallenges] = useState<any[]>([])
    const [linkedChallengeId, setLinkedChallengeId] = useState<string | null>(preselectedChallengeId)
    const [challengeLinkOpen, setChallengeLinkOpen] = useState(!!preselectedChallengeId)
    const [loadingChallenges, setLoadingChallenges] = useState(false)
    const [completed, setCompleted] = useState<boolean | null>(null)

    // ── Voice recording ──
    const [isRecording, setIsRecording] = useState(false)
    const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // ── File upload ──
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // ── Text form ──
    const [formData, setFormData] = useState({
        situation: '',
        emotionBefore: '',
        emotionAfter: '',
        whatUserSaid: '',
        othersReaction: '',
        whatWorked: '',
        whatStuck: '',
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [analysis, setAnalysis] = useState<RealWorldEvaluation | null>(null)

    useEffect(() => {
        // Read challenges from localStorage (no DB needed)
        try {
            const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
            const active = stored.filter((c: any) => c.status === 'pending' || c.status === 'in_progress')
            setActiveChallenges(active)
            // Auto-expand challenge panel if pre-selected
            if (preselectedChallengeId && active.some((c: any) => c.id === preselectedChallengeId)) {
                setChallengeLinkOpen(true)
            }
        } catch { /* ignore */ }
        setLoadingChallenges(false)
    }, [preselectedChallengeId])

    const linkedChallenge = activeChallenges.find(c => c.id === linkedChallengeId) || null

    // Voice recording
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mr = new MediaRecorder(stream)
            mediaRecorderRef.current = mr
            chunksRef.current = []
            setRecordingDuration(0)
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
            mr.onstop = () => {
                setVoiceBlob(new Blob(chunksRef.current, { type: 'audio/webm' }))
                stream.getTracks().forEach(t => t.stop())
                if (timerRef.current) clearInterval(timerRef.current)
            }
            mr.start()
            setIsRecording(true)
            timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000)
        } catch { alert(t('common.micError') || 'Cannot access microphone') }
    }, [t])

    const stopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop()
        setIsRecording(false)
    }, [])

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    // File upload
    const handleFileSelect = (file: File) => {
        if (file.size > 10 * 1024 * 1024) { alert(t('stories.create.errorFileTooLarge')); return }
        setUploadedFile(file)
    }

    // Check if user has filled anything
    const hasAnyData = voiceBlob !== null || uploadedFile !== null ||
        Object.values(formData).some(v => v.trim() !== '')

    // Submit — always use /feedback/free which returns RealWorldEvaluation
    const handleSubmit = async () => {
        if (!hasAnyData) return
        setIsSubmitting(true)
        try {
            const fd = new FormData()
            if (voiceBlob) fd.append('voiceBlob', voiceBlob, 'voice.webm')
            if (uploadedFile) fd.append('audioFile', uploadedFile, uploadedFile.name)
            Object.entries(formData).forEach(([k, v]) => { if (v.trim()) fd.append(k, v.trim()) })
            if (completed !== null) fd.append('completed', String(completed))
            if (linkedChallengeId) fd.append('challengeId', linkedChallengeId)

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://speakmate-k26b.onrender.com/api'}/practice/feedback/free`, {
                method: 'POST',
                body: fd,
            })
            if (!res.ok) {
                const errText = await res.text()
                console.error('[feedback/new] API error:', res.status, errText)
                throw new Error(`API ${res.status}`)
            }
            const json = await res.json()
            const data = json.data
            console.log('[feedback/new] API response:', JSON.stringify(data?.analysis)?.slice(0, 200))
            if (!data?.analysis) throw new Error('no analysis in response')
            // Merge transcript into analysis so FeedbackResults can show it
            if (data.transcript) {
                data.analysis.transcript = data.transcript
                data.analysis.hasAudio = true
            }
            // If backend didn't include previousExpression (guest), use localStorage seed
            if (!data.analysis.previousExpression) {
                const localPrev = getPreviousRealworldMetrics()
                if (localPrev) data.analysis.previousExpression = localPrev
            }
            // Save this session's expression to localStorage history
            if (data.analysis.expression) {
                try {
                    const stored = JSON.parse(localStorage.getItem('speakmate_realworld_history') || '[]')
                    stored.push({ ...data.analysis.expression, created_at: new Date().toISOString() })
                    localStorage.setItem('speakmate_realworld_history', JSON.stringify(stored.slice(-20)))
                } catch { /* ignore */ }
            }
            // Update challenge status in localStorage
            if (linkedChallengeId) {
                try {
                    const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
                    const updated = stored.map((c: any) =>
                        c.id === linkedChallengeId
                            ? { ...c, status: completed ? 'completed' : 'in_progress', reported_at: new Date().toISOString() }
                            : c
                    )
                    localStorage.setItem('speakmate_challenges', JSON.stringify(updated))
                } catch { /* ignore */ }
            }
            setAnalysis(data.analysis)
        } catch (err) {
            console.error('[feedback/new] Submit failed:', err)
            setAnalysis(getFallback(completed ?? false))
        } finally {
            setIsSubmitting(false)
        }
    }

    // Results screen
    if (analysis) {
        return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
                <header className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:opacity-70 transition-opacity">
                        <ArrowLeft size={20} style={{ color: 'var(--foreground)' }} />
                    </button>
                    <h1 className="font-bold text-[16px]" style={{ color: 'var(--foreground)' }}>{t('feedback.result')}</h1>
                </header>
                <main className="flex-1 overflow-y-auto px-6 py-6 max-w-lg mx-auto w-full">
                    <FeedbackResults
                        analysis={analysis}
                        challengeTitle={linkedChallenge?.title || t('feedback.title')}
                        completed={completed ?? false}
                    />
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
            {/* Header */}
            <header className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => router.back()} className="p-2 rounded-lg hover:opacity-70 transition-opacity">
                    <ArrowLeft size={20} style={{ color: 'var(--foreground)' }} />
                </button>
                <div className="flex-1">
                    <h1 className="font-bold text-[16px]" style={{ color: 'var(--foreground)' }}>{t('feedback.title')}</h1>
                    <p className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                        {t('feedback.subtitle')}
                    </p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-lg mx-auto px-6 py-5 flex flex-col gap-5">

                    {/* ── Challenge linking (optional) ── */}
                    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                        <button
                            onClick={() => setChallengeLinkOpen(v => !v)}
                            className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-semibold transition-opacity hover:opacity-80"
                            style={{ color: linkedChallengeId ? 'var(--teal)' : 'var(--muted-foreground)' }}
                        >
                            <span className="flex items-center gap-2">
                                <Target size={14} />
                                {linkedChallengeId && linkedChallenge
                                    ? `${t('feedback.challengeLinked')}: ${linkedChallenge.title}`
                                    : t('feedback.challengeLink')}
                            </span>
                            {challengeLinkOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <AnimatePresence>
                            {challengeLinkOpen && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                                        {loadingChallenges
                                            ? <p className="text-[12px] pt-3" style={{ color: 'var(--muted-foreground)' }}>{t('feedback.loadingChallenges')}</p>
                                            : activeChallenges.length === 0
                                                ? <p className="text-[12px] pt-3" style={{ color: 'var(--muted-foreground)' }}>{t('feedback.noChallenges')}</p>
                                                : activeChallenges.map(c => (
                                                    <button key={c.id} onClick={() => setLinkedChallengeId(linkedChallengeId === c.id ? null : c.id)}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left mt-2 transition-all ${linkedChallengeId === c.id ? 'border-teal-500 bg-teal-500/10' : 'border-transparent'}`}
                                                        style={linkedChallengeId !== c.id ? { backgroundColor: 'var(--muted)', borderColor: 'var(--border)' } : {}}>
                                                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${linkedChallengeId === c.id ? 'border-teal-500 bg-teal-500' : 'border-slate-400'}`}>
                                                            {linkedChallengeId === c.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{c.title}</p>
                                                            {c.source_weakness && <p className="text-[11px] text-amber-600">{c.source_weakness}</p>}
                                                        </div>
                                                    </button>
                                                ))
                                        }
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Completed toggle — only when challenge linked ── */}
                    {linkedChallengeId && (
                        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                            <SectionLabel>{t('feedback.completedQuestion')}</SectionLabel>
                            <div className="flex gap-3">
                                <button onClick={() => setCompleted(completed === true ? null : true)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${completed === true ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-transparent text-slate-500'}`}
                                    style={completed !== true ? { backgroundColor: 'var(--muted)', borderColor: 'var(--border)' } : {}}>
                                    <CheckCircle2 size={16} /> {t('feedback.done')}
                                </button>
                                <button onClick={() => setCompleted(completed === false ? null : false)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${completed === false ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-transparent text-slate-500'}`}
                                    style={completed !== false ? { backgroundColor: 'var(--muted)', borderColor: 'var(--border)' } : {}}>
                                    <XCircle size={16} /> {t('feedback.notDone')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Audio section: Ghi âm + Upload song song ── */}
                    <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                        <SectionLabel>{t('feedback.audioSection')}</SectionLabel>

                        {/* Mic recording */}
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 flex flex-col items-center gap-1">
                                {isRecording ? (
                                    <button onClick={stopRecording}
                                        className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center animate-pulse">
                                        <Square size={18} className="text-white fill-white" />
                                    </button>
                                ) : voiceBlob ? (
                                    <button onClick={() => { setVoiceBlob(null); setRecordingDuration(0) }}
                                        className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-emerald-400 bg-emerald-400/10 relative group">
                                        <CheckCircle2 size={20} className="text-emerald-500 group-hover:hidden" />
                                        <Trash2 size={16} className="text-red-400 hidden group-hover:block" />
                                    </button>
                                ) : (
                                    <button onClick={startRecording}
                                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                                        style={{ backgroundColor: 'var(--teal)' }}>
                                        <Mic size={20} className="text-white" />
                                    </button>
                                )}
                                <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                                    {isRecording ? formatTime(recordingDuration) : voiceBlob ? t('feedback.recorded') : t('feedback.record')}
                                </span>
                            </div>

                            <div className="w-px h-10 rounded-full" style={{ backgroundColor: 'var(--border)' }} />

                            {/* File upload */}
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${isDragging ? 'border-teal-500 bg-teal-500/5' : ''}`}
                                style={{ borderColor: isDragging ? 'var(--teal)' : uploadedFile ? '#10b981' : 'var(--border)' }}
                            >
                                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden"
                                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                                {uploadedFile ? (
                                    <>
                                        <FileAudio size={18} className="text-emerald-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold text-emerald-600 truncate">{uploadedFile.name}</p>
                                            <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); setUploadedFile(null) }}
                                            className="shrink-0 text-slate-400 hover:text-red-400 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} style={{ color: 'var(--muted-foreground)' }} />
                                        <div>
                                            <p className="text-[12px] font-medium" style={{ color: 'var(--foreground)' }}>{t('feedback.uploadAudio')}</p>
                                            <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{t('feedback.uploadAudio.sub')}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Status pills */}
                        {(voiceBlob || uploadedFile) && (
                            <div className="flex gap-2 flex-wrap">
                                {voiceBlob && (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                        <Mic size={11} /> {t('feedback.voice')} ({formatTime(recordingDuration)})
                                    </span>
                                )}
                                {uploadedFile && (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 flex items-center gap-1">
                                        <FileAudio size={11} /> {uploadedFile.name.slice(0, 20)}{uploadedFile.name.length > 20 ? '…' : ''}
                                    </span>
                                )}
                                <span className="px-2.5 py-1 rounded-full text-[11px] bg-teal-100 text-teal-700">
                                    {[voiceBlob, uploadedFile].filter(Boolean).length > 1 ? t('feedback.niWillAnalyzeBoth') : t('feedback.niWillAnalyzeThis')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ── Text fields ── */}
                    <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                        <SectionLabel>{t('feedback.textSection')}</SectionLabel>

                        <EmotionRadio label={t('feedback.emotionBefore')} options={EMOTION_BEFORE} value={formData.emotionBefore} onChange={v => setFormData(p => ({ ...p, emotionBefore: v }))} />
                        <EmotionRadio label={t('feedback.emotionAfter')} options={EMOTION_AFTER} value={formData.emotionAfter} onChange={v => setFormData(p => ({ ...p, emotionAfter: v }))} />

                        <div>
                            <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>{t('feedback.situation')}</p>
                            <textarea rows={2} value={formData.situation}
                                onChange={e => setFormData(p => ({ ...p, situation: e.target.value }))}
                                placeholder={t('feedback.situation.placeholder')}
                                className="w-full rounded-xl px-4 py-3 text-[13px] resize-none border focus:outline-none"
                                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                        </div>

                        <div>
                            <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--muted-foreground)' }}>{t('feedback.whatSaid')}</p>
                            <p className="text-[11px] text-teal-600 mb-1.5">{t('feedback.whatSaid.hint')}</p>
                            <textarea rows={2} value={formData.whatUserSaid}
                                onChange={e => setFormData(p => ({ ...p, whatUserSaid: e.target.value }))}
                                placeholder={t('feedback.whatSaid.placeholder')}
                                className="w-full rounded-xl px-4 py-3 text-[13px] resize-none border focus:outline-none"
                                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                        </div>

                        <div>
                            <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>{t('feedback.othersReaction')}</p>
                            <textarea rows={2} value={formData.othersReaction}
                                onChange={e => setFormData(p => ({ ...p, othersReaction: e.target.value }))}
                                placeholder={t('feedback.othersReaction.placeholder')}
                                className="w-full rounded-xl px-4 py-3 text-[13px] resize-none border focus:outline-none"
                                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>{t('feedback.whatWorked')}</p>
                                <textarea rows={2} value={formData.whatWorked}
                                    onChange={e => setFormData(p => ({ ...p, whatWorked: e.target.value }))}
                                    placeholder={t('feedback.whatWorked.placeholder')}
                                    className="w-full rounded-xl px-3 py-2.5 text-[12px] resize-none border focus:outline-none"
                                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                            </div>
                            <div>
                                <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>{t('feedback.whatStuck')}</p>
                                <textarea rows={2} value={formData.whatStuck}
                                    onChange={e => setFormData(p => ({ ...p, whatStuck: e.target.value }))}
                                    placeholder={t('feedback.whatStuck.placeholder')}
                                    className="w-full rounded-xl px-3 py-2.5 text-[12px] resize-none border focus:outline-none"
                                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                            </div>
                        </div>
                    </div>

                    {/* ── Submit ── */}
                    <div className="pb-8">
                        {!hasAnyData && (
                            <p className="text-[12px] text-center mb-3" style={{ color: 'var(--muted-foreground)' }}>
                                {t('feedback.submitHint')}
                            </p>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !hasAnyData}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-[15px] text-white disabled:opacity-40 transition-all"
                            style={{ backgroundColor: 'var(--teal)' }}
                        >
                            {isSubmitting
                                ? <><Loader2 size={18} className="animate-spin" /> {t('feedback.analyzing')}</>
                                : <><Send size={18} /> {t('feedback.submit')}</>
                            }
                        </button>

                        {/* Summary of what will be sent */}
                        {hasAnyData && !isSubmitting && (
                            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                                {voiceBlob && <span className="text-[11px] text-emerald-600 flex items-center gap-1"><Mic size={10} /> {t('feedback.voice')}</span>}
                                {uploadedFile && <span className="text-[11px] text-blue-600 flex items-center gap-1"><FileAudio size={10} /> {t('feedback.fileAudio')}</span>}
                                {Object.values(formData).some(v => v.trim()) && <span className="text-[11px] text-teal-600">{t('feedback.textContent')}</span>}
                                <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{t('feedback.niWillAnalyzeAll')}</span>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}

function getFallback(completed: boolean): RealWorldEvaluation {
    return {
        hasAudio: false,
        sourceType: 'realworld',
        psychology: { trend: 'unknown', trendNote: '' },
        strengths: ['Bạn đã dám chia sẻ trải nghiệm thực tế'],
        improvements: ['Tiếp tục luyện tập để cải thiện'],
        newStoryCandidate: completed,
        nextDifficulty: 3,
        nextChallengeHint: 'Tiếp tục luyện tập để cải thiện nhé!',
        xpEarned: completed ? 100 : 50,
        niComment: completed
            ? 'Bạn đã dám thử và chia sẻ lại — đó là điều quan trọng nhất. Tiếp tục nhé!'
            : 'Cảm ơn bạn đã kể lại. Mỗi lần thử là một bước tiến, dù kết quả thế nào.',
        dialogueAnalysis: null,
        betterPhrasing: null,
    }
}

export default function FeedbackNewPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <FeedbackPageInner />
        </Suspense>
    )
}
