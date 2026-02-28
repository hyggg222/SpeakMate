'use client'

import { ArrowLeft, Home, Settings, Mic, Lightbulb } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PresentationQAScreen() {
    const router = useRouter()
    const [timeLeft, setTimeLeft] = useState(45)
    const [isPrepTime, setIsPrepTime] = useState(true)

    // Countdown logic
    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setInterval(() => {
                setTimeLeft(prev => prev - 1)
            }, 1000)
            return () => clearInterval(timerId)
        } else if (isPrepTime) {
            // Once prep time is done, you might automatically switch to answering mode
            // Here we just keep it simple
            setIsPrepTime(false)
            setTimeLeft(60) // e.g. 60 seconds to answer
        }
    }, [timeLeft, isPrepTime])

    // Calculate circular progress dashoffset
    const totalTime = isPrepTime ? 45 : 60
    const progress = timeLeft / totalTime
    const circumference = 2 * Math.PI * 120 // r = 120
    const dashoffset = circumference * (1 - progress)

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-white font-sans overflow-hidden relative">

            {/* Dark Topbar */}
            <header className="flex flex-row items-center justify-between px-6 py-4 relative z-20">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Quay lại</span>
                    </button>
                    <Link href="/" className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white">
                        <Home className="w-4 h-4" />
                        <span className="text-sm font-medium">Trang chủ</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-300">Mentor Ni</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-slate-800">
                            <Image src="/ni-avatar.png" alt="Mentor Ni" width={32} height={32} className="object-cover" />
                        </div>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Glowing background enhancements */}
            <div className="absolute left-1/4 top-1/4 w-[500px] h-[500px] bg-slate-800/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute right-1/4 bottom-1/4 w-[400px] h-[400px] bg-teal-900/10 rounded-full blur-[100px] pointer-events-none" />

            <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 md:p-12 flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-24 relative z-10 h-full">

                {/* Left Side: Question and Tips */}
                <div className="flex-[1.2] flex flex-col relative w-full h-full justify-center pb-20">
                    <h2 className="text-xl text-slate-300 font-medium mb-6">Câu hỏi cho bài thuyết trình</h2>

                    {/* Question Card */}
                    <div className="bg-slate-900 rounded-3xl p-8 lg:p-12 border border-slate-800 shadow-2xl relative mb-16">
                        <div className="absolute top-6 right-8 text-teal-400 font-medium text-sm">
                            Câu hỏi 1 / 2
                        </div>
                        <h1 className="text-2xl md:text-3xl text-white font-bold leading-relaxed mt-4">
                            Câu hỏi 1: Tại sao dự án này lại thực sự cần thiết trong bối cảnh hiện tại?
                        </h1>
                    </div>

                    {/* Avatar and Tips */}
                    <div className="flex items-start absolute -bottom-10 right-20">
                        {/* Avatar illustration (Sitting) */}
                        <div className="w-40 h-52 relative -mb-6 mr-6 z-10">
                            <Image
                                src="/ni-avatar.png"
                                alt="Ni Mentor"
                                fill
                                className="object-cover object-top drop-shadow-2xl rounded-xl border border-slate-800/50"
                            />
                        </div>

                        {/* Speech Bubble / Tips Card */}
                        <div className="bg-white/95 backdrop-blur-sm p-5 rounded-2xl rounded-bl-none shadow-xl border border-slate-200 mt-10 max-w-[280px] relative">
                            {/* Speech bubble pointer */}
                            <div className="absolute bottom-4 -left-[12px] w-0 h-0 border-t-[12px] border-t-white/95 border-l-[12px] border-l-transparent border-b-[0px] border-b-transparent z-10" />

                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
                                <h3 className="font-bold text-slate-800 text-sm">Tips nhanh của Ni</h3>
                            </div>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                Hãy dành vài giây để nhắc lại ý chính của bài thuyết trình trước khi đi vào trả lời chi tiết.
                            </p>
                        </div>
                    </div>

                    {/* Bottom Left: Skip Button */}
                    <div className="absolute bottom-4 left-0">
                        <Link href="/evaluation/overall" className="px-8 py-2.5 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all font-medium inline-block">
                            Bỏ qua
                        </Link>
                    </div>
                </div>

                {/* Right Side: Circular Timer and Next Button */}
                <div className="flex-[0.8] flex flex-col items-center justify-center relative w-full pb-20 pt-10">

                    {/* Central Mic Button (positioned in center of the whole screen bottom, but flex makes it easier here or absolute) */}
                    <div className="absolute bottom-10 -left-[14rem] hidden xl:flex">
                        <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-lg text-teal-400">
                            <Mic className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="flex flex-col items-center mb-16 relative">
                        <h3 className="text-slate-400 text-lg mb-6 font-medium">Thời gian {isPrepTime ? "chuẩn bị" : "trả lời"}</h3>

                        {/* Circular Progress Timer */}
                        <div className="relative w-64 h-64 md:w-[300px] md:h-[300px] flex items-center justify-center">
                            {/* SVG Ring */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                                {/* Track */}
                                <circle
                                    cx="50%" cy="50%" r="120"
                                    className="stroke-slate-800"
                                    strokeWidth="8" fill="none"
                                />
                                {/* Progress */}
                                <circle
                                    cx="50%" cy="50%" r="120"
                                    className="stroke-teal-400 transition-all duration-1000 ease-linear"
                                    strokeWidth="8" fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={dashoffset}
                                />
                            </svg>

                            {/* Glow behind text */}
                            <div className="absolute inset-0 bg-teal-500/5 rounded-full blur-2xl" />

                            {/* Time Text */}
                            <div className="text-6xl md:text-7xl font-bold font-mono tracking-tighter text-teal-400 drop-shadow-md relative z-10 transition-colors">
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        {/* Status Label (Pill) */}
                        <div className="absolute -bottom-6 px-6 py-2 bg-slate-800/80 border border-slate-700/50 text-amber-500 rounded-full text-sm font-medium shadow-lg backdrop-blur-md">
                            Thời gian chuẩn bị
                        </div>
                    </div>

                    <div className="flex flex-col items-center absolute bottom-10 right-0">
                        <Link
                            href="/evaluation/overall"
                            className="px-16 py-4 bg-teal-500 hover:bg-teal-400 text-white font-bold text-lg rounded-full shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] transition-all tracking-wide mb-3"
                        >
                            Tiếp tục
                        </Link>
                        <p className="text-xs text-slate-500 font-medium">
                            Nhấn 'Tiếp tục' khi bạn đã trả lời xong câu hỏi này.
                        </p>
                    </div>

                </div>
            </main>
        </div>
    )
}
