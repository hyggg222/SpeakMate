'use client'

import { ArrowLeft, Home, Settings, MessageCircle, FastForward, BookOpen, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { apiClient } from '@/lib/apiClient'
import { EvaluationReport } from '@speakmate/contracts'
import MentorChatModal from '@/components/practice/MentorChatModal'
import ChallengeModal from '@/components/practice/ChallengeModal'
import NiCommentSection from '@/components/evaluation/NiCommentSection'
import EvalCTASection from '@/components/evaluation/EvalCTASection'
import InlineChallengeCard from '@/components/evaluation/InlineChallengeCard'
import { useScenario } from '@/context/ScenarioContext'

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

function SubScoreBar({ label, score, color }: { label: string, score: number, color: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 w-24 shrink-0 text-right">{label}</span>
            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: color }} />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 w-8">{score}</span>
        </div>
    )
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

function ProficiencyBadge({ level }: { level?: string }) {
    if (!level) return null;
    const colors: Record<string, string> = {
        A1: 'bg-red-100 text-red-700 border-red-200',
        A2: 'bg-orange-100 text-orange-700 border-orange-200',
        B1: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        B2: 'bg-blue-100 text-blue-700 border-blue-200',
        C1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        C2: 'bg-purple-100 text-purple-700 border-purple-200',
    }
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[level] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            CEFR {level}
        </span>
    )
}

function ComparisonArrow({ current, previous, unit, inverse }: { current: number, previous?: number, unit?: string, inverse?: boolean }) {
    if (previous == null) return <span className="text-[11px] text-slate-400 italic">Điểm xuất phát</span>
    const diff = current - previous
    if (Math.abs(diff) < 0.5) return <span className="text-[11px] text-slate-400 flex items-center gap-1"><Minus className="w-3 h-3" />Giữ nguyên</span>
    const isGood = inverse ? diff < 0 : diff > 0
    const Icon = isGood ? TrendingUp : TrendingDown
    const color = isGood ? 'text-emerald-600' : 'text-rose-500'
    return (
        <span className={`text-[11px] font-semibold flex items-center gap-1 ${color}`}>
            <Icon className="w-3 h-3" />
            {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit || ''}
        </span>
    )
}

