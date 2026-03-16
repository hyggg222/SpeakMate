'use client'

import { useEffect } from 'react'
import { seedDemoDataIfNeeded } from '@/lib/seedDemoData'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://speakmate-k26b.onrender.com/api'

export default function DemoDataSeeder() {
    useEffect(() => {
        seedDemoDataIfNeeded()
        // Warm up backend (Render free tier sleeps after 15min inactivity)
        fetch(`${API_BASE}/health`, { method: 'GET' }).catch(() => {})
    }, [])
    return null
}
