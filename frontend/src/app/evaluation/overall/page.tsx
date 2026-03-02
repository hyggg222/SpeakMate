'use client'

import { ArrowLeft, Home, Settings } from 'lucide-react'
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

const radarData = [
    { subject: 'Clarity', A: 85, fullMark: 100 },
    { subject: 'Confidence', A: 70, fullMark: 100 },
    { subject: 'Engagement', A: 60, fullMark: 100 },
    { subject: 'Timing', A: 80, fullMark: 100 },
]

export default function OverallEvaluationPage() {
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
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-slate-800">
                            <Image src="/ni-avatar.png" alt="User Profile" width={32} height={32} className="object-cover" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 max-w-[1400px] mx-auto w-full p-6 md:p-8 gap-8">

                {/* Fixed Sidebar for Navigation */}
                <aside className="w-64 shrink-0 flex flex-col gap-6">
                    <h3 className="font-bold text-slate-800 mb-2 px-2 border-b border-slate-200 pb-2">Phần nói</h3>
                    <nav className="flex flex-col gap-2">
                        <Link
                            href="/evaluation/overall"
                            className="bg-[#0b1325] text-white px-4 py-3 rounded-full text-sm font-medium shadow-md w-full text-center"
                        >
                            Đánh giá tổng
                        </Link>

                        <Link
                            href="/evaluation/detailed"
                            className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-full text-sm font-medium shadow-sm border border-slate-200 transition-colors flex flex-col items-start gap-0.5"
                        >
                            <span>Bài thuyết trình</span>
                            <span className="text-xs text-slate-400 font-normal">3:45 phút</span>
                        </Link>

                        <Link
                            href="/evaluation/qa1"
                            className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-full text-sm font-medium shadow-sm border border-slate-200 transition-colors flex flex-col items-start gap-0.5"
                        >
                            <span>Câu hỏi 1</span>
                            <span className="text-xs text-slate-400 font-normal">Về lý lẽ dự án?</span>
                        </Link>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col bg-transparent">

                    <h1 className="text-2xl font-bold text-slate-800 mb-6 font-serif">Đánh giá tổng buổi luyện tập</h1>

                    {/* Score and Comment Box */}
                    <div className="flex items-center gap-8 mb-6">
                        <div className="flex items-baseline gap-2 shrink-0">
                            <span className="text-[3.5rem] font-bold text-[#0b1325] leading-none">7.5</span>
                            <span className="text-2xl font-bold text-slate-400">/ 10</span>
                        </div>

                        <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-200 mt-1 shadow-sm">
                                <Image src="/ni-avatar.png" alt="Ni Mentor" width={48} height={48} className="object-cover" />
                            </div>
                            <div className="bg-slate-100/80 p-4 rounded-2xl rounded-tl-none border border-slate-200 w-full relative before:content-[''] before:absolute before:top-4 before:-left-2 before:w-4 before:h-4 before:bg-slate-100/80 before:rotate-45 before:border-l before:border-b before:border-slate-200">
                                <p className="text-[15px] font-medium text-slate-700 leading-relaxed">
                                    Nhìn chung, cấu trúc bài nói rõ ràng nhưng phần xử lý câu hỏi còn hơi lúng túng.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

                        {/* Radar Chart Section */}
                        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Tổng quan kỹ năng</h3>
                            <div className="flex-1 min-h-[250px] flex items-center justify-center -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
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

                        {/* Right Column Highlights / Strengths */}
                        <section className="flex flex-col gap-6">

                            {/* Highlights */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Điểm nổi bật</h3>
                                <ul className="flex flex-col gap-3">
                                    <li className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="w-3 h-3 rounded-full bg-teal-400 shrink-0" />
                                        <span className="text-[13px] font-medium text-slate-700">Bài thuyết trình – Mở bài rất thu hút.</span>
                                    </li>
                                    <li className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                                        <span className="text-[13px] font-medium text-slate-700">Câu hỏi 1 – Lý lẽ logic, ví dụ cụ thể.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Strengths / Improvements Split */}
                            <div className="grid grid-cols-2 gap-6 h-full">
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 className="text-base font-bold text-slate-800 mb-3">Điểm mạnh</h3>
                                    <ul className="list-disc pl-4 text-xs font-medium text-slate-600 space-y-2 marker:text-slate-400">
                                        <li>Cấu trúc bài nói rõ ràng, logic</li>
                                        <li>Sử dụng từ ngữ chính xác, tự tin trong phần thuyết trình</li>
                                        <li>Mở bài và kết bài ấn tượng</li>
                                    </ul>
                                </div>
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 className="text-base font-bold text-slate-800 mb-3">Cần cải thiện</h3>
                                    <ul className="list-disc pl-4 text-xs font-medium text-slate-600 space-y-2 marker:text-slate-400">
                                        <li>Cần xử lý các câu hỏi khó một cách bình tĩnh hơn</li>
                                        <li>Cải thiện độ tương tác và thu hút khi trả lời câu hỏi</li>
                                        <li>Chú ý nhịp độ và ngắt nghỉ trong phần trả lời</li>
                                    </ul>
                                </div>
                            </div>

                        </section>

                    </div>

                </main>
            </div>
        </div>
    )
}
