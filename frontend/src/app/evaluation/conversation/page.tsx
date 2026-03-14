'use client'

import { ArrowLeft, Home, Settings, CheckCircle2, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { useScenario } from '@/context/ScenarioContext'
import { Loader2 } from 'lucide-react'
import MentorChatModal from '@/components/practice/MentorChatModal'
import NiCommentSection from '@/components/evaluation/NiCommentSection'
import EvalCTASection from '@/components/evaluation/EvalCTASection'
import InlineChallengeCard from '@/components/evaluation/InlineChallengeCard'
import { Suspense } from 'react'
import type { EvaluationReport } from '@speakmate/contracts'

// ============================================================
// MOCK DATA for demo mode
// ============================================================

const MOCK_SCENARIO = {
    scenario: {
        scenarioName: 'Thảo luận với giảng viên về dự án nhóm',
        topic: 'Trình bày ý kiến cá nhân trong buổi thảo luận học thuật',
        interviewerPersona: 'Giảng viên đại học, thân thiện nhưng hay đặt câu hỏi phản biện',
        goals: ['Diễn đạt ý kiến rõ ràng', 'Phản biện có cấu trúc', 'Giữ tự tin khi bị hỏi ngược'],
    },
    evalRules: {
        categories: [
            { category: 'Fluency', weight: 30, description: 'Độ trôi chảy khi nói' },
            { category: 'Clarity', weight: 25, description: 'Độ rõ ràng của ý' },
            { category: 'Relevance', weight: 25, description: 'Liên quan đến chủ đề' },
            { category: 'Confidence', weight: 20, description: 'Sự tự tin trong giao tiếp' },
        ],
    },
}

const MOCK_HISTORY = [
    { speaker: 'AI' as const, line: 'Chào em, hôm nay chúng ta sẽ thảo luận về dự án nhóm của em. Em có thể chia sẻ tiến độ hiện tại không?' },
    { speaker: 'User' as const, line: 'Dạ chào thầy. Nhóm em đang ở giai đoạn thu thập dữ liệu. Em phụ trách phần survey và đã gửi cho 50 người rồi ạ.' },
    { speaker: 'AI' as const, line: 'Tốt lắm. Vậy em có gặp khó khăn gì trong quá trình thu thập không? Và em đánh giá chất lượng dữ liệu thế nào?' },
    { speaker: 'User' as const, line: 'Em thấy... ừm... có một số câu trả lời không hợp lệ. Khoảng 10% respondents trả lời thiếu. Em nghĩ mình cần filter lại.' },
    { speaker: 'AI' as const, line: 'Em nói "filter lại" — cụ thể em sẽ dùng tiêu chí nào? Nếu loại 10% đó liệu có ảnh hưởng đến tính representative của mẫu không?' },
    { speaker: 'User' as const, line: 'À... em chưa nghĩ tới phần representative. Có lẽ em cần... ừm... tham khảo thêm methodology để quyết định.' },
    { speaker: 'AI' as const, line: 'Đúng rồi. Đây là điểm quan trọng. Em có thể tham khảo phương pháp listwise deletion hoặc multiple imputation. Em nghiêng về hướng nào?' },
    { speaker: 'User' as const, line: 'Em nghĩ listwise deletion đơn giản hơn vì mẫu của em khá nhỏ, nếu impute thì có thể introduce bias. Nhưng em sẽ thử cả hai và so sánh kết quả.' },
]

const MOCK_REPORT = {
    goalProgress: 72,
    overallFeedback: 'Bạn thể hiện khá tốt về khả năng trình bày ý kiến. Tuy nhiên, phần phản biện cần cải thiện — khi bị hỏi ngược, bạn hay ngập ngừng và chưa đưa ra lập luận có cấu trúc. Phần cuối cho thấy bạn có khả năng phân tích tốt khi tự tin hơn.',
    language: {
        score: 68, feedback: 'Từ vựng đa dạng, cần cải thiện ngữ pháp câu phức.',
        strengths: ['Dùng từ chuyên ngành phù hợp (listwise deletion, imputation)', 'Phát âm rõ ràng'],
        weaknesses: [{ turn: 4, issue: 'Ngữ pháp câu phức còn sai', fix: 'Luyện thêm mệnh đề quan hệ' }],
    },
    content: {
        score: 78, feedback: 'Trả lời đúng trọng tâm, cần phản biện sâu hơn.',
        strengths: ['Trả lời đúng trọng tâm câu hỏi', 'Đưa ra ví dụ cụ thể (50 respondents, 10%)'],
        weaknesses: [{ turn: 6, issue: 'Chưa phản biện sâu khi bị hỏi ngược', fix: 'Chuẩn bị counterarguments' }],
    },
    emotion: {
        score: 62, feedback: 'Tự tin ở đầu, mất bình tĩnh khi bị hỏi khó.',
        strengths: ['Lượt cuối thể hiện tư duy phân tích tốt'],
        weaknesses: [{ turn: 4, issue: 'Ngập ngừng nhiều (ừm, à)', fix: 'Tập pause 2 giây thay vì nói "ừm"' }],
    },
}

function ConversationContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isDemo = searchParams.get('demo') === 'true'
    const { scenario: ctxScenario, history: ctxHistory, audioFileKeys } = useScenario()

    const [report, setReport] = useState<EvaluationReport | null>(null)
    const [isEvaluating, setIsEvaluating] = useState(true)
    const [evalError, setEvalError] = useState<string | null>(null)
    const [isMentorOpen, setIsMentorOpen] = useState(false)
    const [showInlineChallenge, setShowInlineChallenge] = useState(false)

    // Use demo data or real context
    const scenario = isDemo ? MOCK_SCENARIO : ctxScenario
    const history = isDemo ? MOCK_HISTORY : ctxHistory

    useEffect(() => {
        if (!scenario && !isDemo) {
            router.push('/setup')
            return
        }

        if (isDemo) {
            // Demo mode — use mock data
            const timer = setTimeout(() => {
                setReport(MOCK_REPORT as any)
                setIsEvaluating(false)
            }, 1500)
            return () => clearTimeout(timer)
        }

        // Real evaluation — call API
        const runEvaluation = async () => {
            try {
                const rubric = (scenario as any)?.evalRules || { categories: [] }
                const fullTranscript = history.map((t: any) => {
                    if (t.speaker === 'AI' && t.character_name) return `[${t.character_name}]: ${t.line}`;
                    return `${t.speaker === 'AI' ? 'Đối phương' : 'Bạn'}: ${t.line}`;
                }
                ).join('\n')

                const evalReport = await apiClient.evaluateSession(rubric, audioFileKeys, fullTranscript)
                setReport(evalReport)
            } catch (err) {
                console.error('[Evaluation] API call failed:', err)
                setEvalError('Không thể phân tích. Đang hiển thị kết quả mẫu.')
                setReport(MOCK_REPORT as any)
            } finally {
                setIsEvaluating(false)
            }
        }
        runEvaluation()
    }, [scenario, router, isDemo])

    // Derive strengths/weaknesses from multi-stage report
    const allStrengths = report ? [
        ...(report.language?.strengths || []),
        ...(report.content?.strengths || []),
        ...(report.emotion?.strengths || []),
    ] : []

    const allWeaknesses = report ? [
        ...(report.language?.weaknesses || []).map((w: any) => typeof w === 'string' ? w : w.issue),
        ...(report.content?.weaknesses || []).map((w: any) => typeof w === 'string' ? w : w.issue),
        ...(report.emotion?.weaknesses || []).map((w: any) => typeof w === 'string' ? w : w.issue),
    ] : []

    // Build evalReport-like object for MentorChatModal context
    const evalForMentor = report ? {
        goalProgress: report.goalProgress || 0,
        overallFeedback: report.overallFeedback,
        language: report.language,
        content: report.content,
        emotion: report.emotion,
    } : null

    return (
        <div className="flex flex-1 max-w-[1500px] mx-auto w-full p-4 md:p-6 gap-6 relative">
            {/* 1. Left Sidebar */}
            <aside className="w-[260px] shrink-0 flex flex-col gap-6">
                <h3 className="font-bold text-slate-800 mb-2 px-2 border-b border-slate-200 pb-2">Lượt hội thoại</h3>
                <nav className="flex flex-col gap-3">
                    <div className="bg-[#0b1325] text-white px-5 py-3.5 rounded-xl text-sm font-medium shadow-md">
                        Đánh giá tổng
                    </div>

                    {(() => {
                        // Derive turn highlights from weakness data
                        const turnWeaknesses = [
                            ...(report?.language?.weaknesses || []),
                            ...(report?.content?.weaknesses || []),
                            ...(report?.emotion?.weaknesses || []),
                        ].filter((w: any) => w.turn != null);
                        return turnWeaknesses.length > 0 ? (
                            turnWeaknesses.map((w: any, index: number) => (
                                <button key={index} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3.5 rounded-xl text-sm font-medium shadow-sm transition-colors text-left flex flex-col gap-1">
                                    <span className="font-bold text-slate-800">Lượt {w.turn}</span>
                                    <span className="text-xs text-slate-500 font-normal">{w.issue}</span>
                                </button>
                            ))
                        ) : (
                            <div className="text-sm text-slate-400 italic px-2">Chưa có dữ liệu lượt thoại</div>
                        );
                    })()}
                </nav>
            </aside>

            {/* 2. Middle Stats Area */}
            <main className="flex-1 flex flex-col min-w-0">
                <h1 className="text-[1.7rem] font-bold text-slate-800 mb-5 font-serif">Đánh giá hội thoại</h1>

                {isEvaluating ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 mt-10">
                        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
                        <p className="font-medium text-lg">AI đang phân tích hội thoại...</p>
                    </div>
                ) : (
                    <>
                        {/* Error banner */}
                        {evalError && (
                            <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
                                {evalError}
                            </div>
                        )}

                        {/* Score and Comment Box */}
                        <div className="flex items-center gap-6 mb-6">
                            <div className="flex items-baseline gap-2 shrink-0">
                                <span className="text-[3.2rem] font-bold text-[#0b1325] leading-none">{report?.goalProgress || 0}</span>
                                <span className="text-xl font-bold text-slate-400">%</span>
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

                        {/* Multi-stage Progress Bars + Strengths */}
                        <div className="grid grid-cols-2 gap-5 mb-5 items-stretch">
                            {/* Stage Scores */}
                            <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-5">
                                <h3 className="text-[15px] font-bold text-slate-800">Đánh giá Đa tầng</h3>
                                <div className="flex flex-col gap-1 w-full">
                                    <div className="flex justify-between items-center text-[13px] font-bold text-slate-700">
                                        <span>Ngôn ngữ (Từ vựng, Ngữ pháp)</span>
                                        <span>{report?.language?.score || 0}/100</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-blue-500 transition-all duration-1000" style={{ width: `${report?.language?.score || 0}%` }} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <div className="flex justify-between items-center text-[13px] font-bold text-slate-700">
                                        <span>Nội dung (Logic, Xử lý tình huống)</span>
                                        <span>{report?.content?.score || 0}/100</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-500 transition-all duration-1000" style={{ width: `${report?.content?.score || 0}%` }} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <div className="flex justify-between items-center text-[13px] font-bold text-slate-700">
                                        <span>Cảm xúc (Ngữ điệu, Tự tin)</span>
                                        <span>{report?.emotion?.score || 0}/100</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-red-400 transition-all duration-1000" style={{ width: `${report?.emotion?.score || 0}%` }} />
                                    </div>
                                </div>
                            </section>

                            {/* Strengths */}
                            <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
                                <h3 className="text-[15px] font-bold text-slate-800 mb-4">Điểm mạnh</h3>
                                <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[220px]">
                                    {allStrengths.length > 0 ? allStrengths.slice(0, 6).map((s: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                                            <span className="text-[13px] text-slate-600 font-medium">{s}</span>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-slate-400 italic">Chưa có dữ liệu</p>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Weaknesses / Improvements */}
                        <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-5">
                            <h3 className="text-[15px] font-bold text-slate-800 mb-3">Cần cải thiện</h3>
                            <ul className="flex flex-col gap-2">
                                {allWeaknesses.length > 0 ? allWeaknesses.slice(0, 6).map((imp: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                        <span className="text-[13px] text-slate-600 font-medium">{imp}</span>
                                    </li>
                                )) : (
                                    <li className="text-sm text-slate-400 italic">Chưa có dữ liệu</li>
                                )}
                            </ul>
                        </section>

                        {/* Ni Comment */}
                        <div className="mt-5">
                            <NiCommentSection evalReport={evalForMentor} />
                        </div>

                        {/* CTA Buttons */}
                        <div className="mt-5">
                            <EvalCTASection
                                sessionId={isDemo ? 'demo' : 'session'}
                                weaknesses={allWeaknesses}
                                onGenerateChallenge={async () => setShowInlineChallenge(true)}
                                isChallengeVisible={showInlineChallenge}
                            />
                        </div>

                        {/* Inline Challenge Card */}
                        <InlineChallengeCard
                            sessionId={''}
                            isVisible={showInlineChallenge}
                            onAccepted={() => setShowInlineChallenge(false)}
                            onSkipped={() => setShowInlineChallenge(false)}
                            evalReport={report}
                        />
                    </>
                )}

                {/* Modals */}
                <MentorChatModal
                    isOpen={isMentorOpen}
                    onClose={() => setIsMentorOpen(false)}
                    scenario={scenario?.scenario || scenario}
                    evaluationReport={evalForMentor}
                />
            </main>

            {/* 3. Right Sidebar Timeline */}
            <aside className="w-[340px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-full self-start sticky top-24">
                <h3 className="text-[15px] font-bold text-slate-800 mb-6 text-center border-b border-slate-100 pb-3">Dòng thời gian hội thoại</h3>

                <div className="flex flex-col gap-6 relative">
                    <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-slate-200" />

                    {history.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-10">Không có dữ liệu hội thoại.</p>
                    ) : history.map((turn: any, idx: number) => {
                        const isAI = turn.speaker === 'AI'
                        const speakerLabel = isAI ? (turn.character_name || 'Đối phương') : 'Bạn'
                        return (
                            <div key={idx} className="relative pl-10 flex flex-col gap-2">
                                <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border flex items-center justify-center -ml-0.5 text-xs font-bold shadow-sm z-10 ${isAI ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-teal-500 border-teal-400 text-white'}`}>
                                    {idx + 1}
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm mb-1">{speakerLabel}</h4>
                                <div className={`border rounded-xl rounded-tl-none p-3 text-[12px] shadow-sm relative mr-2 ${isAI ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#f0fdfa] border-teal-200 text-slate-700'}`}>
                                    <span className={`font-bold block mb-1 ${isAI ? 'text-slate-800' : 'text-teal-800'}`}>
                                        {speakerLabel + ':'}
                                    </span>
                                    {turn.line}
                                    {!isAI && (
                                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white shadow-md border-2 border-white">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </aside>
        </div>
    )
}

export default function ConversationEvaluationPage() {
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
                        <span className="text-sm font-medium text-slate-300">Mentor Ni</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-slate-800">
                            <Image src="/ni-avatar.png" alt="Mentor Ni" width={32} height={32} className="object-cover" />
                        </div>
                    </div>
                </div>
            </header>

            <Suspense fallback={<div className="flex-1 flex justify-center items-center text-slate-400 mt-20">Đang tải...</div>}>
                <ConversationContent />
            </Suspense>
        </div>
    )
}
