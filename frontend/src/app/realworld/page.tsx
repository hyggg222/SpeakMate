'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Mic, FileAudio, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { apiClient } from '@/lib/apiClient'

interface SubScores {
    [key: string]: number
}

interface StageFeedback {
    score: number
    feedback: string
    strengths: string[]
    weaknesses: { turn?: number; issue: string; fix: string }[]
    subScores?: SubScores
}

interface EvalResult {
    goalProgress: number
    overallFeedback: string
    proficiencyLevel?: string
    language: StageFeedback
    content: StageFeedback
    emotion: StageFeedback
}

const SUB_SCORE_LABELS: Record<string, string> = {
    vocabularyRange: 'Từ vựng',
    grammarAccuracy: 'Ngữ pháp',
    honorificUsage: 'Xưng hô',
    persuasion: 'Thuyết phục',
    clarity: 'Rõ ràng',
    professionalism: 'Chuyên nghiệp',
    empathy: 'Đồng cảm',
    confidence: 'Tự tin',
    toneControl: 'Giọng điệu',
}

const PROFICIENCY_COLORS: Record<string, string> = {
    A1: 'bg-red-100 text-red-700 border-red-200',
    A2: 'bg-orange-100 text-orange-700 border-orange-200',
    B1: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    B2: 'bg-blue-100 text-blue-700 border-blue-200',
    C1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    C2: 'bg-purple-100 text-purple-700 border-purple-200',
}

type Phase = 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error'

