'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Mounts once at app root. If the user has no Supabase session, it
 * silently signs them in anonymously so every authRequired backend
 * endpoint still works (Story Bank CRUD, challenge save, session
 * history, etc).
 *
 * The anon user keeps the same UID across reloads as long as the
 * cookie/localStorage is intact. To upgrade to a real account, call
 * `supabase.auth.updateUser({ email, password })` or use OAuth /
 * `linkIdentity()` — Supabase will preserve the same auth.uid so
 * existing rows stay attached to the user.
 */
export default function GuestAuthInit() {
    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
            if (session) return // already has a session (anon or real)
            supabase.auth.signInAnonymously().catch((err: unknown) => {
                console.warn('[GuestAuth] Anonymous sign-in failed:', err)
            })
        })
    }, [])
    return null
}
