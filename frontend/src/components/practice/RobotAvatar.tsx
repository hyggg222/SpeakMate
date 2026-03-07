'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import Image from 'next/image'

interface RobotAvatarProps {
    isSpeaking: boolean
    isListening: boolean
}

export function RobotAvatar({ isSpeaking, isListening }: RobotAvatarProps) {
    return (
        <div className="relative flex items-center justify-center select-none">
            {/* Outer ambient glow */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ width: 260, height: 260 }}
                animate={{
                    background: isSpeaking
                        ? 'radial-gradient(circle, rgba(20,184,166,0.25) 0%, transparent 68%)'
                        : isListening
                            ? 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 68%)'
                            : 'radial-gradient(circle, rgba(148,163,184,0.08) 0%, transparent 68%)',
                    scale: isSpeaking ? [1, 1.18, 1] : isListening ? [1, 1.1, 1] : [1, 1.04, 1],
                    opacity: isSpeaking ? [0.7, 1, 0.7] : isListening ? [0.5, 0.8, 0.5] : [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: isSpeaking ? 0.75 : 3.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Pulse ring */}
            <motion.div
                className="absolute rounded-full border pointer-events-none"
                style={{ width: 190, height: 190 }}
                animate={{
                    borderColor: isSpeaking
                        ? 'rgba(20,184,166,0.6)'
                        : isListening
                            ? 'rgba(99,102,241,0.5)'
                            : 'rgba(100,116,139,0.25)',
                    scale: isSpeaking ? [1, 1.12, 1] : [1, 1.05, 1],
                    opacity: isSpeaking ? [0.8, 0.4, 0.8] : [0.4, 0.2, 0.4],
                }}
                transition={{
                    duration: isSpeaking ? 0.7 : 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Avatar */}
            <motion.div
                className="relative w-40 h-40 rounded-full overflow-hidden"
                style={{
                    boxShadow: isSpeaking
                        ? '0 0 30px rgba(20,184,166,0.5), 0 0 60px rgba(20,184,166,0.2)'
                        : isListening
                            ? '0 0 20px rgba(99,102,241,0.4)'
                            : '0 0 20px rgba(0,0,0,0.5)',
                }}
                animate={{
                    scale: isSpeaking ? [1, 1.045, 1] : [1, 1.012, 1],
                    borderColor: isSpeaking ? 'rgba(20,184,166,0.9)' : 'rgba(100,116,139,0.4)',
                }}
                transition={{
                    duration: isSpeaking ? 0.65 : 3.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                <div
                    className="absolute inset-0 rounded-full border-2 z-10 pointer-events-none"
                    style={{
                        borderColor: isSpeaking
                            ? 'rgba(20,184,166,0.85)'
                            : isListening
                                ? 'rgba(99,102,241,0.6)'
                                : 'rgba(100,116,139,0.35)',
                        transition: 'border-color 0.4s ease',
                    }}
                />
                <Image
                    src={`/ni-avatar.png?v=${new Date().getHours()}_${Math.floor(new Date().getMinutes() / 5)}`}
                    alt="Mentor Ni"
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                />
            </motion.div>

            {/* Speaking badge */}
            <AnimatePresence>
                {isSpeaking && (
                    <motion.div
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-teal-500/20 border border-teal-500/40 rounded-full px-3 py-1 backdrop-blur-sm"
                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Volume2 className="w-3 h-3 text-teal-400" />
                        <span className="text-[11px] text-teal-300 font-medium whitespace-nowrap">Đang nói...</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
