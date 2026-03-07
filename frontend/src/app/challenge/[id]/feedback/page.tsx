'use client'

import { useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Send, ArrowLeft, MessageCircle, FileText, Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import FeedbackResults from '@/components/challenge/FeedbackResults'
import type { FeedbackAnalysis } from '@/types/api.contracts'

type Tab = 'voice' | 'form' | 'upload'

const EMOTION_BEFORE = [
    { value: 'anxious', label: 'Lo lắng' },
    { value: 'slightly_anxious', label: 'Hơi lo' },
    { value: 'neutral', label: 'Bình thường' },
    { value: 'excited', label: 'Hào hứng' },
]

const EMOTION_AFTER = [
    { value: 'less_confident', label: 'Tự ti hơn' },
    { value: 'same', label: 'Như cũ' },
    { value: 'more_confident', label: 'Tự tin hơn' },
    { value: 'very_confident', label: 'Rất tự tin' },
]

// Mock challenge for UI demo — will be replaced by API fetch
const MOCK_CHALLENGE = {
    id: 'mock-1',
    title: 'Hỏi giảng viên một câu phản biện sau bài giảng',
    description: 'Sau buổi học tiếp theo, hãy chủ động hỏi giảng viên một câu hỏi về nội dung bài giảng.',
    difficulty: 3,
}

function EmotionRadio({ label, options, value, onChange }: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                {label}
            </label>
            <div className="flex gap-2 flex-wrap">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border-2 transition-all ${
                            value === opt.value
                                ? 'border-teal-500 bg-teal-500/10 text-teal-600'
                                : 'border-transparent text-slate-500'
                        }`}
                        style={value !== opt.value ? { backgroundColor: 'var(--muted)', borderColor: 'var(--border)' } : {}}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

function FormField({ label, placeholder, value, onChange, hint }: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
}) {
    return (
        <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>
                {label}
            </label>
            {hint && <p className="text-[11px] text-teal-600 mb-1.5">{hint}</p>}
            <textarea
                rows={2}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-[13px] resize-none border focus:outline-none transition-colors"
                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
        </div>
    )
}

export default function ChallengeFeedbackPage() {
    const params = useParams()
    const router = useRouter()
    const challengeId = params.id as string

    const [activeTab, setActiveTab] = useState<Tab>('voice')
    const [completed, setCompleted] = useState<boolean | null>(null)

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Upload file state
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [formData, setFormData] = useState({
        situation: '',
        emotionBefore: '',
        emotionAfter: '',
        whatUserSaid: '',
        othersReaction: '',
        whatWorked: '',
        whatStuck: '',
    })

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [analysis, setAnalysis] = useState<FeedbackAnalysis | null>(null)

    const challenge = MOCK_CHALLENGE

    // Voice recording handlers
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []
            setRecordingDuration(0)
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }
            mediaRecorder.onstop = () => {
                setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }))
                stream.getTracks().forEach(t => t.stop())
                if (timerRef.current) clearInterval(timerRef.current)
            }
            mediaRecorder.start()
            setIsRecording(true)
            timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000)
        } catch {
            alert('Không thể truy cập microphone')
        }
    }, [])

    const stopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop()
        setIsRecording(false)
    }, [])

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    // File upload handlers
    const handleFileSelect = (file: File) => {
        const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/x-m4a']
        if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)) {
            alert('Định dạng không hỗ trợ. Dùng MP3, WAV, M4A hoặc WebM.')
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('File quá lớn. Tối đa 10MB.')
            return
        }
        setUploadFile(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFileSelect(file)
    }

    // Submit voice (mic recording)
    const handleSubmitVoice = async () => {
        if (!audioBlob || completed === null) return
        setIsSubmitting(true)
        try {
            const result = await apiClient.submitFeedbackVoice(challengeId, completed, audioBlob)
            setAnalysis(result.analysis || result)
        } catch {
            setAnalysis(getFallbackAnalysis(completed))
        } finally {
            setIsSubmitting(false)
        }
    }

    // Submit form (with optional uploaded file)
    const handleSubmitForm = async () => {
        if (completed === null) return
        setIsSubmitting(true)
        try {
            const result = await apiClient.submitFeedbackForm(challengeId, { completed, ...formData })
            setAnalysis(result.analysis || result)
        } catch {
            setAnalysis(getFallbackAnalysis(completed))
        } finally {
            setIsSubmitting(false)
        }
    }

    // Submit upload tab (file + form data)
    const handleSubmitUpload = async () => {
        if (!uploadFile || completed === null) return
        setIsSubmitting(true)
        try {
            // Use submitFeedbackVoice with the uploaded file
            const result = await apiClient.submitFeedbackVoice(challengeId, completed, uploadFile)
            setAnalysis(result.analysis || result)
        } catch {
            setAnalysis(getFallbackAnalysis(completed))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (analysis) {
        return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
                <header className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:opacity-70 transition-opacity">
                        <ArrowLeft size={20} style={{ color: 'var(--foreground)' }} />
                    </button>
                    <h1 className="font-bold text-[16px]" style={{ color: 'var(--foreground)' }}>
                        Kết quả — {challenge.title}
                    </h1>
                </header>
                <main className="flex-1 overflow-y-auto px-6 py-6 max-w-lg mx-auto w-full">
                    <FeedbackResults analysis={analysis} challengeTitle={challenge.title} completed={completed ?? false} />
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
            <header className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:opacity-70 transition-opacity">
                    <ArrowLeft size={20} style={{ color: 'var(--foreground)' }} />
                </button>
                <div className="flex-1">
                    <h1 className="font-bold text-[16px]" style={{ color: 'var(--foreground)' }}>Báo cáo thực chiến</h1>
                    <p className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>{challenge.title}</p>
                </div>
            </header>

            {/* Completed toggle */}
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                    Bạn đã thực hiện thử thách chưa?
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setCompleted(true)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 transition-all ${completed === true ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-transparent text-slate-500'}`}
                        style={completed !== true ? { backgroundColor: 'var(--muted)', borderColor: 'var(--border)' } : {}}
                    >
                        <CheckCircle2 size={18} /> Đã làm rồi!
                    </button>
                    <button
                        onClick={() => setCompleted(false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 transition-all ${completed === false ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-transparent text-slate-500'}`}
                        style={completed !== false ? { backgroundColor: 'var(--muted)', borderColor: 'var(--border)' } : {}}
                    >
                        <XCircle size={18} /> Chưa làm được
                    </button>
                </div>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
                {([
                    { key: 'voice', icon: <MessageCircle size={15} />, label: 'Kể cho Ni' },
                    { key: 'form', icon: <FileText size={15} />, label: 'Điền nhanh' },
                    { key: 'upload', icon: <Upload size={15} />, label: 'Upload file' },
                ] as { key: Tab; icon: React.ReactNode; label: string }[]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-bold transition-all border-b-2 ${activeTab === tab.key ? 'border-teal-500' : 'border-transparent'}`}
                        style={{ color: activeTab === tab.key ? 'var(--teal)' : 'var(--muted-foreground)' }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <main className="flex-1 overflow-y-auto px-6 py-6 max-w-lg mx-auto w-full">
                <AnimatePresence mode="wait">
                    {activeTab === 'voice' && (
                        <motion.div key="voice" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center gap-6">
                            <p className="text-[13px] text-center leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                                Kể lại trải nghiệm như đang nói chuyện với Ni. Tự nhiên nhất có thể.
                            </p>
                            <div className="flex flex-col items-center gap-4 py-4 w-full">
                                {isRecording ? (
                                    <>
                                        <div className="w-24 h-24 rounded-full bg-rose-500/20 animate-pulse flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-rose-500/40 flex items-center justify-center">
                                                <Mic size={28} className="text-rose-500" />
                                            </div>
                                        </div>
                                        <p className="text-lg font-mono font-bold" style={{ color: 'var(--foreground)' }}>{formatTime(recordingDuration)}</p>
                                        <button onClick={stopRecording} className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-colors">
                                            <Square size={16} className="fill-white" /> Dừng ghi âm
                                        </button>
                                    </>
                                ) : audioBlob ? (
                                    <>
                                        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--muted)' }}>
                                            <CheckCircle2 size={36} className="text-emerald-500" />
                                        </div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Đã ghi âm ({formatTime(recordingDuration)})</p>
                                        <div className="flex gap-3">
                                            <button onClick={() => { setAudioBlob(null); setRecordingDuration(0) }} className="px-4 py-2.5 rounded-xl text-sm font-bold border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                                                Ghi lại
                                            </button>
                                            <button onClick={handleSubmitVoice} disabled={isSubmitting || completed === null} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--teal)' }}>
                                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gửi cho Ni
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={startRecording} className="w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: 'var(--teal)' }}>
                                            <Mic size={32} className="text-white" />
                                        </button>
                                        <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Nhấn để bắt đầu ghi âm</p>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'form' && (
                        <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                                Trả lời một vài câu — không bắt buộc điền hết.
                            </p>

                            <EmotionRadio label="Cảm xúc trước khi làm" options={EMOTION_BEFORE} value={formData.emotionBefore} onChange={v => setFormData(p => ({ ...p, emotionBefore: v }))} />
                            <EmotionRadio label="Cảm xúc sau khi xong" options={EMOTION_AFTER} value={formData.emotionAfter} onChange={v => setFormData(p => ({ ...p, emotionAfter: v }))} />

                            <FormField
                                label="Bạn đã nói gì?"
                                placeholder="VD: Mình nói 'Em muốn hỏi về phần lý thuyết X, thầy có thể giải thích thêm không ạ?'"
                                value={formData.whatUserSaid}
                                onChange={v => setFormData(p => ({ ...p, whatUserSaid: v }))}
                                hint="✨ Ni sẽ phân tích câu này và gợi ý cách nói hay hơn"
                            />
                            <FormField
                                label="Người kia phản ứng sao?"
                                placeholder="VD: Thầy trả lời chi tiết, cả lớp chú ý nghe..."
                                value={formData.othersReaction}
                                onChange={v => setFormData(p => ({ ...p, othersReaction: v }))}
                            />
                            <FormField label="Diễn biến ngắn gọn" placeholder="VD: Mình đã hỏi giảng viên sau giờ học..." value={formData.situation} onChange={v => setFormData(p => ({ ...p, situation: v }))} />
                            <FormField label="Chỗ nào suôn sẻ?" placeholder="VD: Phần chào hỏi và đặt câu hỏi..." value={formData.whatWorked} onChange={v => setFormData(p => ({ ...p, whatWorked: v }))} />
                            <FormField label="Chỗ nào bị kẹt?" placeholder="VD: Không biết diễn đạt ý tiếp theo..." value={formData.whatStuck} onChange={v => setFormData(p => ({ ...p, whatStuck: v }))} />

                            <button onClick={handleSubmitForm} disabled={isSubmitting || completed === null} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white mt-2 disabled:opacity-50" style={{ backgroundColor: 'var(--teal)' }}>
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gửi cho Ni phân tích
                            </button>
                        </motion.div>
                    )}

                    {activeTab === 'upload' && (
                        <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                                Có file ghi âm cuộc hội thoại thực tế? Upload lên để Ni phân tích chi tiết hơn.
                            </p>

                            {/* Drop zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${isDragging ? 'border-teal-500 bg-teal-500/5' : ''}`}
                                style={{ borderColor: isDragging ? 'var(--teal)' : 'var(--border)' }}
                            >
                                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                                {uploadFile ? (
                                    <>
                                        <CheckCircle2 size={36} className="text-emerald-500" />
                                        <p className="text-sm font-semibold text-emerald-600">{uploadFile.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                                        <button onClick={e => { e.stopPropagation(); setUploadFile(null) }} className="text-xs text-slate-400 hover:text-red-400 transition-colors">Xóa file</button>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={32} style={{ color: 'var(--muted-foreground)' }} />
                                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Kéo thả hoặc click để chọn file</p>
                                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>MP3, WAV, M4A, WebM · Tối đa 10MB</p>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={handleSubmitUpload}
                                disabled={isSubmitting || !uploadFile || completed === null}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                                style={{ backgroundColor: 'var(--teal)' }}
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gửi cho Ni phân tích
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}

function getFallbackAnalysis(completed: boolean): FeedbackAnalysis {
    return {
        comparisonWithGym: completed
            ? 'Bạn đã dám thử và hoàn thành! Đó là bước tiến quan trọng nhất.'
            : 'Dám thử là đã giỏi rồi. Lần sau bạn sẽ làm được thôi!',
        progressNote: 'Kỹ năng giao tiếp của bạn đang tiến bộ từng ngày.',
        newStoryCandidate: completed,
        newStorySuggestion: completed ? 'Trải nghiệm thực chiến hôm nay' : undefined,
        nextDifficulty: completed ? 4 : 3,
        nextChallengeHint: completed
            ? 'Lần tới, thử trình bày ý kiến trước nhóm nhỏ'
            : 'Thử lại thử thách tương tự nhưng trong môi trường thoải mái hơn',
        xpEarned: completed ? 150 : 75,
        niComment: completed
            ? 'Bạn đã vượt qua thử thách! Tiếp tục duy trì nhé.'
            : 'Dám thử là đã giỏi — lần sau bạn sẽ tự tin hơn thôi!',
        dialogueAnalysis: null,
        betterPhrasing: null,
    }
}
