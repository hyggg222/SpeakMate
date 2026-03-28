'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { Lock } from 'lucide-react'

interface AuthGateProps {
    children: React.ReactNode
    feature?: string // e.g. "Kho Chuyện", "Lịch sử"
}

export default function AuthGate({ children, feature }: AuthGateProps) {
    const [user, setUser] = useState<User | null | undefined>(undefined) // undefined = loading

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
            setUser(data.user)
        })
    }, [])

    if (user === undefined) return null // loading — avoid flash

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 py-24 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-5">
                    <Lock className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                    Đăng nhập để sử dụng{feature ? ` ${feature}` : ' tính năng này'}
                </h2>
                <p className="text-sm text-slate-400 mb-6 max-w-xs leading-relaxed">
                    Tính năng này yêu cầu tài khoản để lưu trữ dữ liệu của bạn.
                </p>
                <div className="flex gap-3">
                    <Link href="/login"
                        className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-semibold transition-colors">
                        Đăng nhập
                    </Link>
                    <Link href="/signup"
                        className="px-5 py-2.5 border border-slate-600 hover:border-teal-500 text-slate-300 hover:text-teal-400 rounded-xl text-sm font-medium transition-colors">
                        Tạo tài khoản
                    </Link>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
