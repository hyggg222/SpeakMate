'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Clock, Star, SkipForward, ArrowRight, Loader2, BookOpen } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'

export default function ActiveChallenges() {
    const router = useRouter()
    const [challenges, setChallenges] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [skipping, setSkipping] = useState(false)

    useEffect(() => {
        fetchChallenges()
    }, [])

    const fetchChallenges = async () => {
        setLoading(true)
        try {
            const data = await apiClient.getUserChallenges()
            const active = data.filter((c: any) => c.status === 'pending' || c.status === 'in_progress')
            if (active.length > 0) {
                setChallenges(active)
            } else {
                // Fallback: read from localStorage (guest users / before DB sync)
                const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
                const localActive = stored.filter((c: any) => c.status === 'pending' || c.status === 'in_progress')
                setChallenges(localActive)
            }
        } catch {
            // Network error — try localStorage
            const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
            setChallenges(stored.filter((c: any) => c.status === 'pending' || c.status === 'in_progress'))
        } finally {
            setLoading(false)
        }
    }

    const handleSkip = async (id: string) => {
        setSkipping(true)
        try {
            await apiClient.skipChallenge(id)
        } catch { /* OK for guests */ }
        // Update localStorage
        try {
            const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
            const updated = stored.map((c: any) => c.id === id ? { ...c, status: 'skipped' } : c)
            localStorage.setItem('speakmate_challenges', JSON.stringify(updated))
        } catch { /* ignore */ }
        setSkipping(false)
        fetchChallenges()
    }

    if (loading && challenges.length === 0) {
        return (
            <div className="rounded-xl p-5 flex justify-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
            </div>
        )
    }

    if (challenges.length === 0) {
        return (
            <div className="rounded-xl p-5 text-center flex flex-col items-center border border-dashed" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="p-3 rounded-full mb-3" style={{ backgroundColor: 'var(--muted)' }}>
                    <Target className="w-6 h-6" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <h4 className="font-bold text-[14px]" style={{ color: 'var(--foreground)' }}>
                    Chưa có nhiệm vụ thực tế
                </h4>
                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    Hoàn thành phiên luyện tập đầu tiên trong Phòng gym để nhận nhiệm vụ thực tế!
                </p>
            </div>
        )
    }

    const challenge = challenges[0]
    const difficulty = challenge.difficulty || 1

    const getDaysLeft = (deadline: string) => {
        if (!deadline) return null
        const diff = new Date(deadline).getTime() - new Date().getTime()
        const days = Math.ceil(diff / (1000 * 3600 * 24))
        return days > 0 ? days : 0
    }

    const daysLeft = challenge.deadline ? getDaysLeft(challenge.deadline) : null
    const isOverdue = daysLeft !== null && daysLeft <= 0
    const isUrgent = daysLeft !== null && daysLeft <= 2 && !isOverdue

    // Stories suggested for review
    const suggestedStories: { id: string; title: string }[] = challenge.suggestedStories || challenge.suggested_stories || []

    return (
        <div
            className="rounded-xl p-3 border relative overflow-hidden"
            style={{
                backgroundColor: 'var(--card)',
                borderColor: isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : 'var(--border)',
            }}
        >
            {/* Background decoration */}
            <div className="absolute -right-3 -top-3 opacity-5">
                <Target className="w-20 h-20" style={{ color: 'var(--teal)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}>
                        <Target className="w-4 h-4" style={{ color: 'var(--teal)' }} />
                    </div>
                    <h3 className="font-bold text-sm tracking-tight" style={{ color: 'var(--foreground)' }}>
                        Nhiệm vụ thực tế
                    </h3>
                </div>
                {/* Difficulty stars */}
                <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Star
                            key={i}
                            size={11}
                            className={i <= difficulty ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-2.5 relative z-10">
                <div>
                    <h4 className="font-bold text-[13px] leading-tight" style={{ color: 'var(--foreground)' }}>
                        {challenge.title}
                    </h4>
                    <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
                        {challenge.description}
                    </p>
                </div>

                {/* Source weakness tag */}
                {(challenge.sourceWeakness || challenge.source_weakness) && (
                    <div
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium w-fit"
                        style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#d97706' }}
                    >
                        Điểm yếu: {challenge.sourceWeakness || challenge.source_weakness}
                    </div>
                )}

                {/* Suggested stories */}
                {suggestedStories.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                            Story nên ôn trước:
                        </span>
                        {suggestedStories.slice(0, 2).map((s, i) => (
                            <button
                                key={i}
                                onClick={() => router.push(`/stories/${s.id}`)}
                                className="flex items-center gap-1.5 text-[11px] font-medium hover:underline text-left"
                                style={{ color: 'var(--teal)' }}
                            >
                                <BookOpen size={10} />
                                {s.title}
                            </button>
                        ))}
                    </div>
                )}

                {/* Deadline */}
                {daysLeft !== null && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold"
                        style={{ color: isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : 'var(--muted-foreground)' }}
                    >
                        <Clock className="w-3 h-3" />
                        {isOverdue ? 'Đã quá hạn' : `Còn ${daysLeft} ngày`}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-1">
                    <button
                        onClick={() => router.push(`/feedback/new?challengeId=${challenge.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-[12px] text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: 'var(--teal)' }}
                    >
                        Chia sẻ
                        <ArrowRight size={13} />
                    </button>
                    <button
                        onClick={() => handleSkip(challenge.id)}
                        disabled={skipping}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl font-bold text-[12px] border transition-colors hover:opacity-80"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                    >
                        {skipping ? <Loader2 size={13} className="animate-spin" /> : <SkipForward size={13} />}
                        Bỏ qua
                    </button>
                </div>
            </div>
        </div>
    )
}
