'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Flame, Star, TrendingUp, BookOpen, Swords, Calendar } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { apiClient } from '@/lib/apiClient'

const LEVEL_NAMES: Record<number, string> = {
    1: 'Bắt đầu', 2: 'Tập sự', 3: 'Quen dần', 4: 'Tự tin hơn', 5: 'Khá ổn',
    6: 'Vững vàng', 7: 'Thành thạo', 8: 'Xuất sắc', 9: 'Chuyên gia', 10: 'Bậc thầy',
}

const BADGES = [
    { key: 'Khởi động', icon: '🚀', desc: 'Luyện 3 tuần liên tiếp', condition: (s: number) => s >= 3 },
    { key: 'Kiên trì', icon: '💪', desc: 'Luyện 7 tuần liên tiếp', condition: (s: number) => s >= 7 },
    { key: 'Thực chiến gia', icon: '🏆', desc: 'Luyện 15 tuần liên tiếp', condition: (s: number) => s >= 15 },
]

const CHART_LINES = [
    { key: 'coherence_score', label: 'Mạch lạc', color: '#14b8a6' },
    { key: 'filler_per_minute', label: 'Từ đệm/phút', color: '#f59e0b', dotted: true },
    { key: 'jargon_count', label: 'Jargon thừa', color: '#ef4444', dotted: true },
    { key: 'avg_response_time', label: 'Tốc độ phản xạ (s)', color: '#8b5cf6' },
]

