'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { VideoOff } from 'lucide-react'

export function WebcamPreview() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [ready, setReady] = useState(false)
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        let cancelled = false

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop())
                    return
                }
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    setReady(true)
                }
            } catch {
                // Camera unavailable or denied — component just won't render
            }
        }

        init()

        return () => {
            cancelled = true
            streamRef.current?.getTracks().forEach(t => t.stop())
        }
    }, [])

    if (!ready) return null

    return (
        <motion.div
            className="absolute top-20 left-4 z-30 rounded-2xl overflow-hidden shadow-2xl"
            style={{
                width: 144,
                height: 108,
                border: '1px solid rgba(100,116,139,0.4)',
                background: '#0d1117',
            }}
            initial={{ opacity: 0, scale: 0.85, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.4, ease: 'easeOut' }}
        >
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
            />
            {/* Subtle label */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                <span className="text-[9px] text-white/50 font-medium uppercase tracking-wide">Bạn</span>
            </div>
        </motion.div>
    )
}
