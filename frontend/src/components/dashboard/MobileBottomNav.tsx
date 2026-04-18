'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Mic, MessageCircle, Settings } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

export default function MobileBottomNav() {
    const pathname = usePathname()
    const { t } = useLanguage()

    const navItems = [
        { href: '/', icon: Home, label: t('nav.home') },
        { href: '/setup', icon: Mic, label: t('nav.practice') },
        { href: '/chat', icon: MessageCircle, label: t('nav.mentorNi') },
        { href: '/settings', icon: Settings, label: t('nav.settings') },
    ]

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-center justify-around"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: '60px' }}
        >
            {navItems.map(({ href, icon: Icon, label }) => {
                const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
                return (
                    <Link
                        key={href}
                        href={href}
                        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
                    >
                        <Icon
                            size={22}
                            className={isActive ? 'text-teal-500' : 'text-slate-400'}
                            strokeWidth={isActive ? 2.5 : 1.8}
                        />
                        <span
                            className={`text-[10px] font-medium ${isActive ? 'text-teal-500' : 'text-slate-400'}`}
                        >
                            {label}
                        </span>
                    </Link>
                )
            })}
        </nav>
    )
}