function StatBox({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
    return (
        <div className="flex flex-col gap-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-[12px] font-medium mb-1">
                {icon} {label}
            </div>
            <span className="text-2xl font-black text-[#0b1325]">{value}</span>
            {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
        </div>
    )
}

export default function ProgressPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [userProgress, setUserProgress] = useState<any>(null)
    const [sessionHistory, setSessionHistory] = useState<any[]>([])

    useEffect(() => {
        apiClient.getProgressDetail().then(data => {
            if (data) {
                setUserProgress(data.userProgress)
                setSessionHistory(data.sessionHistory || [])
            }
        }).catch(() => {}).finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-teal-400/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
        )
    }

    const level = userProgress?.communication_level || 1
    const xp = userProgress?.total_xp || 0
    const streak = userProgress?.current_streak || 0
    const badges: string[] = userProgress?.badges || []
    const storyStats = userProgress?.story_bank_stats || {}
    const challengeStats = userProgress?.challenge_stats || {}
    const emotionTrend: { challengeId: string; before: string; after: string }[] = userProgress?.emotion_trend || []
    const xpForNextLevel = level * 100
    const xpProgress = Math.min((xp % xpForNextLevel) / xpForNextLevel * 100, 100)

    // Chart data — map snake_case DB fields to chart
    const chartData = sessionHistory.map((s, i) => ({
        name: `#${i + 1}`,
        coherence_score: s.coherence_score ?? 0,
        filler_per_minute: s.filler_per_minute ?? 0,
        jargon_count: s.jargon_count ?? 0,
        avg_response_time: s.avg_response_time ?? 0,
    }))

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-bold text-[#0b1325]">Tiến trình của bạn</h1>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">

                {/* Level & XP */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-black text-3xl shadow-md shrink-0">
                            {level}
                        </div>
                        <div className="flex-1">
                            <p className="text-lg font-bold text-[#0b1325]">{LEVEL_NAMES[level] || `Level ${level}`}</p>
                            <p className="text-sm text-slate-500">{xp} XP tích lũy</p>
                        </div>
                        {streak > 0 && (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-100 border border-orange-200">
                                <Flame size={16} className="text-orange-500" />
                                <span className="text-sm font-bold text-orange-600">{streak} tuần</span>
                            </div>
                        )}
                    </div>
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                        <span>XP hiện tại</span>
                        <span>{xp % xpForNextLevel} / {xpForNextLevel} → Level {level + 1}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-blue-500 transition-all duration-1000"
                            style={{ width: `${xpProgress}%` }}
                        />
                    </div>
                </div>

                {/* Section 1 — 4 Metrics Line Chart */}
                {chartData.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={18} className="text-teal-500" />
                            <h2 className="font-bold text-[15px] text-[#0b1325]">4 chỉ số diễn đạt ({chartData.length} phiên gần nhất)</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                {CHART_LINES.map(l => (
                                    <Line
                                        key={l.key}
                                        type="monotone"
                                        dataKey={l.key}
                                        name={l.label}
                                        stroke={l.color}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        strokeDasharray={l.dotted ? '4 2' : undefined}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Section 2 — Story Bank Stats */}
                {(storyStats.total > 0 || true) && (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen size={18} className="text-teal-500" />
                            <h2 className="font-bold text-[15px] text-[#0b1325]">Story Bank</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <StatBox icon={null} label="Tổng stories" value={storyStats.total || 0} />
                            <StatBox icon={null} label="Sẵn sàng thực chiến" value={storyStats.battle_ready || 0} />
                            <StatBox icon={null} label="Từ thực chiến" value={storyStats.from_practice || 0} />
                        </div>
                        {storyStats.total === 0 && (
                            <Link href="/stories/create" className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors">
                                <BookOpen size={15} /> Tạo story đầu tiên
                            </Link>
                        )}
                    </div>
                )}

                {/* Section 3 — Challenge Stats + Emotion Trend */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Swords size={18} className="text-teal-500" />
                        <h2 className="font-bold text-[15px] text-[#0b1325]">Thực chiến</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <StatBox icon={null} label="Đã hoàn thành" value={`${challengeStats.completed || 0}/${challengeStats.total || 0}`} />
                        <StatBox icon={null} label="Độ khó cao nhất" value={`Lv${challengeStats.highest_difficulty || 1}`} />
                        <StatBox icon={null} label="Tỷ lệ" value={`${Math.round((challengeStats.completion_rate || 0) * 100)}%`} />
                    </div>
                    {emotionTrend.length > 0 && (
                        <div>
                            <p className="text-[12px] font-semibold text-slate-500 mb-2">Xu hướng cảm xúc ({emotionTrend.length} thử thách gần nhất)</p>
                            <div className="flex flex-col gap-1.5">
                                {emotionTrend.slice(0, 5).map((e, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[12px]">
                                        <span className="text-slate-400 w-4">{i + 1}.</span>
                                        <span className="text-slate-600">{e.before}</span>
                                        <span className="text-slate-300">→</span>
                                        <span className="font-semibold text-teal-600">{e.after}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 4 — Streak Calendar (simple 4-week grid) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar size={18} className="text-teal-500" />
                        <h2 className="font-bold text-[15px] text-[#0b1325]">Streak — {streak} tuần liên tiếp</h2>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: 16 }).map((_, i) => {
                            const weeksAgo = 15 - i
                            const isActive = weeksAgo < streak
                            return (
                                <div
                                    key={i}
                                    title={`${weeksAgo === 0 ? 'Tuần này' : `${weeksAgo} tuần trước`}`}
                                    className="w-8 h-8 rounded-lg transition-colors"
                                    style={{
                                        backgroundColor: isActive ? '#14b8a6' : '#f1f5f9',
                                        opacity: isActive ? 1 : 0.5,
                                    }}
                                />
                            )
                        })}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">Mỗi ô = 1 tuần có hoạt động luyện tập</p>
                </div>

                {/* Section 5 — Badges */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Star size={18} className="text-amber-500" />
                        <h2 className="font-bold text-[15px] text-[#0b1325]">Huy hiệu</h2>
                    </div>
                    <div className="flex flex-col gap-3">
                        {BADGES.map(badge => {
                            const earned = badges.includes(badge.key)
                            return (
                                <div
                                    key={badge.key}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${earned ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50 opacity-50'}`}
                                >
                                    <span className="text-2xl">{badge.icon}</span>
                                    <div className="flex-1">
                                        <p className="text-[14px] font-bold" style={{ color: earned ? '#92400e' : '#94a3b8' }}>
                                            {badge.key}
                                        </p>
                                        <p className="text-[11px] text-slate-400">{badge.desc}</p>
                                    </div>
                                    {earned && <span className="text-[11px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Đạt được</span>}
                                </div>
                            )
                        })}
                    </div>
                </div>

            </main>
        </div>
    )
}
