'use client'

import { ArrowLeft, Home, Settings, Edit3, Plus, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useScenario } from '@/context/ScenarioContext'

export default function ContextConfirmationPage() {
    const { scenario } = useScenario()
    const router = useRouter()

    useEffect(() => {
        if (!scenario) {
            router.push('/setup')
        }
    }, [scenario, router])

    if (!scenario) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] w-full font-sans">
            {/* Header */}
            <header className="flex flex-row items-center justify-between px-6 py-3 bg-[#0f172a] text-white">
                <div className="flex items-center gap-6">
                    <Link href="/setup" className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Quay lại</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                        <Home className="w-4 h-4" />
                        <span className="text-sm font-medium">Trang chủ</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Mentor Ni</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-slate-800">
                            <Image src="/ni-avatar.png" alt="Mentor Ni" width={32} height={32} className="object-cover" />
                        </div>
                    </div>
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <Settings className="w-5 h-5 text-slate-300" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-[1200px] w-full mx-auto p-6 lg:py-16 flex flex-col items-center">

                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">Xác nhận bối cảnh thuyết trình</h1>
                    <p className="text-slate-500 font-medium">Đây là bối cảnh mà chúng ta sẽ dùng trong buổi luyện tập sắp tới. Hãy kiểm tra lại một lần nữa nhé.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-6 lg:gap-10 w-full max-w-[1100px] items-start justify-center mt-4">

                    {/* Left: Ni Mascot */}
                    <div className="hidden md:flex flex-col w-[260px] shrink-0 pt-2 lg:pt-6">
                        <div className="bg-white p-4 rounded-2xl rounded-br-none shadow-sm border border-slate-100 relative mb-4 text-[14px] leading-relaxed font-medium text-slate-700 z-10">
                            Đây là bối cảnh hiện tại. Nếu mọi thứ ổn rồi, chúng ta vào phòng luyện tập nhé!
                            <div className="absolute -bottom-[10px] right-4 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent z-10" />
                            <div className="absolute -bottom-[11px] right-[15px] w-0 h-0 border-t-[11px] border-t-slate-100 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent z-0" />
                        </div>
                        <div className="flex justify-end pr-2">
                            <Image src="/ni-avatar.png" alt="Ni Avatar" width={180} height={180} className="object-cover rounded-full shadow-lg border-4 border-[#f8fafc]" />
                        </div>
                    </div>

                    {/* Center: Context Card */}
                    <div className="flex flex-col w-full max-w-xl shrink-0 relative">
                        <div className="absolute -top-4 right-4 z-10">
                            <Link href="/setup" className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg shadow-md border border-slate-100 font-medium text-sm hover:text-teal-600 transition-colors">
                                <Edit3 className="w-4 h-4" />
                                <span>Chỉnh sửa bối cảnh</span>
                            </Link>
                        </div>

                        <div className="bg-white rounded-3xl p-8 pt-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col text-[15px] leading-relaxed relative z-0">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">{scenario.scenario.scenarioName}</h2>
                            <div className="space-y-5 text-slate-700 flex-1">
                                <div>
                                    <strong className="text-slate-900 block mb-1">Vai trò đối phương (The Voice):</strong>
                                    <p className="text-sm text-slate-600">{scenario.scenario.interviewerPersona}</p>
                                </div>
                                <div>
                                    <strong className="text-slate-900 block mb-1">Mục tiêu luyện tập:</strong>
                                    <ul className="list-disc pl-5 text-sm space-y-1 text-slate-600">
                                        {scenario.scenario.goals.map((g, i) => <li key={i}>{g}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <strong className="text-slate-900 block mb-1">Câu mở đầu của Đối phương:</strong>
                                    <p className="text-sm italic bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600">
                                        &ldquo;{scenario.scenario.startingTurns[0]?.line}&rdquo;
                                    </p>
                                </div>
                                <div>
                                    <strong className="text-slate-900 block mb-1">Tiêu chí đánh giá:</strong>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {scenario.evalRules.categories.map((cat, i) => (
                                            <span key={i} className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-100">
                                                {cat.category}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-12 flex flex-col items-center gap-4">
                            <Link
                                href="/practice/conversation"
                                className="w-full max-w-sm text-center py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-full font-bold shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-wide"
                            >
                                Vào phòng luyện tập
                            </Link>
                            <Link href="/setup" className="text-slate-500 font-medium text-sm hover:text-slate-800 underline underline-offset-4 transition-colors">
                                Quay lại chỉnh bối cảnh
                            </Link>
                        </div>
                    </div>

                    {/* Right: Gợi ý */}
                    <div className="hidden xl:flex flex-col w-[240px] shrink-0 pt-[80px]">
                        <h3 className="text-sm font-bold text-slate-800 mb-4">Gợi ý cuối cùng</h3>
                        <div className="space-y-3">
                            {['Thêm áp lực về thời gian', 'Khán giả đông hơn dự kiến'].map((hint, idx) => (
                                <button key={idx} className="w-full bg-white p-3 pr-10 rounded-xl shadow-sm border border-slate-200 text-left text-[13px] text-slate-600 hover:border-teal-300 hover:shadow-md transition-all relative group">
                                    <span className="line-clamp-2 leading-snug">{hint}</span>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

            </main>
        </div>
    )
}
