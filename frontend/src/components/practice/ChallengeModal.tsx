'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Target, Clock, Loader2, Star, BookOpen, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/apiClient'

// Fallback mock data when API is unavailable
const MOCK_CHALLENGE = {
    id: 'demo-challenge-001',
    title: 'Hỏi giảng viên một câu phản biện sau bài giảng',
    description: 'Sau buổi học tiếp theo, hãy chủ động hỏi giảng viên một câu hỏi về nội dung bài giảng. Tập trung vào việc diễn đạt rõ ràng và tự tin.',
    opener_hints: [
        'Thưa thầy/cô, em muốn hỏi thêm về phần...',
        'Em có một góc nhìn khác về vấn đề này, liệu...',
        'Em thấy điểm này rất thú vị, thầy/cô có thể giải thích thêm...',
    ],
    sourceWeakness: 'Chưa phản biện sâu',
    difficulty: 3,
    suggestedStories: [
        { id: 'story-1', title: 'Lần đầu thuyết trình trước lớp' },
        { id: 'story-2', title: 'Cuộc trò chuyện với mentor ở công ty' },
    ],
}

interface ChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
}

export default function ChallengeModal({ isOpen, onClose, sessionId }: ChallengeModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [challengeData, setChallengeData] = useState<any>(null)
    const [deadline, setDeadline] = useState("7")
    const [accepting, setAccepting] = useState(false)

    const generateChallenge = async () => {
        setLoading(true)
        try {
            const data = await apiClient.generateChallenge(sessionId)
            setChallengeData(data)
        } catch (error) {
            console.error(error)
            // Fallback to mock data when API unavailable
            setChallengeData(MOCK_CHALLENGE)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    if (isOpen && !challengeData && !loading) {
        generateChallenge()
    }

    const handleAccept = async () => {
        if (!challengeData) return
        setAccepting(true)
        try {
            const d = new Date()
            d.setDate(d.getDate() + parseInt(deadline))
            await apiClient.setChallengeDeadline(challengeData.id, d.toISOString())
        } catch {
            // Ignore API errors — works in demo mode too
        } finally {
            setAccepting(false)
            onClose()
            router.push(`/challenge/${challengeData.id}/feedback`)
        }
    }

    const difficulty = challengeData?.difficulty || 1
    const sourceWeakness = challengeData?.sourceWeakness || challengeData?.source_weakness
    const suggestedStories: { id: string; title: string }[] = challengeData?.suggestedStories || challengeData?.suggested_stories || []

    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative"
                style={{ backgroundColor: 'var(--card)' }}
            >
                {/* Header */}
                <div className="h-36 p-6 flex flex-col justify-end text-white relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, var(--teal), #0d9488)' }}
                >
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-black/20 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="absolute -right-6 -top-6 opacity-10">
                        <Target className="w-32 h-32" />
                    </div>
                    <Target className="w-9 h-9 mb-2 opacity-90" />
                    <h2 className="text-2xl font-bold leading-tight">Nhiệm Vụ Thực Tế</h2>
                    <p className="text-sm opacity-80 mt-0.5">Từ phòng gym ra đời thực</p>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--muted-foreground)' }}>
                            <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: 'var(--teal)' }} />
                            <p className="text-sm">Ni đang phân tích điểm yếu và tạo thử thách cho bạn...</p>
                        </div>
                    ) : challengeData ? (
                        <div className="flex flex-col gap-5">
                            {/* Title + Difficulty */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[17px] font-bold" style={{ color: 'var(--foreground)' }}>
                                        {challengeData.title}
                                    </h3>
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Star
                                                key={i}
                                                size={14}
                                                className={i <= difficulty ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-[14px] leading-relaxed rounded-xl p-4 border"
                                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                >
                                    {challengeData.description}
                                </p>
                            </div>

                            {/* Source weakness badge */}
                            {sourceWeakness && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                    style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)' }}
                                >
                                    <Zap size={14} className="text-amber-500" />
                                    <span className="text-[12px] font-medium" style={{ color: 'var(--foreground)' }}>
                                        Điểm yếu cần rèn: <strong>{sourceWeakness}</strong>
                                    </span>
                                </div>
                            )}

                            {/* Opener hints */}
                            {challengeData.opener_hints?.length > 0 && (
                                <div>
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>
                                        Gợi ý diễn đạt
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                        {challengeData.opener_hints.map((hint: string, i: number) => (
                                            <div key={i} className="px-3 py-2 rounded-lg text-[13px] font-medium border"
                                                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                            >
                                                &ldquo;{hint}&rdquo;
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Suggested stories */}
                            {suggestedStories.length > 0 && (
                                <div>
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>
                                        Story nên ôn trước
                                    </h4>
                                    <div className="flex flex-col gap-1.5">
                                        {suggestedStories.map((s, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px]"
                                                style={{ backgroundColor: 'var(--muted)', color: 'var(--teal)' }}
                                            >
                                                <BookOpen size={13} />
                                                <span className="font-medium">{s.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Deadline selector */}
                            <div className="flex flex-col gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                <label className="text-[13px] font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                                    <Clock className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} /> Chọn hạn chót
                                </label>
                                <select
                                    className="w-full rounded-xl px-4 py-3 text-[14px] border focus:outline-none"
                                    style={{
                                        backgroundColor: 'var(--muted)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--foreground)',
                                    }}
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                >
                                    <option value="1">Trong vòng 24 giờ</option>
                                    <option value="3">Trong 3 ngày tới</option>
                                    <option value="7">Trong tuần này (mặc định)</option>
                                </select>
                            </div>

                            {/* Accept button */}
                            <button
                                onClick={handleAccept}
                                disabled={accepting}
                                className="w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all"
                                style={{ backgroundColor: 'var(--teal)' }}
                            >
                                {accepting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
                                CHẤP NHẬN THỬ THÁCH
                            </button>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-rose-500">
                            Đã xảy ra lỗi khi tạo thử thách.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
