'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, MessageCircle } from 'lucide-react'

const GOAL_LABELS: Record<string, string> = {
    interview: 'phỏng vấn',
    business: 'giao tiếp công việc',
    daily: 'hội thoại hằng ngày',
    academic: 'tiếng Anh học thuật',
}

export default function WelcomeBanner() {
    const [visible, setVisible] = useState(false)
    const [onboardingName, setOnboardingName] = useState<string | null>(null)
    const [onboardingGoal, setOnboardingGoal] = useState<string | null>(null)

    useEffect(() => {
        try {
            if (!sessionStorage.getItem('speakmate_welcome_dismissed')) {
                setVisible(true)
            }
            const raw = localStorage.getItem('speakmate_onboarding')
            if (raw) {
                const data = JSON.parse(raw)
                setOnboardingName(data.name || null)
                setOnboardingGoal(data.goal || null)
            }
        } catch {
            // ignore
        }
    }, [])

    const dismiss = () => {
        try { sessionStorage.setItem('speakmate_welcome_dismissed', '1') } catch { /* ignore */ }
        setVisible(false)
    }

    if (!visible) return null

    const goalLabel = onboardingGoal ? GOAL_LABELS[onboardingGoal] : null
    const displayName = onboardingName && onboardingName !== 'Bạn' ? onboardingName : null

    return (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl text-sm"
            style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(99,102,241,0.10) 100%)', border: '1px solid rgba(20,184,166,0.25)' }}>
            <MessageCircle className="w-4 h-4 shrink-0 text-teal-400" />
            <span style={{ color: 'var(--foreground)', opacity: 0.85 }}>
                {displayName && goalLabel ? (
                    <>
                        Chào {displayName}! Hãy{' '}
                        <Link href="/chat" onClick={dismiss}
                            className="font-semibold text-teal-400 hover:text-teal-300 underline underline-offset-2">
                            chat với Mentor Ni
                        </Link>
                        {' '}để bắt đầu luyện <strong>{goalLabel}</strong>.
                    </>
                ) : displayName ? (
                    <>
                        Chào {displayName}! Hãy{' '}
                        <Link href="/chat" onClick={dismiss}
                            className="font-semibold text-teal-400 hover:text-teal-300 underline underline-offset-2">
                            chat với Mentor Ni
                        </Link>
                        {' '}để được hướng dẫn.
                    </>
                ) : (
                    <>
                        Nếu đây là lần đầu bạn sử dụng SpeakMate, hãy{' '}
                        <Link href="/chat" onClick={dismiss}
                            className="font-semibold text-teal-400 hover:text-teal-300 underline underline-offset-2">
                            chat với Mentor Ni
                        </Link>
                        {' '}để được hướng dẫn.
                    </>
                )}
            </span>
            <button onClick={dismiss} className="ml-auto shrink-0 p-0.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
        </div>
    )
}
