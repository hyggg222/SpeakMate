'use client'

import { ArrowLeft, Home, Settings, MessageCircle, FastForward } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { apiClient } from '@/lib/apiClient'
import { EvaluationReport } from '@speakmate/contracts'
import MentorChatModal from '@/components/practice/MentorChatModal'
import ChallengeModal from '@/components/practice/ChallengeModal'

function ProgressBar({ label, score, colorClass }: { label: string, score: number, colorClass: string }) {
    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-center text-[13px] font-bold text-slate-700">
                <span>{label}</span>
                <span>{score}/100</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shrink-0">
                <div className={`h-full rounded-full transition-all duration-1000 ${colorClass}`} style={{ width: `${score}%` }} />
            </div>
        </div>
    )
}

function OverallContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const [loading, setLoading] = useState(true);
    const [evalReport, setEvalReport] = useState<EvaluationReport | null>(null);
    const [fullSession, setFullSession] = useState<any>(null); // For scenario context

    // Modals
    const [isMentorOpen, setIsMentorOpen] = useState(false);
    const [isChallengeOpen, setIsChallengeOpen] = useState(false);

    useEffect(() => {
        if (!sessionId) {
            setLoading(false);
            return;
        }
        apiClient.getSessionById(sessionId).then(data => {
            if (data?.session) {
                setFullSession(data.session);
            }
            if (data?.evaluation?.report_data) {
                setEvalReport(data.evaluation.report_data);
            } else if (data?.evaluation) {
                // Backward compatibility if old structure
                const raw = data.evaluation;
                setEvalReport({
                    goalProgress: raw.score || 0,
                    overallFeedback: "Kết quả bài làm của bạn",
                    language: { score: raw.score || 0, feedback: '', strengths: raw.strengths || [], weaknesses: [] },
                    content: { score: raw.score || 0, feedback: '', strengths: [], weaknesses: [] },
                    emotion: { score: raw.score || 0, feedback: '', strengths: [], weaknesses: [] },
                });
            }
            setLoading(false);
        }).catch(err => {
            console.error("Fetch session err", err);
            setLoading(false);
        })
    }, [sessionId]);

    if (loading) {
        return <div className="flex-1 flex justify-center items-center text-slate-400">Đang tóm tắt kết quả...</div>
    }

    if (!evalReport) {
        return <div className="flex-1 flex justify-center items-center text-red-400">Không tìm thấy báo cáo đánh giá.</div>
    }

    // Lấy Strength gộp chung lại cho hiển thị nổi bật
    const allStrengths = [
        ...(evalReport.language?.strengths || []),
        ...(evalReport.content?.strengths || []),
        ...(evalReport.emotion?.strengths || [])
    ];

    // Lấy Weakness gộp chung lại
    const allWeaknesses = [
        ...(evalReport.language?.weaknesses || []).map(w => w.issue),
        ...(evalReport.content?.weaknesses || []).map(w => w.issue),
        ...(evalReport.emotion?.weaknesses || []).map(w => w.issue)
    ];

    return (
        <main className="flex-1 flex flex-col bg-transparent relative">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 font-serif">Đánh giá chung buổi luyện tập</h1>

            {/* Score and Comment Box */}
            <div className="flex items-center gap-8 mb-6">
                <div className="flex items-baseline gap-2 shrink-0">
                    <span className="text-[3.5rem] font-bold text-[#0b1325] leading-none">{evalReport.goalProgress}</span>
                    <span className="text-2xl font-bold text-slate-400">%</span>
                </div>

                <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-200 mt-1 shadow-sm">
                        <Image src="/ni-avatar.png" alt="Ni Mentor" width={48} height={48} className="object-cover" />
                    </div>
                    <div className="bg-[#0b1325] text-white p-4 rounded-2xl rounded-tl-none border border-[#1e293b] w-full relative before:content-[''] before:absolute before:top-4 before:-left-2 before:w-4 before:h-4 before:bg-[#0b1325] before:rotate-45 before:border-l before:border-b before:border-[#1e293b] shadow-xl">
                        <p className="text-[15px] font-medium leading-relaxed">
                            {evalReport.overallFeedback || 'Bạn đã làm rất tốt, hãy xem chi tiết bên dưới nhé!'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Left Column: Progress Bars */}
                <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Đánh giá Đa tầng</h3>

                    <ProgressBar label="Ngôn ngữ (Từ vựng, Ngữ pháp)" score={evalReport.language?.score || 0} colorClass="bg-blue-500" />
                    <ProgressBar label="Nội dung (Logic, Xử lý tình huống)" score={evalReport.content?.score || 0} colorClass="bg-amber-500" />
                    <ProgressBar label="Cảm xúc (Ngữ điệu, Tự tin)" score={evalReport.emotion?.score || 0} colorClass="bg-red-400" />

                    <div className="mt-4 flex gap-3">
                        <button onClick={() => setIsChallengeOpen(true)} className="flex-1 bg-[#2dd4bf] hover:bg-[#14b8a6] text-[#0b1325] px-4 py-3 rounded-xl font-bold shadow transition-colors flex items-center justify-center gap-2">
                            <FastForward className="w-4 h-4" />
                            Nhận thử thách
                        </button>
                        <button onClick={() => setIsMentorOpen(true)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Cố vấn Ni
                        </button>
                    </div>
                </section>

                {/* Right Column Highlights / Strengths */}
                <section className="flex flex-col gap-6">
                    {/* Strengths */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex-1">
                        <h3 className="text-base font-bold text-teal-600 mb-3">🔥 Điểm sáng của bạn</h3>
                        <ul className="list-disc pl-4 text-[13px] font-medium text-slate-600 space-y-2 marker:text-teal-400">
                            {allStrengths.length > 0 ? allStrengths.slice(0, 4).map((s, i) => (
                                <li key={i}>{s}</li>
                            )) : <li>Không có dữ liệu</li>}
                        </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex-1">
                        <h3 className="text-base font-bold text-rose-500 mb-3">📈 Vấn đề cần cải thiện</h3>
                        <ul className="list-disc pl-4 text-[13px] font-medium text-slate-600 space-y-2 marker:text-rose-400">
                            {allWeaknesses.length > 0 ? allWeaknesses.slice(0, 4).map((w, i) => (
                                <li key={i}>{w}</li>
                            )) : <li>Không có dữ liệu</li>}
                        </ul>
                    </div>
                </section>
            </div>

            {/* Modals */}
            <MentorChatModal
                isOpen={isMentorOpen}
                onClose={() => setIsMentorOpen(false)}
                scenario={fullSession?.scenario}
                evaluationReport={evalReport}
            />

            {sessionId && (
                <ChallengeModal
                    isOpen={isChallengeOpen}
                    onClose={() => setIsChallengeOpen(false)}
                    sessionId={sessionId}
                />
            )}
        </main>
    )
}

export default function OverallEvaluationPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Topbar */}
            <header className="flex flex-row items-center justify-between px-6 py-3 bg-[#0b1325] text-white sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => window.history.back()} className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white">
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
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-slate-800">
                            <Image src="/ni-avatar.png" alt="User Profile" width={32} height={32} className="object-cover" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 max-w-[1400px] mx-auto w-full p-6 md:p-8 gap-8">
                {/* Fixed Sidebar for Navigation */}
                <aside className="w-64 shrink-0 flex flex-col gap-6">
                    <h3 className="font-bold text-slate-800 mb-2 px-2 border-b border-slate-200 pb-2">Hồi tưởng kết quả</h3>
                    <nav className="flex flex-col gap-2">
                        <div className="bg-[#0b1325] text-white px-4 py-3 rounded-full text-sm font-medium shadow-md w-full text-center">
                            Đánh giá tổng hợp
                        </div>
                        <div className="bg-white text-slate-400 px-4 py-3 rounded-full text-sm font-medium shadow-sm border border-slate-200 text-center cursor-not-allowed">
                            Lịch sử hội thoại
                        </div>
                    </nav>
                </aside>

                {/* Main Content inside Suspense for useSearchParams */}
                <Suspense fallback={<div className="flex-1 flex justify-center text-slate-400 mt-20">Đang tải biểu đồ đánh giá...</div>}>
                    <OverallContent />
                </Suspense>
            </div>
        </div>
    )
}
