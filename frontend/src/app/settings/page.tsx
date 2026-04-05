'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Topbar from '@/components/dashboard/Topbar'
import { LogOut, KeyRound, Trash2, CheckCircle2, Loader2, User as UserIcon, Globe } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type { Lang } from '@/context/LanguageContext'

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClient()
    const { lang, setLang, t } = useLanguage()

    const [user, setUser] = useState<User | null>(null)
    const [displayName, setDisplayName] = useState('')
    const [nameSaved, setNameSaved] = useState(false)
    const [resetSent, setResetSent] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const [resetError, setResetError] = useState('')
    const [demoCleared, setDemoCleared] = useState(false)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
            setUser(data.user)
            const saved = localStorage.getItem('speakmate_username')
            setDisplayName(saved || data.user?.user_metadata?.full_name || '')
        })
    }, [])

    const avatarLetter = user?.user_metadata?.full_name?.[0]?.toUpperCase()
        || user?.email?.[0]?.toUpperCase() || '?'

    const handleSaveName = () => {
        localStorage.setItem('speakmate_username', displayName)
        setNameSaved(true)
        setTimeout(() => setNameSaved(false), 2000)
    }

    const handleResetPassword = async () => {
        if (!user?.email) return
        setResetLoading(true)
        setResetError('')
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/auth/callback`,
        })
        setResetLoading(false)
        if (error) setResetError(error.message)
        else setResetSent(true)
    }

    const handleClearDemoData = () => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('speakmate_'))
        keys.forEach(k => localStorage.removeItem(k))
        setDemoCleared(true)
        setTimeout(() => setDemoCleared(false), 2000)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] w-full">
            <Topbar />

            <section className="flex-1 px-[5%] xl:px-[10%] py-10 pb-20">
                <div className="max-w-2xl mx-auto space-y-6">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('settings.title')}</h1>

                    {/* Hồ sơ */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-teal-500" /> {t('settings.profile')}
                        </h2>

                        {/* Avatar + info */}
                        <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                                {avatarLetter}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">
                                    {user?.user_metadata?.full_name || displayName || t('settings.guest')}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">{user?.email || t('settings.notLoggedIn')}</p>
                            </div>
                        </div>

                        {/* Tên hiển thị */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">{t('settings.displayName')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder={t('settings.displayName.placeholder')}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700"
                                />
                                <button
                                    onClick={handleSaveName}
                                    className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                                >
                                    {nameSaved ? <><CheckCircle2 className="w-4 h-4" /> {t('settings.saved')}</> : t('settings.save')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Ngôn ngữ */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-teal-500" /> {t('settings.language')}
                        </h2>
                        <p className="text-xs text-slate-500 mb-5">{t('settings.language.desc')}</p>

                        <div className="flex gap-3">
                            {([
                                { code: 'vi' as Lang, label: t('settings.langVi'), flag: '🇻🇳' },
                                { code: 'en' as Lang, label: t('settings.langEn'), flag: '🇬🇧' },
                            ]).map(({ code, label, flag }) => (
                                <button
                                    key={code}
                                    onClick={() => setLang(code)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                                        lang === code
                                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-600'
                                    }`}
                                >
                                    <span className="text-base">{flag}</span>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tài khoản & Bảo mật */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-teal-500" /> {t('settings.security')}
                        </h2>

                        <div className="space-y-3">
                            {/* Đổi mật khẩu */}
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-sm font-semibold text-slate-700 mb-1">{t('settings.changePassword')}</p>
                                <p className="text-xs text-slate-500 mb-3">
                                    {t('settings.changePassword.desc')} <span className="font-medium">{user?.email}</span>
                                </p>
                                {resetSent ? (
                                    <div className="flex items-center gap-2 text-teal-600 text-sm font-medium">
                                        <CheckCircle2 className="w-4 h-4" /> {t('settings.resetSent')}
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleResetPassword}
                                            disabled={resetLoading || !user?.email}
                                            className="px-4 py-2 bg-white border border-slate-200 hover:border-teal-400 text-slate-700 hover:text-teal-600 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            {t('settings.sendResetEmail')}
                                        </button>
                                        {resetError && <p className="text-xs text-red-500 mt-2">{resetError}</p>}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dữ liệu & Đăng xuất */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-slate-400" /> {t('settings.data')}
                        </h2>

                        <div className="space-y-3">
                            {/* Xóa dữ liệu demo */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">{t('settings.clearDemo')}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{t('settings.clearDemo.desc')}</p>
                                </div>
                                <button
                                    onClick={handleClearDemoData}
                                    className="ml-4 px-3 py-1.5 border border-slate-200 hover:border-red-300 text-slate-500 hover:text-red-500 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5"
                                >
                                    {demoCleared
                                        ? <><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> {t('settings.cleared')}</>
                                        : <><Trash2 className="w-3.5 h-3.5" /> {t('settings.clear')}</>}
                                </button>
                            </div>

                            {/* Đăng xuất */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-xl text-sm font-semibold transition-all"
                            >
                                <LogOut className="w-4 h-4" /> {t('nav.logout')}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
