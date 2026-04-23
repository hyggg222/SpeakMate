'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGate from '@/components/AuthGate'
import { ArrowLeft, Target, Clock, CheckCircle2, XCircle, Loader2, Plus, Zap } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import DifficultyStars from '@/components/challenge/DifficultyStars'

type FilterTab = 'active' | 'completed' | 'all'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    pending:   { label: 'Đang chờ', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    in_progress: { label: 'Đang làm', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    completed: { label: 'Hoàn thành', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    skipped:   { label: 'Đã bỏ qua', color: 'text-slate-400 bg-slate-50 border-slate-200' },
    expired:   { label: 'Hết hạn', color: 'text-red-500 bg-red-50 border-red-200' },
}

function getDaysLeft(deadline: string | null) {
    if (!deadline) return null
    const diff = new Date(deadline).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 3600 * 24))
}

export default function ChallengesPage() {
    const router = useRouter()
    const [challenges, setChallenges] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<FilterTab>('active')
    const [skippingId, setSkippingId] = useState<string | null>(null)

    useEffect(() => {
        loadChallenges()
    }, [])

    const loadChallenges = async () => {
        setLoading(true)
        try {
            const data = await apiClient.getUserChallenges()
            if (data.length > 0) {
                setChallenges(data)
            } else {
                // Fallback localStorage for guests
                const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
                setChallenges(stored)
            }
        } catch {
            const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
            setChallenges(stored)
        } finally {
            setLoading(false)
        }
    }

    const handleSkip = async (id: string) => {
        setSkippingId(id)
        try { await apiClient.skipChallenge(id) } catch { /* guest OK */ }
        try {
            const stored = JSON.parse(localStorage.getItem('speakmate_challenges') || '[]')
            localStorage.setItem('speakmate_challenges', JSON.stringify(
                stored.map((c: any) => c.id === id ? { ...c, status: 'skipped' } : c)
            ))
        } catch { /* ignore */ }
        setChallenges(prev => prev.map(c => c.id === id ? { ...c, status: 'skipped' } : c))
        setSkippingId(null)
    }

    const filtered = challenges.filter(c => {
        if (filter === 'active') return c.status === 'pending' || c.status === 'in_progress'
        if (filter === 'completed') return c.status === 'completed'
        return true
    })

    const activeCount = challenges.filter(c => c.status === 'pending' || c.status === 'in_progress').length
    const completedCount = challenges.filter(c => c.status === 'completed').length

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-[17px] font-bold text-[#0b1325]">Kho Thử thách</h1>
                    <p className="text-[12px] text-slate-400">{activeCount} đang chờ · {completedCount} hoàn thành</p>
                </div>
                <button
                    onClick={() => router.push('/setup')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white"
                    style={{ backgroundColor: 'var(--teal)' }}
                >
                    <Plus size={15} /> Luyện tập mới
                </button>
            </header>

            {/* Filter tabs */}
            <div className="flex gap-1 px-6 py-4">
                {([
                    { key: 'active', label: 'Đang chờ', count: activeCount },
                    { key: 'completed', label: 'Hoàn thành', count: completedCount },
                    { key: 'all', label: 'Tất cả', count: challenges.length },
                ] as { key: FilterTab; label: string; count: number }[]).map(tab => (
                    <button key={tab.key} onClick={() => setFilter(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${filter === tab.key ? 'bg-[#0b1325] text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                        {tab.label}
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            <main className="px-6 pb-10 max-w-2xl mx-auto">
                <AuthGate feature="Thử thách">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 size={28} className="animate-spin text-teal-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Target size={28} className="text-slate-300" />
                        </div>
                        <p className="text-[15px] font-semibold text-slate-500">
                            {filter === 'active' ? 'Chưa có thử thách nào đang chờ' : 'Chưa có thử thách nào'}
                        </p>
                        <p className="text-[13px] text-slate-400 text-center max-w-xs">
                            Hoàn thành một phiên luyện tập để nhận thử thách thực tế từ Ni
                        </p>
                        <button onClick={() => router.push('/setup')}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white mt-2"
                            style={{ backgroundColor: 'var(--teal)' }}>
                            <Plus size={16} /> Bắt đầu luyện tập
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filtered.map(challenge => {
                            const daysLeft = getDaysLeft(challenge.deadline)
                            const isOverdue = daysLeft !== null && daysLeft <= 0
                            const isUrgent = daysLeft !== null && daysLeft <= 2 && !isOverdue
                            const statusInfo = STATUS_LABEL[challenge.status] || STATUS_LABEL.pending
                            const isActive = challenge.status === 'pending' || challenge.status === 'in_progress'

                            return (
                                <div key={challenge.id}
                                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                                    style={{ borderColor: isOverdue ? '#fca5a5' : isUrgent ? '#fcd34d' : '' }}>
                                    {/* Card header */}
                                    <div className="px-5 py-4">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <h3 className="text-[15px] font-bold text-[#0b1325] leading-tight flex-1">
                                                {challenge.title}
                                            </h3>
                                            <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-slate-500 leading-relaxed mb-3">
                                            {challenge.description}
                                        </p>

                                        {/* Meta row */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <DifficultyStars level={challenge.difficulty || 3} size={12} />
                                            {(challenge.source_weakness || challenge.sourceWeakness) && (
                                                <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                    <Zap size={10} /> {challenge.source_weakness || challenge.sourceWeakness}
                                                </span>
                                            )}
                                            {daysLeft !== null && (
                                                <span className={`flex items-center gap-1 text-[11px] font-semibold ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    <Clock size={11} />
                                                    {isOverdue ? 'Đã quá hạn' : `Còn ${daysLeft} ngày`}
                                                </span>
                                            )}
                                        </div>

                                        {/* Opener hints (collapsible on active) */}
                                        {isActive && challenge.opener_hints?.length > 0 && (
                                            <div className="mt-3 space-y-1.5">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gợi ý mở đầu</p>
                                                {challenge.opener_hints.slice(0, 2).map((hint: string, i: number) => (
                                                    <p key={i} className="text-[12px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                        "{hint}"
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons — only for active */}
                                    {isActive && (
                                        <div className="border-t border-slate-100 px-5 py-3 flex gap-2">
                                            <button
                                                onClick={() => router.push(`/feedback/new?challengeId=${challenge.id}`)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white"
                                                style={{ backgroundColor: 'var(--teal)' }}>
                                                <CheckCircle2 size={15} /> Báo cáo kết quả
                                            </button>
                                            <button
                                                onClick={() => handleSkip(challenge.id)}
                                                disabled={skippingId === challenge.id}
                                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                                                {skippingId === challenge.id
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : <XCircle size={14} />}
                                                Bỏ qua
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                </AuthGate>
            </main>
        </div>
    )
}
