'use client';

import { ArrowLeft, Home, Settings, Mic, FileText, Sparkles, Plus, UploadCloud, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'
import { useScenario } from '@/context/ScenarioContext'

export default function ContextBuilderPage() {
    const [userGoal, setUserGoal] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const { scenario, setScenario, setHistory, setAudioFileKeys } = useScenario()
    const router = useRouter()

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const topic = params.get('topic');
            if (topic) setUserGoal(topic);
        }
    }, []);

    const handleGenerateScenario = async () => {
        if (!userGoal.trim()) return;
        setIsGenerating(true)
        try {
            const result = await apiClient.setupScenario(userGoal)
            setScenario(result)
            setHistory([])
            setAudioFileKeys([])
        } catch (error) {
            console.error('Lỗi khi thiết lập kịch bản:', error)
            alert('Không thể tạo kịch bản. Vui lòng kiểm tra lại kết nối.')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] w-full font-sans">
            {/* Custom Setup Header */}
            <header className="flex flex-row items-center justify-between px-6 py-3 bg-[#0f172a] text-white">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
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

            <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 lg:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12">

                {/* Left Panel: Input Data */}
                <div className="flex-1 flex flex-col min-w-0">
                    <h1 className="text-2xl font-bold text-[#0f172a] mb-6">Dữ liệu đầu vào</h1>

                    <div className="bg-[#0f172a] rounded-3xl p-6 lg:p-8 flex-1 flex flex-col relative overflow-hidden text-white shadow-xl shadow-slate-200/50 border border-slate-200">
                        {/* Note: The design uses a dark blue theme for the input block */}

                        <div className="bg-white rounded-2xl p-4 lg:p-6 mb-6 shadow-sm border border-slate-100 flex flex-col min-h-[160px]">
                            <textarea
                                value={userGoal}
                                onChange={(e) => setUserGoal(e.target.value)}
                                placeholder="Nhập đề cương, nội dung chính hoặc ý tưởng thuyết trình tại đây... Ví dụ: Tôi muốn phỏng vấn Software Engineer bằng tiếng Việt."
                                className="w-full flex-1 resize-none bg-transparent outline-none text-slate-700 placeholder:text-slate-400 text-[15px] leading-relaxed"
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="flex justify-center mb-6 z-10 w-full relative">
                            <button
                                onClick={handleGenerateScenario}
                                disabled={isGenerating || !userGoal.trim()}
                                className="flex items-center justify-center gap-2 px-8 py-3 bg-[#0f172a] hover:bg-slate-800 text-teal-400 disabled:opacity-50 border-2 border-teal-500 rounded-full font-bold transition-all"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Đang phân tích cùng Gemini Brain (AI)...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        <span>Phân Tích Tạo Bối Cảnh</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex gap-4 mb-6 relative z-10 w-3/4 mx-auto justify-center">
                            <button className="flex items-center gap-2 px-6 py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-full font-medium transition-colors shadow-lg shadow-teal-500/20">
                                <Mic className="w-5 h-5" />
                                <span>Ghi âm</span>
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 bg-white text-slate-800 hover:bg-slate-50 rounded-full font-medium transition-colors shadow-lg shadow-black/5">
                                <FileText className="w-5 h-5" />
                                <span>Tài liệu</span>
                            </button>
                        </div>

                        {/* Drop zone area */}
                        <div className="flex-1 border-2 border-dashed border-slate-600/50 rounded-2xl flex flex-col items-center justify-center p-8 relative z-10 bg-slate-800/30 hover:bg-slate-800/50 transition-colors cursor-pointer group">

                            <div className="text-center z-10 flex flex-col items-center">
                                <UploadCloud className="w-8 h-8 text-teal-400 mb-3 group-hover:-translate-y-1 transition-transform" />
                                <p className="text-slate-300 text-sm max-w-[250px] leading-relaxed">
                                    Hoặc thả file Slide (PDF), ghi âm mẫu, hoặc note vào đây để Ni đọc
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Panel: Context Details */}
                <div className="flex-[1.2] flex flex-col min-w-0">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Bối cảnh giao tiếp</h1>

                    <div className="flex gap-6 relative flex-1">

                        {/* Main Context Card */}
                        <div className="flex-1 bg-white rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col text-[15px] leading-relaxed">
                            <div className="flex justify-end mb-4">
                                <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-200">
                                    <Sparkles className="w-4 h-4 text-teal-500" />
                                    <span>Ni gợi ý tiếp</span>
                                </button>
                            </div>

                            <div className="space-y-5 text-slate-700 flex-1">
                                {scenario ? (
                                    <>
                                        <div>
                                            <strong className="text-slate-900 block mb-1">Vai trò Đối phương (The Voice):</strong>
                                            <span className="text-sm">{scenario.scenario.interviewerPersona}</span>
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 block mb-1">Mục tiêu Đỉnh chóp để Đạt điểm Cao:</strong>
                                            <ul className="list-disc pl-5 text-sm space-y-1">
                                                {scenario.scenario.goals.map((goal, i) => <li key={i}>{goal}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 block mb-1">Khởi đầu (Câu chào mẫu The Voice):</strong>
                                            <div className="text-sm italic bg-slate-50 p-2 rounded border border-slate-100">
                                                {scenario.scenario.startingTurns[0]?.line}
                                            </div>
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 block mb-1">Danh mục Đánh giá (Analyst Agent sẽ soi):</strong>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {scenario.evalRules.categories.map((cat, i) => (
                                                    <span key={i} className="px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium border border-teal-100">
                                                        {cat.category}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                        <Sparkles className="w-8 h-8 opacity-50" />
                                        <p className="text-center text-sm">Chưa có kịch bản.<br />Hãy điền thông tin bên trái và bấm <b>Phân Tích</b>.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Suggestions Sidebar */}
                        <div className="w-[200px] shrink-0 flex flex-col relative">
                            <h3 className="text-sm font-bold text-slate-800 pt-2 mb-4">Gợi ý bổ sung</h3>
                            <div className="space-y-3">
                                {['Thêm nhân vật phản biện khó tính', 'Bối cảnh hội trường lớn', 'Khán giả là học sinh cấp 3'].map((hint, idx) => (
                                    <button
                                        key={idx}
                                        className="w-full bg-white p-3 pr-10 rounded-xl shadow-sm border border-slate-200 text-left text-[13px] text-slate-600 hover:border-teal-300 hover:shadow-md transition-all relative group"
                                    >
                                        <span className="line-clamp-3 leading-snug">{hint}</span>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Decorative line connecting panels */}
                            <div className="absolute top-[80px] -left-6 bottom-10 w-px bg-slate-200 hidden xl:block z-[-1]" />
                        </div>
                    </div>

                    <div className="mt-10 flex justify-center">
                        <button
                            disabled={!scenario}
                            onClick={() => router.push('/setup/confirm')}
                            className="px-10 py-3.5 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full font-bold shadow-lg shadow-teal-500/30 transition-all hover:scale-105 active:scale-95">
                            {scenario ? 'Xác nhận & Bắt đầu Luyện Tập' : 'Vui lòng Phân Tích Kịch Bản trước'}
                        </button>
                    </div>
                </div>

            </main>
        </div>
    )
}
