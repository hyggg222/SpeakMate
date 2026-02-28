'use client'

import { ArrowLeft, Home, Settings, Play, Volume2, Info } from 'lucide-react'
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
import { useState, useEffect } from 'react'

const radarData = [
    { subject: 'Clarity\nSự rõ ràng', A: 90, fullMark: 100 },
    { subject: 'Confidence\nSự tự tin', A: 85, fullMark: 100 },
    { subject: 'Engagement\nSự lôi cuốn', A: 65, fullMark: 100 },
    { subject: 'Timing\nThời gian', A: 80, fullMark: 100 },
]

export default function DetailedEvaluationPage() {

    const [waveformHeights, setWaveformHeights] = useState<number[]>([])

    useEffect(() => {
        const heights = []
        for (let i = 0; i < 60; i++) {
            let height = 10 + Math.random() * 40
            if (i > 25 && i < 35) height = 15 // dip
            if (i > 40 && i < 50) height = 60 // spike
            heights.push(height)
        }
        setWaveformHeights(heights)
    }, [])

    // Fake waveform bars
    const generateStaticWaveform = () => {
        if (waveformHeights.length === 0) return null;

        const bars = []
        for (let i = 0; i < 60; i++) {
            let height = waveformHeights[i]

            // Highlight a section in red or orange
            let color = 'bg-teal-400'
            if (i > 28 && i < 32) color = 'bg-red-400' // error zone

            bars.push(
                <div
                    key={i}
                    className={`w-1 md:w-1.5 mx-[1px] md:mx-[2px] rounded-full ${color}`}
                    style={{ height: `${height}px` }}
                />
            )
        }
        return bars
    }

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
                            <Image src="/ni-avatar.png" alt="Mentor Ni" width={32} height={32} className="object-cover" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 max-w-[1400px] mx-auto w-full p-6 md:p-8 gap-8 relative">

                {/* Fixed Sidebar for Navigation */}
                <aside className="w-64 shrink-0 flex flex-col gap-6">
                    <h3 className="font-bold text-slate-800 mb-2 px-2 border-b border-slate-200 pb-2">Phần nói</h3>
                    <nav className="flex flex-col gap-2">
                        <Link
                            href="/evaluation/overall"
                            className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-full text-sm font-medium shadow-sm border border-slate-200 transition-colors w-full text-center"
                        >
                            Đánh giá tổng
                        </Link>

                        <Link
                            href="/evaluation/detailed"
                            className="bg-[#0b1325] text-white px-4 py-3 rounded-full text-sm font-medium shadow-md transition-colors flex flex-col items-start gap-0.5"
                        >
                            <span>Bài thuyết trình</span>
                        </Link>

                        <Link
                            href="/evaluation/qa1"
                            className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-full text-sm font-medium shadow-sm border border-slate-200 transition-colors flex flex-col items-start gap-0.5"
                        >
                            <span>Câu hỏi 1</span>
                        </Link>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col pb-20">

                    <h1 className="text-2xl font-bold text-slate-800 mb-6 font-serif">Bài thuyết trình</h1>

                    {/* Score and Comment Box */}
                    <div className="flex items-center gap-8 mb-6">
                        <div className="flex items-baseline gap-2 shrink-0">
                            <span className="text-[3.5rem] font-bold text-teal-600 leading-none">8.0</span>
                            <span className="text-2xl font-bold text-slate-400">/ 10</span>
                        </div>

                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-sm self-end mb-1">
                                <Image src="/ni-avatar.png" alt="Ni Mentor" width={48} height={48} className="object-cover" />
                            </div>
                            <div className="bg-slate-100/80 p-4 rounded-3xl rounded-bl-none border border-slate-200 shadow-sm relative before:content-[''] before:absolute before:-bottom-2 before:-left-2 before:w-6 before:h-6 before:bg-slate-100/80 before:-rotate-45 before:border-l before:border-b before:border-slate-200">
                                <p className="text-[15px] font-medium text-slate-700 leading-relaxed z-10 relative">
                                    Phần trình bày chính có nhịp độ tốt nhưng phần kết còn hơi đột ngột.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Top Analysis Grid (Radar + Waveform) */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-stretch mb-8">

                        {/* Radar Chart Section */}
                        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Biểu đồ phân tích</h3>
                            <div className="flex-1 min-h-[220px] flex items-center justify-center -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} />
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

                        {/* Waveform / Timeline Analysis Section */}
                        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col relative">
                            <h3 className="text-lg font-bold text-slate-800 mb-8">Phân tích theo dòng thời gian</h3>

                            {/* Waveform graphic area */}
                            <div className="relative flex-1 flex flex-col justify-center min-h-[120px] mb-6">
                                {/* Center horizontal line */}
                                <div className="absolute top-1/2 left-0 w-full border-t border-slate-300" />

                                {/* Flags positioned absolutely above the timeline */}
                                <div className="absolute top-0 w-full h-full flex items-center px-4">
                                    {/* Flag 1 */}
                                    <div className="absolute left-[20%] -top-4 flex flex-col items-center">
                                        <div className="w-4 h-5 bg-red-500 rounded-sm shadow-md" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%)' }} />
                                        <div className="w-0.5 h-6 bg-red-500/50" />
                                    </div>
                                    {/* Flag 2 with Tooltip */}
                                    <div className="absolute left-[50%] -top-4 flex flex-col items-center z-10">
                                        <div className="w-4 h-5 bg-amber-500 rounded-sm shadow-md" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%)' }} />
                                        <div className="w-0.5 h-full min-h-[80px] bg-amber-500/50 absolute top-5 -z-10" />

                                        {/* Popover/Tooltip */}
                                        <div className="absolute top-full mt-14 -translate-x-1/2 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-3 flex gap-3">
                                            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5">
                                                <Image src="/ni-avatar.png" alt="Ni Mentor" width={24} height={24} className="object-cover" />
                                            </div>
                                            <p className="text-[11px] text-slate-700 leading-tight font-medium">
                                                Đoạn này lặp từ "kiểu như" 3 lần liên tiếp, nên thay bằng câu ngắn gọn hơn.
                                            </p>
                                        </div>
                                    </div>
                                    {/* Flag 3 */}
                                    <div className="absolute right-[15%] -top-4 flex flex-col items-center">
                                        <div className="w-4 h-5 bg-red-500 rounded-sm shadow-md" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%)' }} />
                                        <div className="w-0.5 h-6 bg-red-500/50" />
                                    </div>
                                </div>

                                {/* Actual Waveform */}
                                <div className="flex items-center justify-between px-4 z-0 relative mt-4 h-20">
                                    {generateStaticWaveform()}
                                </div>
                            </div>

                            {/* Playback controls */}
                            <div className="flex items-center justify-center gap-4 text-slate-500">
                                <span className="text-xs font-mono font-medium">01:13</span>
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors">
                                    <Play className="w-4 h-4 ml-0.5 text-slate-700" />
                                </div>
                                <span className="text-xs font-mono font-medium">03:45</span>
                            </div>

                        </section>
                    </div>

                    {/* Transcript Comparison Section */}
                    <section className="bg-white rounded-2xl p-0 border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                            <h3 className="text-lg font-bold text-slate-800">Ni sửa bài giúp bạn</h3>
                        </div>

                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">

                            {/* Left: What the user said */}
                            <div className="flex-1 p-6 lg:p-8">
                                <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">Bạn nói</h4>
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100/50 leading-relaxed text-sm md:text-base text-slate-600">
                                    <p>
                                        <span className="bg-red-100/50 underline decoration-red-300 decoration-wavy underline-offset-4 font-medium text-slate-800 px-1 rounded">Ừm, hôm nay tôi muốn nói về một chủ đề khá là thú vị, đó là kiểu như...</span>
                                        {' '}sự phát triển của công nghệ AI và <span className="underline decoration-slate-300 underline-offset-4">nó ảnh hưởng tới</span> cuộc sống của chúng ta.
                                    </p>
                                </div>
                            </div>

                            {/* Right: What Ni suggests */}
                            <div className="flex-1 p-6 lg:p-8 flex flex-col bg-[#f0fdfa]/30">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-teal-700 text-sm uppercase tracking-wide">Ni gợi ý</h4>
                                    <div className="text-amber-400">
                                        <span className="text-xs font-bold px-2 py-1 bg-amber-50 rounded-md border border-amber-100">★ Tốt hơn</span>
                                    </div>
                                </div>

                                <div className="bg-teal-50/50 rounded-xl p-5 border border-teal-100/50 leading-relaxed text-sm md:text-base text-slate-700 flex-1">
                                    <p>
                                        Hôm nay, tôi <span className="bg-teal-100/80 font-semibold px-1 py-0.5 rounded text-teal-900 border-b-2 border-teal-400">sẽ trình bày về một chủ đề thú vị:</span> sự phát triển của công nghệ AI và <span className="bg-teal-100/80 font-semibold px-1 py-0.5 rounded text-teal-900 border-b-2 border-teal-400">tác động của nó đến</span> cuộc sống của chúng ta.
                                    </p>
                                </div>

                                <div className="mt-4 self-end">
                                    <button className="flex items-center gap-2 px-4 py-2.5 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-full text-xs font-bold transition-colors">
                                        <Volume2 className="w-4 h-4" />
                                        Nghe thử giọng AI
                                    </button>
                                </div>
                            </div>

                        </div>
                    </section>

                </main>

            </div>
        </div>
    )
}
