'use client'

import { ArrowLeft, Home, Settings, RotateCcw, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { useScenario } from '@/context/ScenarioContext'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

export default function PresentationStudioPage() {
    const router = useRouter()
    const { scenario, history, setHistory, audioFileKeys, setAudioFileKeys } = useScenario()
    const { isRecording, startRecording, stopRecording } = useAudioRecorder()

    const [time, setTime] = useState(0) // time in seconds
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Accumulated audio blobs across pause/resume cycles (Stage Mode = one long monologue)
    const collectedBlobs = useRef<Blob[]>([])

    // Redirect to setup if no scenario is loaded
    useEffect(() => {
        if (!scenario) {
            router.push('/setup')
        }
    }, [scenario, router])

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

    const toggleRecording = useCallback(async () => {
        if (isSubmitting) return

        if (isRecording) {
            // Pause: stop the current recording segment and collect the blob
            const audioBlob = await stopRecording()
            if (audioBlob) {
                collectedBlobs.current.push(audioBlob)
            }
        } else {
            // Start/resume recording
            await startRecording()
        }
    }, [isRecording, isSubmitting, startRecording, stopRecording])

    const resetRecording = useCallback(async () => {
        if (isSubmitting) return

        if (isRecording) {
            await stopRecording() // discard the current segment
        }
        collectedBlobs.current = []
        setTime(0)
    }, [isRecording, isSubmitting, stopRecording])

    const handleComplete = useCallback(async () => {
        if (isSubmitting) return

        // Stop recording if currently active and collect the final segment
        if (isRecording) {
            const audioBlob = await stopRecording()
            if (audioBlob) {
                collectedBlobs.current.push(audioBlob)
            }
        }

        // Check that we have audio to send
        if (collectedBlobs.current.length === 0) {
            alert('Bạn chưa ghi âm gì. Hãy nhấn nút ghi âm trước khi hoàn thành.')
            return
        }

        setIsSubmitting(true)

        try {
            // Merge all collected blobs into a single blob
            const mimeType = collectedBlobs.current[0]?.type || 'audio/webm'
            const mergedBlob = new Blob(collectedBlobs.current, { type: mimeType })

            // Send the complete monologue to backend
            const result = await apiClient.interactAudio(mergedBlob, scenario?.scenario, history)

            // Store the response in context
            const updatedHistory = [
                ...history,
                { speaker: 'User', line: result.userTranscript },
                { speaker: 'AI', line: result.botResponse },
            ]
            setHistory(updatedHistory)

            if (result.audioUploadedKey) {
                setAudioFileKeys([...audioFileKeys, result.audioUploadedKey])
            }

            // Navigate to Q&A / evaluation page
            router.push('/practice/qa')
        } catch (error) {
            console.error('Lỗi khi gửi bài nói:', error)
            alert('Có lỗi xảy ra khi gửi bài nói. Vui lòng thử lại.')
        } finally {
            setIsSubmitting(false)
        }
    }, [isRecording, isSubmitting, stopRecording, scenario, history, setHistory, audioFileKeys, setAudioFileKeys, router])

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
                                disabled={isSubmitting}
                                className="flex flex-col items-center gap-3 text-slate-400 hover:text-white transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-800/50 border border-slate-700 group-hover:bg-slate-700/50 group-hover:border-slate-500 transition-all">
                                    <RotateCcw className="w-5 h-5" />
                                </div>
                            </button>

                            {/* Main Record/Pause Button */}
                            <button
                                onClick={toggleRecording}
                                disabled={isSubmitting}
                                className="relative flex items-center justify-center w-28 h-28 md:w-32 md:h-32 rounded-full group outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                            {isSubmitting ? "Đang xử lý bài nói..." : isRecording ? "Đang ghi âm..." : "Nhấn để bắt đầu / tạm dừng bài nói"}
                        </p>
                    </div>

                    {/* Right: Complete Button */}
                    <div className="w-auto flex justify-end">
                        <button
                            onClick={handleComplete}
                            disabled={isSubmitting}
                            className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-full shadow-lg shadow-teal-500/20 transition-all uppercase tracking-wide whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Hoàn thành
                        </button>
                    </div>

                </div>

            </main>
        </div>
    )
}