export default function RealWorldPage() {
    const [file, setFile] = useState<File | null>(null)
    const [context, setContext] = useState('')
    const [phase, setPhase] = useState<Phase>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [transcript, setTranscript] = useState('')
    const [evaluation, setEvaluation] = useState<EvalResult | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropRef = useRef<HTMLDivElement>(null)

    const handleFile = useCallback((f: File) => {
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (f.size > maxSize) {
            setErrorMsg('File quá lớn. Tối đa 10MB.')
            return
        }
        const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/webm', 'audio/ogg']
        if (!validTypes.some(t => f.type.includes(t.split('/')[1]))) {
            setErrorMsg('Định dạng không hỗ trợ. Vui lòng dùng MP3, WAV, M4A, hoặc WebM.')
            return
        }
        setFile(f)
        setErrorMsg('')
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const f = e.dataTransfer.files?.[0]
        if (f) handleFile(f)
    }, [handleFile])

    const handleSubmit = async () => {
        if (!file || !context.trim()) return

        setPhase('uploading')
        setErrorMsg('')

        try {
            // Simulate phase progression for UX
            setTimeout(() => setPhase('transcribing'), 800)
            setTimeout(() => setPhase('analyzing'), 3000)

            const result = await apiClient.uploadRealWorldAudio(file, context.trim())
            setTranscript(result.transcript)
            setEvaluation(result.evaluation)
            setPhase('done')
        } catch (err: any) {
            setErrorMsg(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
            setPhase('error')
        }
    }

    const handleReset = () => {
        setFile(null)
        setContext('')
        setPhase('idle')
        setErrorMsg('')
        setTranscript('')
        setEvaluation(null)
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 bg-[#0b1325] text-white sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Trang chủ</span>
                    </Link>
                    <h1 className="text-lg font-bold">Phân tích hội thoại thực tế</h1>
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600">
                    <Image src="/ni-avatar.png" alt="User" width={32} height={32} className="object-cover" />
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
                {phase === 'done' && evaluation ? (
                    /* Results View */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-800">Kết quả phân tích</h2>
                            <button onClick={handleReset} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-medium transition-colors">
                                Phân tích file khác
                            </button>
                        </div>

                        {/* Score + Proficiency */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-6 mb-4">
                                <div className="flex flex-col items-center">
                                    <span className="text-5xl font-bold text-[#0b1325]">{evaluation.goalProgress}</span>
                                    <span className="text-lg font-bold text-slate-400">%</span>
                                    {evaluation.proficiencyLevel && (
                                        <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold border ${PROFICIENCY_COLORS[evaluation.proficiencyLevel] || 'bg-slate-100 text-slate-600'}`}>
                                            CEFR {evaluation.proficiencyLevel}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                                            <Image src="/ni-avatar.png" alt="Ni" width={40} height={40} className="object-cover" />
                                        </div>
                                        <div className="bg-[#0b1325] text-white p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed">
                                            {evaluation.overallFeedback}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3-Stage Scores */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Ngôn ngữ', stage: evaluation.language, color: '#3b82f6', bgClass: 'bg-blue-500' },
                                { label: 'Nội dung', stage: evaluation.content, color: '#f59e0b', bgClass: 'bg-amber-500' },
                                { label: 'Cảm xúc', stage: evaluation.emotion, color: '#f87171', bgClass: 'bg-red-400' },
                            ].map(({ label, stage, color, bgClass }) => (
                                <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-bold text-slate-700">{label}</span>
                                        <span className="text-lg font-bold" style={{ color }}>{stage.score}/100</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                                        <div className={`h-full rounded-full ${bgClass}`} style={{ width: `${stage.score}%` }} />
                                    </div>

                                    {/* Sub-scores */}
                                    {stage.subScores && (
                                        <div className="space-y-1.5 mb-3">
                                            {Object.entries(stage.subScores).map(([key, val]) => (
                                                <div key={key} className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500 w-20 text-right">{SUB_SCORE_LABELS[key] || key}</span>
                                                    <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-slate-600 w-6">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Strengths */}
                                    {stage.strengths?.length > 0 && (
                                        <div className="mb-2">
                                            <p className="text-[10px] font-semibold text-emerald-600 mb-1">Điểm sáng:</p>
                                            <ul className="text-[11px] text-slate-600 space-y-0.5 pl-3 list-disc marker:text-emerald-400">
                                                {stage.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Weaknesses */}
                                    {stage.weaknesses?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-semibold text-rose-500 mb-1">Cần cải thiện:</p>
                                            <ul className="text-[11px] text-slate-600 space-y-0.5 pl-3 list-disc marker:text-rose-400">
                                                {stage.weaknesses.slice(0, 3).map((w, i) => <li key={i}>{w.issue}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Transcript */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-3">Bản ghi lời nói</h3>
                            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                                {transcript}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Upload Form */
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Phân tích hội thoại thực tế</h2>
                            <p className="text-sm text-slate-500">Tải lên file ghi âm cuộc hội thoại ngoài đời thực để AI phân tích và đánh giá kỹ năng giao tiếp của bạn.</p>
                        </div>

                        {/* Drop Zone */}
                        <div
                            ref={dropRef}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50/30'}`}
                        >
                            {file ? (
                                <>
                                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-700">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFile(null) }}
                                        className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                                    >
                                        Xóa và chọn file khác
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                        <FileAudio className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-700">Kéo thả file audio vào đây</p>
                                        <p className="text-xs text-slate-500 mt-1">hoặc click để chọn file (MP3, WAV, M4A — tối đa 10MB)</p>
                                    </div>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                            />
                        </div>

                        {/* Context Description */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả ngữ cảnh</label>
                            <textarea
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder="Ví dụ: Cuộc họp với sếp về dự án mới, Thuyết trình trước lớp, Phỏng vấn xin việc..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none"
                                rows={3}
                            />
                        </div>

                        {/* Error */}
                        {errorMsg && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
                                {errorMsg}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={!file || !context.trim() || (phase !== 'idle' && phase !== 'error')}
                            className="w-full py-4 bg-[#0b1325] hover:bg-[#1a2744] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-3 text-base"
                        >
                            {phase === 'idle' || phase === 'error' ? (
                                <>
                                    <Upload className="w-5 h-5" />
                                    Phân tích
                                </>
                            ) : (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {phase === 'uploading' && 'Đang tải lên...'}
                                    {phase === 'transcribing' && 'Đang nhận diện giọng nói...'}
                                    {phase === 'analyzing' && 'Đang phân tích và đánh giá...'}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
