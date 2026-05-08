'use client'

import { useState } from 'react'
import { Target, RefreshCw, BookOpen, Home, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'

interface Props {
    sessionId: string;
    weaknesses: string[];
    lowCoverageStoryIds?: string[];
    onGenerateChallenge: () => Promise<void>;
    isChallengeVisible: boolean;
}

export default function EvalCTASection({ sessionId, weaknesses, lowCoverageStoryIds, onGenerateChallenge, isChallengeVisible }: Props) {
    const router = useRouter()
    const { t } = useLanguage()
    const [isGenerating, setIsGenerating] = useState(false)

    const handleChallenge = async () => {
        setIsGenerating(true)
        try {
            await onGenerateChallenge()
        } finally {
            setIsGenerating(false)
        }
    }

    const handleRetry = () => {
        const weaknessStr = weaknesses.slice(0, 2).join(', ')
        router.push(`/setup?retry=true&topic=${encodeURIComponent(`Luyện lại tập trung vào: ${weaknessStr}`)}`)
    }

    const handleStoryBank = () => {
        const highlight = lowCoverageStoryIds?.join(',') || ''
        router.push(`/stories${highlight ? `?highlight=${highlight}` : ''}`)
    }

    const dimmed = isChallengeVisible

    return (
        <section className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm transition-opacity ${dimmed ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="font-semibold text-slate-800 text-sm mb-4">{t('eval.nextSteps')}</h3>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={handleChallenge}
                    disabled={isGenerating || dimmed}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white shadow transition-colors hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--teal)' }}
                >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
                    {t('eval.getChallenge')}
                </button>
                <button
                    onClick={handleRetry}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw size={16} />
                    {t('eval.retryPractice')}
                </button>
                <button
                    onClick={handleStoryBank}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    <BookOpen size={16} />
                    Story Bank
                </button>
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    <Home size={16} />
                    {t('eval.mainHome')}
                </button>
            </div>
        </section>
    )
}
