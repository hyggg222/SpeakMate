'use client'

import { ArrowLeft, Home, Settings, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function PresentationStudioPage() {
    const [isRecording, setIsRecording] = useState(false)
    const [time, setTime] = useState(0) // time in seconds

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isRecording) {
            interval = setInterval(() => {
                setTime(prev => prev + 1)
            }, 1000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isRecording])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const toggleRecording = () => {
        setIsRecording(!isRecording)
    }

    const resetRecording = () => {
        setIsRecording(false)
        setTime(0)
    }

    // Generate random heights for the waveform
    const generateWaveform = () => {
        const bars = []
        for (let i = 0; i < 60; i++) {
            // If recording, animate heights, otherwise static minimal
            const baseHeight = isRecording ? Math.random() * 80 + 20 : 10
            bars.push(
                <div
                    key={i}
                    className={`w-1.5 md:w-2 mx-[2px] rounded-full bg-teal-400 ${isRecording ? 'opacity-100 transition-all duration-150 ease-in-out' : 'opacity-40 transition-all duration-300'}`}
                    style={{
                        height: `${baseHeight}px`,
                        // Random delay for CSS animation effect if we were to use keyframes
                    }}
                />
            )
        }
        return bars
    }

    // We will use a periodic re-render to animate the waveform when recording
    const [waveKey, setWaveKey] = useState(0)
    useEffect(() => {
        let waveInterval: NodeJS.Timeout
        if (isRecording) {
            waveInterval = setInterval(() => {
                setWaveKey(prev => prev + 1)
            }, 100)
        }
        return () => {
            if (waveInterval) clearInterval(waveInterval)
        }
    }, [isRecording])


    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-white font-sans overflow-hidden relative">

            {/* Dark Topbar overlaying background */}
            <header className="flex flex-row items-center justify-between px-6 py-4 relative z-20">
                <div className="flex items-center gap-6">
                    <Link href="/setup/confirm" className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Quay lại</span>
                    </Link>
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

            {/* Faint glowing background blobs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-teal-500/10 blur-[150px] pointer-events-none z-0" />

            <main className="flex-1 flex flex-col justify-between relative z-10 w-full relative">

                {/* Timer Display */}
                <div className="flex flex-col items-center justify-center pt-20 pb-10">
                    <h1 className="text-7xl md:text-[100px] font-bold tracking-tight font-mono tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                        {formatTime(time)}
                    </h1>
                </div>

                {/* Center Waveform */}
                <div className="flex-1 flex items-center justify-center w-full min-h-[160px] relative px-4">
                    {/* Horizontal guideline */}
                    <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-slate-600/50 -translate-y-1/2" />

                    <div className="flex items-center justify-center relative z-10 h-full">
                        {generateWaveform()}
                    </div>
                </div>

                {/* Bottom Controls Area */}
                <div className="w-full flex justify-between items-end px-8 md:px-16 pb-12 relative">

                    {/* Left: Avatar Illustration */}
                    <div className="hidden md:block w-48 h-64 relative bottom-0">
                        {/* Note: Placeholder image. In PDF Ni is sitting with a notebook. */}
                        <Image
                            src="/ni-avatar.png"
                            alt="Ni Listening"
                            fill
                            className="object-contain object-bottom drop-shadow-2xl"
                            style={{ filter: 'contrast(1.1) brightness(0.9)' }}
                        />
                    </div>

                    {/* Center: Recording Controls */}
                    <div className="flex flex-col items-center flex-1">
                        <div className="flex items-center gap-12 md:gap-20">

                            {/* Reset Button */}
                            <button
                                onClick={resetRecording}
                                className="flex flex-col items-center gap-3 text-slate-400 hover:text-white transition-colors group"
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-800/50 border border-slate-700 group-hover:bg-slate-700/50 group-hover:border-slate-500 transition-all">
                                    <RotateCcw className="w-5 h-5" />
                                </div>
                            </button>

                            {/* Main Record/Pause Button */}
                            <button
                                onClick={toggleRecording}
                                className="relative flex items-center justify-center w-28 h-28 md:w-32 md:h-32 rounded-full group outline-none"
                            >
                                {/* Outer glowing ring */}
                                <div className={`absolute inset-0 rounded-full border-[3px] transition-all duration-300
                                    ${isRecording ? 'border-teal-400 scale-100 shadow-[0_0_30px_rgba(45,212,191,0.5)]' : 'border-teal-500/50 scale-95 group-hover:border-teal-400/80 group-hover:scale-100'}`}
                                />

                                {/* Inner circle */}
                                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full transition-all duration-300 flex items-center justify-center
                                    ${isRecording
                                        ? 'bg-transparent' // In design, when recording it's a hollow circle or displays pause icon, we'll keep it hollow hollow matching the PDF which shows a hollow ring
                                        : 'bg-teal-500/20 group-hover:bg-teal-500/30'}`}
                                >
                                    {!isRecording && (
                                        <div className="w-4 h-4 rounded-sm bg-teal-400 translate-x-0.5" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
                                    )}
                                    {isRecording && (
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-6 bg-teal-400 rounded-sm" />
                                            <div className="w-2 h-6 bg-teal-400 rounded-sm" />
                                        </div>
                                    )}
                                </div>
                            </button>

                            {/* Spacer to balance the layout if we needed symmetry, but for now just the reset on left is fine */}
                            <div className="w-12 md:w-12 invisible" />

                        </div>

                        {/* Helper Text */}
                        <p className="mt-8 text-sm text-slate-400 font-medium tracking-wide">
                            {isRecording ? "Đang ghi âm..." : "Nhấn để bắt đầu / tạm dừng bài nói"}
                        </p>
                    </div>

                    {/* Right: Complete Button */}
                    <div className="w-auto flex justify-end">
                        <Link
                            href="/practice/qa"
                            className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-full shadow-lg shadow-teal-500/20 transition-all uppercase tracking-wide whitespace-nowrap"
                        >
                            Hoàn thành
                        </Link>
                    </div>

                </div>

            </main>
        </div>
    )
}
