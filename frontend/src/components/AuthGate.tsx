'use client'

/**
 * Demo mode: AuthGate is a passthrough so guests can browse challenges,
 * history, and stories without logging in. Backend endpoints that need
 * auth still return 401 — the affected pages already handle that with
 * empty states or localStorage fallbacks.
 *
 * To re-enable the gate, restore the auth check from git history.
 */
interface AuthGateProps {
    children: React.ReactNode
    feature?: string
}

export default function AuthGate({ children }: AuthGateProps) {
    return <>{children}</>
}
