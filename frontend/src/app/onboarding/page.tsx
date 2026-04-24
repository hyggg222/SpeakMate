'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft } from 'lucide-react'

type Level = 'nervous' | 'okay' | 'confident'
type Goal = 'interview' | 'presentation' | 'meeting' | 'debate'

const LEVELS: { value: Level; label: string; desc: string; emoji: string }[] = [
    { value: 'nervous', label: 'Còn run', desc: 'Tôi hay hồi hộp, nói vấp khi giao tiếp chuyên nghiệp', emoji: '😅' },
    { value: 'okay', label: 'Ổn ổn', desc: 'Tôi giao tiếp được nhưng chưa tự tin, chưa rõ ràng', emoji: '🙂' },
    { value: 'confident', label: 'Khá tốt', desc: 'Tôi tự tin nhưng muốn nâng lên tầm cao hơn', emoji: '💪' },
]

const GOALS: { value: Goal; label: string; desc: string; emoji: string }[] = [
    { value: 'interview', label: 'Phỏng vấn', desc: 'Trả lời tự tin, rõ ràng, thuyết phục HR/tech lead', emoji: '💼' },
    { value: 'presentation', label: 'Thuyết trình', desc: 'Demo dự án, pitching ý tưởng trước nhóm hoặc khách hàng', emoji: '🎤' },
    { value: 'meeting', label: 'Họp nhóm', desc: 'Nêu quan điểm, phản biện, đóng góp trong cuộc họp', emoji: '🤝' },
    { value: 'debate', label: 'Tranh luận', desc: 'Lập luận sắc bén, bảo vệ quan điểm trước phản đối', emoji: '⚡' },
]

export default function OnboardingPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [name, setName] = useState('')
    const [level, setLevel] = useState<Level | null>(null)
    const [goal, setGoal] = useState<Goal | null>(null)

    const handleComplete = () => {
        try {
            localStorage.setItem('speakmate_onboarding', JSON.stringify({
                name: name.trim() || 'Bạn',
                level: level || 'okay',
                goal: goal || 'interview',
                completedAt: new Date().toISOString(),
            }))
            if (name.trim()) localStorage.setItem('speakmate_username', name.trim())
        } catch {
            // localStorage unavailable — skip silently
        }
        router.push('/')
    }

    const canNext = step === 1 ? true : step === 2 ? !!level : !!goal

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
            style={{ background: 'linear-gradient(135deg, #0b1325 0%, #0f2744 50%, #0b1325 100%)' }}>

            {/* Progress dots */}
            <div className="flex items-center gap-2 mb-10">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`rounded-full transition-all duration-300 ${
                        i === step ? 'w-6 h-2.5 bg-teal-400' :
                        i < step ? 'w-2.5 h-2.5 bg-teal-600' :
                        'w-2.5 h-2.5 bg-slate-700'
                    }`} />
                ))}
            </div>

            {/* Card */}
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

                {/* Step 1: Name */}
                {step === 1 && (
                    <div className="p-8">
                        <div className="text-4xl mb-4 text-center">👋</div>
                        <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">Chào mừng đến SpeakMate!</h1>
                        <p className="text-slate-500 text-center text-sm mb-2 leading-relaxed">
                            Nền tảng luyện kỹ năng giao tiếp cho người trẻ công nghệ
                        </p>
                        <p className="text-slate-400 text-center text-sm mb-8">Bạn muốn Ni gọi bạn là gì?</p>

                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && setStep(2)}
                            placeholder="Tên của bạn..."
                            autoFocus
                            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-400 focus:outline-none text-slate-800 text-base font-medium transition-colors"
                        />
                        <p className="text-xs text-slate-400 text-center mt-3">
                            Bỏ trống nếu muốn Ni gọi là "Bạn"
                        </p>
                    </div>
                )}

                {/* Step 2: Current level */}
                {step === 2 && (
                    <div className="p-8">
                        <h1 className="text-xl font-bold text-slate-800 text-center mb-1">
                            {name.trim() || 'Bạn'} đang ở đâu?
                        </h1>
                        <p className="text-slate-500 text-center text-sm mb-6">
                            Mức độ tự tin khi giao tiếp chuyên nghiệp hiện tại
                        </p>

                        <div className="flex flex-col gap-3">
                            {LEVELS.map(l => (
                                <button
                                    key={l.value}
                                    onClick={() => setLevel(l.value)}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                                        level === l.value
                                            ? 'border-teal-400 bg-teal-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="text-2xl">{l.emoji}</span>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800 text-sm">{l.label}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{l.desc}</p>
                                    </div>
                                    {level === l.value && (
                                        <div className="w-5 h-5 rounded-full bg-teal-400 flex items-center justify-center shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Goal */}
                {step === 3 && (
                    <div className="p-8">
                        <h1 className="text-xl font-bold text-slate-800 text-center mb-1">Muốn cải thiện điều gì?</h1>
                        <p className="text-slate-500 text-center text-sm mb-6">
                            Ni sẽ thiết kế bài luyện phù hợp với bạn
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            {GOALS.map(g => (
                                <button
                                    key={g.value}
                                    onClick={() => setGoal(g.value)}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all ${
                                        goal === g.value
                                            ? 'border-teal-400 bg-teal-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="text-2xl">{g.emoji}</span>
                                    <p className="font-semibold text-slate-800 text-sm">{g.label}</p>
                                    <p className="text-[11px] text-slate-500 leading-snug">{g.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="px-8 pb-8 flex items-center justify-between gap-3">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(s => s - 1)}
                            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            <ChevronLeft size={16} /> Quay lại
                        </button>
                    ) : (
                        <div />
                    )}

                    {step < 3 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all"
                            style={{ backgroundColor: 'var(--teal, #14b8a6)' }}
                        >
                            Tiếp theo <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={!canNext}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-40"
                            style={{ backgroundColor: 'var(--teal, #14b8a6)' }}
                        >
                            Bắt đầu thôi! 🎉
                        </button>
                    )}
                </div>
            </div>

            <p className="text-slate-600 text-xs mt-8 text-center">
                Bạn có thể thay đổi thông tin này trong Cài đặt bất kỳ lúc nào
            </p>
        </div>
    )
}
