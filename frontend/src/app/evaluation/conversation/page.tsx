'use client'

import { ArrowLeft, Home, Settings, CheckCircle2, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer
} from 'recharts'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { useScenario } from '@/context/ScenarioContext'
import { Loader2 } from 'lucide-react'

const fallbackRadarData = [
    { subject: 'Fluency', A: 0, fullMark: 100 },
    { subject: 'Clarity', A: 0, fullMark: 100 },
    { subject: 'Relevance', A: 0, fullMark: 100 },
]

export default function ConversationEvaluationPage() {
    const router = useRouter()
    const { scenario, history, audioFileKeys } = useScenario()

    const [report, setReport] = useState<any>(null)
    const [isEvaluating, setIsEvaluating] = useState(true)

    useEffect(() => {
        if (!scenario) {
            router.push('/setup')
            return;
        }

        const runEvaluation = async () => {
            try {
                const fullTranscript = history.map((h: any) => `[${h.speaker}]: ${h.line}`).join('\n')
                const result = await apiClient.evaluateSession(scenario.evalRules, audioFileKeys, fullTranscript)
                setReport(result)

                // Lưu kết quả vào Local Storage cho History page
                try {
                    const existingStr = localStorage.getItem('speakmate_history');
                    const existing = existingStr ? JSON.parse(existingStr) : [];
                    const newEntry = {
                        date: new Date().toLocaleDateString('vi-VN') + ' – ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        mode: 'Giao tiếp cơ bản',
                        modeColor: 'badge-blue',
                        score: result?.overallScore || 'N/A',
                        topic: (scenario?.scenario || scenario as any)?.topic || (scenario?.scenario || scenario as any)?.scenarioName || 'Luyện tập tự do'
                    };
                    existing.unshift(newEntry);
                    localStorage.setItem('speakmate_history', JSON.stringify(existing));
                } catch (e) {
                    console.error('Error saving history', e);
                }

            } catch (err) {
                console.error(err)
                alert('Lỗi khi thu thập đánh giá.')
            } finally {
                setIsEvaluating(false)
            }
        }
        runEvaluation()
    }, [scenario, router, history, audioFileKeys])

    const currentRadarData = report?.radarData || fallbackRadarData

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">

            {/* Topbar */}
            <header className="flex flex-row items-center justify-between px-6 py-3 bg-[#0b1325] text-white sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Quay lại</span>
                    </button>
                    <Link href="/" className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white">
                        <Home className="w-4 h-4" />
                        <span className="text-sm font-medium">Trang chủ</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <Settings className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
                        <span className="text-sm font-medium text-slate-300">Mentor Ni</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-slate-800">
                            <Image src="/ni-avatar.png" alt="Mentor Ni" width={32} height={32} className="object-cover" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 max-w-[1500px] mx-auto w-full p-4 md:p-6 gap-6 relative">

                {/* 1. Left Sidebar */}
                <aside className="w-[260px] shrink-0 flex flex-col gap-6">
                    <h3 className="font-bold text-slate-800 mb-2 px-2 border-b border-slate-200 pb-2">Lượt hội thoại</h3>
                    <nav className="flex flex-col gap-3">
                        <Link
                            href="/evaluation/conversation"
                            className="bg-[#0b1325] text-white px-5 py-3.5 rounded-xl text-sm font-medium shadow-md transition-colors"
                        >
                            Đánh giá tổng
                        </Link>

                        {report?.turnHighlights?.length > 0 ? (
                            report.turnHighlights.map((highlight: string, index: number) => {
                                // Tách "Lượt X - Nội dung" -> title và desc
                                const parts = highlight.split(' - ');
                                const title = parts[0];
                                const desc = parts.slice(1).join(' - ') || '...';
                                return (
                                    <button key={index} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3.5 rounded-xl text-sm font-medium shadow-sm transition-colors text-left flex flex-col gap-1">
                                        <span className="font-bold text-slate-800">{title}</span>
                                        <span className="text-xs text-slate-500 font-normal">{desc}</span>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="text-sm text-slate-400 italic px-2">Chưa có dữ liệu lượt thoại</div>
                        )}
                    </nav>
                </aside>

                {/* 2. Middle Stats Area */}
                <main className="flex-1 flex flex-col min-w-0">
                    <h1 className="text-[1.7rem] font-bold text-slate-800 mb-5 font-serif">Đánh giá hội thoại</h1>

                    {isEvaluating ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 mt-10">
                            <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
                            <p className="font-medium text-lg">Ai đang phân tích (A.R.E Framework & Ngụy biện)...</p>
                        </div>
                    ) : (
                        <>
                            {/* Score and Comment Box */}
                            <div className="flex items-center gap-6 mb-6">
                                <div className="flex items-baseline gap-2 shrink-0">
                                    <span className="text-[3.2rem] font-bold text-[#0b1325] leading-none">{report?.overallScore || 0}</span>
                                    <span className="text-xl font-bold text-slate-400">/ 10</span>
                                </div>

                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-200 mt-1 shadow-sm">
                                        <Image src="/ni-avatar.png" alt="Ni Mentor" width={48} height={48} className="object-cover" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm relative before:content-[''] before:absolute before:top-4 before:-left-2 before:w-4 before:h-4 before:bg-white before:rotate-45 before:border-l before:border-b before:border-slate-200">
                                        <p className="text-sm font-medium text-slate-700 leading-relaxed">
                                            {report?.overallFeedback || "Không có phản hồi."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Grid: Radar + Highlights */}
                            <div className="grid grid-cols-2 gap-5 mb-5 items-stretch">

                                {/* Radar Chart */}
                                <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-center">
                                    <h3 className="text-[15px] font-bold text-slate-800 mb-2 self-start">Tổng quan kỹ năng giao tiếp</h3>
                                    <div className="w-full flex-1 min-h-[180px] -ml-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="60%" data={currentRadarData}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                <Radar
                                                    name="Score"
                                                    dataKey="A"
                                                    stroke="#14b8a6"
                                                    strokeWidth={2}
                                                    fill="#2dd4bf"
                                                    fillOpacity={0.3}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>

                                {/* Turn Highlights */}
                                <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
                                    <h3 className="text-[15px] font-bold text-slate-800 mb-4">Điểm nổi bật nổi cộm</h3>
                                    <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[180px]">
                                        {(report?.turnHighlights || []).map((highlight: string, idx: number) => (
                                            <div key={idx} className="bg-[#f0fdfa]/50 border border-teal-100 p-3 rounded-xl flex items-start gap-3">
                                                <div className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                                                <p className="text-[13px] text-slate-700 font-medium">{highlight}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                            </div>

                            {/* Bottom: Strengths / Improvements */}
                            <div className="grid grid-cols-2 gap-5 h-full">
                                <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                    <h3 className="text-[15px] font-bold text-slate-800 mb-3">Điểm mạnh</h3>
                                    <ul className="flex flex-col gap-2">
                                        {(report?.strengths || []).map((s: string, idx: number) => (
                                            <li key={`s-${idx}`} className="flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                                                <span className="text-[13px] text-slate-600 font-medium">{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>

                                <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                    <h3 className="text-[15px] font-bold text-slate-800 mb-3">Cần cải thiện</h3>
                                    <ul className="flex flex-col gap-2">
                                        {(report?.improvements || []).map((imp: string, idx: number) => (
                                            <li key={`i-${idx}`} className="flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                                <span className="text-[13px] text-slate-600 font-medium">{imp}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            </div>
                        </>
                    )}

                </main>

                {/* 3. Right Sidebar Timeline */}
                <aside className="w-[340px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-full self-start sticky top-24">
                    <h3 className="text-[15px] font-bold text-slate-800 mb-6 text-center border-b border-slate-100 pb-3">Dòng thời gian hội thoại</h3>

                    <div className="flex flex-col gap-6 relative">
                        {/* Timeline track */}
                        <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-slate-200" />

                        {history.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-10">Không có dữ liệu hội thoại.</p>
                        ) : history.map((turn, idx) => {
                            const isAI = turn.speaker === 'AI';
                            return (
                                <div key={idx} className="relative pl-10 flex flex-col gap-2">
                                    <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border flex items-center justify-center -ml-0.5 text-xs font-bold shadow-sm z-10 ${isAI ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-teal-500 border-teal-400 text-white'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{isAI ? 'Mentor Ni' : 'Bạn'}</h4>

                                    <div className={`border rounded-xl rounded-tl-none p-3 text-[12px] shadow-sm relative mr-2 ${isAI ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#f0fdfa] border-teal-200 text-slate-700'
                                        }`}>
                                        <span className={`font-bold block mb-1 ${isAI ? 'text-slate-800' : 'text-teal-800'}`}>
                                            {isAI ? 'Đối phương:' : 'Bạn:'}
                                        </span>
                                        {turn.line}
                                        {!isAI && (
                                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white shadow-md border-2 border-white">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

            </div>
        </div>
    )
}