function MetricCard({ label, value, unit, previous, icon, inverse }: { label: string, value: number, unit?: string, previous?: number, icon: string, inverse?: boolean }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{icon} {label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#0b1325]">{typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}</span>
                {unit && <span className="text-sm text-slate-400">{unit}</span>}
            </div>
            <ComparisonArrow current={value} previous={previous} unit={unit} inverse={inverse} />
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

    // Bridge to Reality — inline challenge
    const [showInlineChallenge, setShowInlineChallenge] = useState(false);

    // Previous session metrics for comparison
    const [previousMetrics, setPreviousMetrics] = useState<any>(null);

    // User progress (Level/XP)
    const [userProgress, setUserProgress] = useState<any>(null);

    // Story Bank Coverage
    const { selectedStoryIds, scenario, history, audioFileKeys } = useScenario();
    const [storyCoverage, setStoryCoverage] = useState<any[]>([]);
    const [coverageLoading, setCoverageLoading] = useState(false);

    const isDemo = searchParams.get('demo') === 'true';

    useEffect(() => {
        // Demo mode: inject mock data, skip API
        if (isDemo) {
            setFullSession({
                scenario: {
                    scenarioName: 'Thảo luận với giảng viên về dự án nhóm',
                    topic: 'Trình bày ý kiến cá nhân trong buổi thảo luận học thuật',
                    interviewerPersona: 'Giảng viên đại học, thân thiện nhưng hay đặt câu hỏi phản biện',
                },
            });
            setEvalReport({
                goalProgress: 72,
                overallFeedback: 'Bạn đã thể hiện khá tốt trong phiên luyện tập. Phần mở đầu tự tin, nhưng cần cải thiện kỹ năng phản biện và diễn đạt ý kiến phức tạp hơn.',
                proficiencyLevel: 'B1',
                language: {
                    score: 68, feedback: '',
                    strengths: ['Phát âm rõ ràng, dễ nghe', 'Sử dụng từ vựng đa dạng'],
                    weaknesses: [{ issue: 'Ngữ pháp câu phức còn sai', fix: 'Luyện thêm mệnh đề quan hệ' }, { issue: 'Thiếu từ nối logic giữa các ý', fix: 'Dùng however, moreover, therefore' }],
                    subScores: { vocabularyRange: 72, grammarAccuracy: 60, honorificUsage: 74 },
                },
                content: {
                    score: 75, feedback: '',
                    strengths: ['Trả lời đúng trọng tâm câu hỏi', 'Đưa ra ví dụ cụ thể từ trải nghiệm'],
                    weaknesses: [{ issue: 'Chưa phản biện sâu khi bị hỏi ngược', fix: 'Chuẩn bị counterarguments' }, { issue: 'Thiếu lập luận có cấu trúc STAR', fix: 'Ôn lại Story Bank' }],
                    subScores: { persuasion: 70, clarity: 80, professionalism: 75 },
                },
                emotion: {
                    score: 70, feedback: '',
                    strengths: ['Giọng nói tự tin ở phần mở đầu'],
                    weaknesses: [{ issue: 'Mất tự tin khi bị hỏi ngược', fix: 'Tập pause trước khi trả lời' }, { issue: 'Ngập ngừng khi diễn đạt ý phức tạp', fix: 'Luyện filler phrases' }],
                    subScores: { empathy: 65, confidence: 72, toneControl: 68 },
                },
                sessionMetrics: {
                    coherenceScore: 71,
                    jargonCount: 3,
                    jargonList: [{ word: 'KPI', suggestion: 'chỉ tiêu' }, { word: 'deliverable', suggestion: 'sản phẩm bàn giao' }, { word: 'stakeholder', suggestion: 'bên liên quan' }],
                    fillerCount: 8,
                    fillerPerMinute: 6.2,
                    fillerList: [{ word: 'ờ', count: 4 }, { word: 'kiểu', count: 2 }, { word: 'tức là', count: 2 }],
                },
            } as any);
            setPreviousMetrics({
                coherence_score: 52,
                jargon_count: 6,
                avg_response_time: 4.2,
                filler_per_minute: 12,
            });
            setLoading(false);
            return;
        }

        // Fetch user progress in parallel (non-blocking)
        apiClient.getUserProgress().then(p => setUserProgress(p)).catch(() => {});

        if (!sessionId) {
            // No sessionId — evaluate from current session in context
            if (history && history.length > 1 && scenario?.evalRules) {
                const fullTranscript = history.map((t: any) => `${t.speaker}: ${t.line}`).join('\n');
                apiClient.evaluateSession(scenario.evalRules, audioFileKeys || [], fullTranscript)
                    .then(report => {
                        setEvalReport(report);
                        setLoading(false);
                    })
                    .catch(() => setLoading(false));
            } else {
                setLoading(false);
            }
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
    }, [sessionId, isDemo, history, scenario, audioFileKeys]);

    // Fetch Story Bank coverage after evaluation loads
    useEffect(() => {
        if (!evalReport || selectedStoryIds.length === 0 || !fullSession) return;
        setCoverageLoading(true);

        // Build transcript from session turns
        const transcript = fullSession.turns?.map((t: any) =>
            `${t.user_transcript ? `User: ${t.user_transcript}` : ''}${t.ai_response ? `\nAI: ${t.ai_response}` : ''}`
        ).join('\n') || '';

        Promise.all(
            selectedStoryIds.map(storyId =>
                apiClient.compareWithStoryBank(storyId, sessionId, transcript).catch(() => null)
            )
        ).then(results => {
            setStoryCoverage(results.filter(Boolean));
            setCoverageLoading(false);
        });
    }, [evalReport, selectedStoryIds, fullSession, sessionId]);

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
                <div className="flex flex-col items-center gap-2 shrink-0 min-w-[110px]">
                    {userProgress ? (
                        <>
                            {/* Level badge */}
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
                                {userProgress.communication_level || 1}
                            </div>
                            <ProficiencyBadge level={(evalReport as any).proficiencyLevel} />
                            {/* XP bar */}
                            <div className="w-full">
                                <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                    <span>{userProgress.total_xp || 0} XP</span>
                                    <span>+{Math.round(evalReport.goalProgress * 0.85)} XP</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-blue-500 transition-all duration-1000"
                                        style={{ width: `${Math.min(((userProgress.total_xp || 0) % ((userProgress.communication_level || 1) * 100)) / ((userProgress.communication_level || 1) * 100) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            {/* Score vs previous */}
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-[#0b1325] leading-none">{evalReport.goalProgress}</span>
                                <span className="text-sm font-bold text-slate-400">%</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[3.5rem] font-bold text-[#0b1325] leading-none">{evalReport.goalProgress}</span>
                                <span className="text-2xl font-bold text-slate-400">%</span>
                            </div>
                            <ProficiencyBadge level={(evalReport as any).proficiencyLevel} />
                        </>
                    )}
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

            {/* 4 Metric Cards — Chỉ số diễn đạt */}
            {(evalReport as any).sessionMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <MetricCard
                        label="Độ mạch lạc"
                        icon="🎯"
                        value={(evalReport as any).sessionMetrics.coherenceScore}
                        unit="/100"
                        previous={previousMetrics?.coherence_score}
                    />
                    <MetricCard
                        label="Từ CM thừa"
                        icon="📝"
                        value={(evalReport as any).sessionMetrics.jargonCount}
                        unit="từ"
                        previous={previousMetrics?.jargon_count}
                        inverse
                    />
                    <MetricCard
                        label="Tốc độ phản xạ"
                        icon="⚡"
                        value={(evalReport as any).sessionMetrics.avgResponseTime ?? previousMetrics?.avg_response_time ?? 0}
                        unit="giây"
                        previous={previousMetrics?.avg_response_time}
                        inverse
                    />
                    <MetricCard
                        label="Từ đệm"
                        icon="💬"
                        value={(evalReport as any).sessionMetrics.fillerPerMinute}
                        unit="/phút"
                        previous={previousMetrics?.filler_per_minute}
                        inverse
                    />
                </div>
            )}
            {previousMetrics && (evalReport as any).sessionMetrics && (
                <p className="text-[11px] text-center -mt-4 mb-2" style={{ color: 'var(--muted-foreground)' }}>
                    Mũi tên so sánh với <span className="font-semibold">phiên luyện trước</span>
                </p>
            )}

            {/* Jargon & Filler Details (expandable) */}
            {(evalReport as any).sessionMetrics?.jargonList?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-600 mb-2">📝 Từ chuyên môn có thể thay thế</h4>
                        <div className="space-y-1.5">
                            {(evalReport as any).sessionMetrics.jargonList.map((j: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-[12px]">
                                    <span className="text-rose-500 line-through font-medium">{j.word}</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-emerald-600 font-medium">{j.suggestion}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {(evalReport as any).sessionMetrics?.fillerList?.length > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-600 mb-2">💬 Từ đệm đã dùng</h4>
                            <div className="flex flex-wrap gap-2">
                                {(evalReport as any).sessionMetrics.fillerList.map((f: any, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-700 font-medium">
                                        "{f.word}" ×{f.count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Left Column: Progress Bars */}
                <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Đánh giá Đa tầng</h3>

                    <ProgressBar label="Ngôn ngữ (Từ vựng, Ngữ pháp)" score={evalReport.language?.score || 0} colorClass="bg-blue-500" />
                    {evalReport.language?.subScores && (
                        <div className="flex flex-col gap-1 pl-2 -mt-3">
                            {Object.entries(evalReport.language.subScores).map(([key, val]) => (
                                <SubScoreBar key={key} label={SUB_SCORE_LABELS[key] || key} score={val as number} color="#3b82f6" />
                            ))}
                        </div>
                    )}

                    <ProgressBar label="Nội dung (Logic, Xử lý tình huống)" score={evalReport.content?.score || 0} colorClass="bg-amber-500" />
                    {evalReport.content?.subScores && (
                        <div className="flex flex-col gap-1 pl-2 -mt-3">
                            {Object.entries(evalReport.content.subScores).map(([key, val]) => (
                                <SubScoreBar key={key} label={SUB_SCORE_LABELS[key] || key} score={val as number} color="#f59e0b" />
                            ))}
                        </div>
                    )}

                    <ProgressBar label="Cảm xúc (Ngữ điệu, Tự tin)" score={evalReport.emotion?.score || 0} colorClass="bg-red-400" />
                    {evalReport.emotion?.subScores && (
                        <div className="flex flex-col gap-1 pl-2 -mt-3">
                            {Object.entries(evalReport.emotion.subScores).map(([key, val]) => (
                                <SubScoreBar key={key} label={SUB_SCORE_LABELS[key] || key} score={val as number} color="#f87171" />
                            ))}
                        </div>
                    )}

                    <div className="mt-4">
                        <button onClick={() => setIsMentorOpen(true)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Hỏi Ni thêm
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

            {/* Story Bank Coverage */}
            {(coverageLoading || storyCoverage.length > 0) && (
                <section className="mt-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-[var(--teal)]" />
                        Story Bank Coverage
                    </h3>
                    {coverageLoading ? (
                        <p className="text-sm text-slate-400 animate-pulse">Đang so sánh với Story Bank...</p>
                    ) : (
                        <div className="space-y-4">
                            {storyCoverage.map((result, i) => (
                                <div key={i} className="border rounded-xl p-4 space-y-3">
                                    {/* Coverage Score */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">Coverage Score</span>
                                        <span className="text-lg font-bold" style={{ color: result.coverageScore >= 70 ? '#10b981' : result.coverageScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                                            {result.coverageScore}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${result.coverageScore}%`,
                                                backgroundColor: result.coverageScore >= 70 ? '#10b981' : result.coverageScore >= 40 ? '#f59e0b' : '#ef4444'
                                            }}
                                        />
                                    </div>

                                    {/* Missed Parts */}
                                    {result.missedParts?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-rose-500 mb-1">Phần bỏ sót:</p>
                                            <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc marker:text-rose-300">
                                                {result.missedParts.map((p: string, j: number) => <li key={j}>{p}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Added Parts */}
                                    {result.addedParts?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-emerald-500 mb-1">Nội dung hay thêm:</p>
                                            <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc marker:text-emerald-300">
                                                {result.addedParts.map((p: string, j: number) => <li key={j}>{p}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Feedback */}
                                    {result.feedback && (
                                        <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg p-2">{result.feedback}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Ni Comment — progressive load */}
            <div className="mt-6">
                <NiCommentSection evalReport={evalReport} storyCoverage={storyCoverage} />
            </div>

            {/* CTA Buttons */}
            <div className="mt-6">
                <EvalCTASection
                    sessionId={sessionId || 'demo'}
                    weaknesses={allWeaknesses}
                    lowCoverageStoryIds={storyCoverage.filter(c => c.coverageScore < 70).map(c => c.storyId)}
                    onGenerateChallenge={async () => setShowInlineChallenge(true)}
                    isChallengeVisible={showInlineChallenge}
                />
            </div>

            {/* Inline Challenge Card — slide down */}
            <InlineChallengeCard
                sessionId={sessionId || ''}
                isVisible={showInlineChallenge}
                onAccepted={() => setShowInlineChallenge(false)}
                onSkipped={() => setShowInlineChallenge(false)}
                evalReport={evalReport}
                scenario={fullSession?.scenario}
            />

            {/* Modals */}
            <MentorChatModal
                isOpen={isMentorOpen}
                onClose={() => setIsMentorOpen(false)}
                scenario={fullSession?.scenario}
                evaluationReport={evalReport}
            />
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
