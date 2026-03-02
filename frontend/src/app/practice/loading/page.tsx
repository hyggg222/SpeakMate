'use client'

import { Lightbulb } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoadingTransitionPage() {
    const router = useRouter()
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        // Simulate a loading progression
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer)
                    setTimeout(() => router.push('/practice/studio'), 500) // Navigate when done
                    return 100
                }
                return prev + 1
            })
        }, 30) // 100 * 30ms = 3 seconds to complete

        return () => clearInterval(timer)
    }, [router])

    return (
        <div className="flex flex-col min-h-screen bg-[#0b1325] text-white font-sans relative overflow-hidden">

            {/* Background glowing effects to simulate high-tech room */}
            <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-teal-900/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />

            <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 md:p-12 flex flex-col items-center justify-between relative z-10 h-screen">

                {/* Top Tips Card */}
                <div className="w-full flex justify-end animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-sm border border-slate-100/50">
                        <div className="flex items-center gap-2 mb-2">
                            {/* Lightbulb in design has a glowing yellow aura */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-yellow-400 blur-md opacity-40 rounded-full" />
                                <Lightbulb className="w-5 h-5 text-yellow-500 fill-yellow-400 relative z-10" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-[15px]">Tips nhanh của Ni</h3>
                        </div>
                        <p className="text-[13px] text-slate-600 font-medium leading-relaxed pl-7">
                            Mẹo nhỏ: Khoảng lặng (Pause) trước một con số quan trọng sẽ giúp khán giả nhớ lâu hơn gấp 2 lần.
                        </p>
                    </div>
                </div>

                {/* Central Illustration Area */}
                <div className="flex-1 flex items-center justify-center w-full relative my-10 animate-in zoom-in-95 duration-1000 delay-150">
                    {/* Placeholder for the complex illustration from PDF */}
                    <div className="w-[400px] h-[400px] relative mt-16">
                        {/* Glow behind the avatar to simulate the screen glare */}
                        <div className="absolute inset-x-10 bottom-0 h-3/4 bg-teal-400/10 blur-3xl rounded-full" />

                        <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/5 bg-slate-900/50 backdrop-blur-sm shadow-2xl p-4 flex flex-col items-center justify-end">
                            <div className="w-48 h-48 relative z-10 rounded-full overflow-hidden border-2 border-slate-800 mb-4 shadow-xl">
                                <Image
                                    src="/ni-avatar.png"
                                    alt="Ni Avatar Loading"
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {/* Simulate a floating 3D screen element */}
                            <div className="w-64 h-24 bg-teal-900/40 border border-teal-500/30 rounded-xl mb-4 backdrop-blur-md relative transform -skew-x-12 -skew-y-3 z-0 flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.2)]">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse delay-75" />
                                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse delay-150" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Loading Progress Bar */}
                <div className="w-full max-w-4xl pb-8 animate-in slide-in-from-bottom-8 duration-700 delay-300">
                    <div className="relative h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden mb-5 backdrop-blur-sm">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(45,212,191,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Status Labels */}
                    <div className="grid grid-cols-3 gap-4 w-full">
                        <div className={`text-xs md:text-sm font-medium transition-opacity duration-300 ${progress >= 0 ? 'text-teal-400' : 'text-slate-500'}`}>
                            Đang tải file âm thanh...
                        </div>
                        <div className={`text-xs md:text-sm font-medium text-center transition-opacity duration-300 ${progress > 33 ? 'text-teal-400' : 'text-slate-500'}`}>
                            Đang phân tích ngữ điệu và cảm xúc...
                        </div>
                        <div className={`text-xs md:text-sm font-medium text-right transition-opacity duration-300 ${progress > 66 ? 'text-teal-400' : 'text-slate-500'}`}>
                            Đang chấm điểm logic và cấu trúc...
                        </div>
                    </div>
                </div>

            </main>
        </div>
    )
}
