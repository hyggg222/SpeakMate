'use client'

import { useEffect } from 'react'
import { seedDemoDataIfNeeded } from '@/lib/seedDemoData'

export default function DemoDataSeeder() {
    useEffect(() => { seedDemoDataIfNeeded() }, [])
    return null
}
