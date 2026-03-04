'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WaveformVisualizerProps {
    isActive: boolean
}

const BAR_COUNT = 35

// Color palette: teal → cyan → blue → indigo → purple → back
const BAR_COLORS = [
    '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8',
    '#a78bfa', '#c084fc', '#a78bfa', '#818cf8', '#60a5fa',
    '#38bdf8', '#22d3ee', '#2dd4bf',
]

function randomHeight(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateHeights(): number[] {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
        const center = (BAR_COUNT - 1) / 2
        const dist = Math.abs(i - center) / center   // 0 at center, 1 at edges
        const maxH = Math.round(80 - dist * 50)       // center bars taller
        return randomHeight(6, maxH)
    })
}

export function WaveformVisualizer({ isActive }: WaveformVisualizerProps) {
    const [heights, setHeights] = useState<number[]>(() => Array(BAR_COUNT).fill(6))

    useEffect(() => {
        if (!isActive) {
            setHeights(Array(BAR_COUNT).fill(6))
            return
        }
        setHeights(generateHeights())
        const id = setInterval(() => setHeights(generateHeights()), 100)
        return () => clearInterval(id)
    }, [isActive])

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    className="flex items-end justify-center gap-[2.5px]"
                    style={{ height: 56 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                >
                    {heights.map((h, i) => (
                        <motion.div
                            key={i}
                            className="rounded-full"
                            style={{
                                width: 4,
                                backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                                opacity: 0.88,
                            }}
                            animate={{ height: h }}
                            transition={{ duration: 0.09, ease: 'linear' }}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    )
}
