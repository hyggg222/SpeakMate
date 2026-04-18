'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

type Level = 'nervous' | 'okay' | 'confident'
type Goal = 'interview' | 'presentation' | 'meeting' | 'debate'

export default function OnboardingPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [step, setStep] = useState(1)
    const [name, setName] = useState('')
    const [level, setLevel] = useState<Level | null>(null)
    const [goal, setGoal] = useState<Goal | null>(null)

    const LEVELS: { value: Level; label: string; desc: string; emoji: string }[] = [
        { value: 'nervous', label: t('onboarding.level.nervous'), desc: t('onboarding.level.nervous.desc'), emoji: '😅' },
        { value: 'okay', label: t('onboarding.level.okay'), desc: t('onboarding.level.okay.desc'), emoji: '🙂' },
        { value: 'confident', label: t('onboarding.level.confident'), desc: t('onboarding.level.confident.desc'), emoji: '💪' },
    ]

    const GOALS: { value: Goal; label: string; desc: string; emoji: string }[] = [
        { value: 'interview', label: t('onboarding.goal.interview'), desc: t('onboarding.goal.interview.desc'), emoji: '💼' },
        { value: 'presentation', label: t('onboarding.goal.presentation'), desc: t('onboarding.goal.presentation.desc'), emoji: '🎤' },
        { value: 'meeting', label: t('onboarding.goal.meeting'), desc: t('onboarding.goal.meeting.desc'), emoji: '🤝' },
        { value: 'debate', label: t('onboarding.goal.debate'), desc: t('onboarding.goal.debate.desc'), emoji: '⚡' },
    ]

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
                        <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">{t('onboarding.welcome')}!</h1>
                        <p className="text-slate-500 text-center text-sm mb-2 leading-relaxed">
                            {t('onboarding.platform')}
                        </p>
                        <p className="text-slate-400 text-center text-sm mb-8">{t('onboarding.nameQ')}</p>

                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && setStep(2)}
                            placeholder={t('onboarding.name.placeholder')}
                            autoFocus
                            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-400 focus:outline-none text-slate-800 text-base font-medium transition-colors"
                        />
                        <p className="text-xs text-slate-400 text-center mt-3">
                            {t('onboarding.nameHint')}
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
                            {t('onboarding.levelSubtitle')}
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
                        <h1 className="text-xl font-bold text-slate-800 text-center mb-1">{t('onboarding.goalTitle')}</h1>
                        <p className="text-slate-500 text-center text-sm mb-6">
                            {t('onboarding.goalSubtitle')}
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
                            <ChevronLeft size={16} /> {t('onboarding.back')}
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
                            {t('onboarding.continue')} <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={!canNext}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-40"
                            style={{ backgroundColor: 'var(--teal, #14b8a6)' }}
                        >
                            {t('onboarding.finish')}
                        </button>
                    )}
                </div>
            </div>

            <p className="text-slate-600 text-xs mt-8 text-center">
                {t('onboarding.settingsHint')}
            </p>
        </div>
    )
}
