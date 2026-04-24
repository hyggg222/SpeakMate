'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Turn {
    speaker: 'AI' | 'User'
    character_id?: string
    character_name?: string
    line: string
    confirmed?: boolean
}

interface CharacterInfo {
    id: string
    name: string
    color?: string
}

interface FloatingTranscriptsProps {
    history: Turn[]
    isUserSpeaking: boolean
    isBotResponding: boolean
    isListening: boolean
    personaName?: string
    characters?: CharacterInfo[]
}

const AI_STYLE = { bg: 'bg-teal-950/70', border: 'border-teal-800/50' }

export function FloatingTranscripts({
    history,
    isUserSpeaking,
    isBotResponding,
    isListening,
    personaName = 'AI',
    characters = [],
}: FloatingTranscriptsProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        el.scrollTop = el.scrollHeight
    }, [history, isListening, isBotResponding])

    return (
        <motion.div
            className="w-full h-full max-w-4xl mx-auto flex flex-col"
            animate={{ opacity: isUserSpeaking ? 0.2 : 1 }}
            transition={{ duration: 0.25 }}
        >
            <div className="flex-1 relative overflow-hidden">
                <div
                    ref={scrollRef}
                    className="absolute inset-0 overflow-y-auto flex flex-col gap-4 px-4 pb-8 pt-4"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    <AnimatePresence mode="popLayout">
                        {history.map((msg, i) => (
                            <motion.div
                                key={i}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.28, ease: 'easeOut' }}
                                className={`flex ${msg.speaker === 'User' ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`max-w-[85%] flex flex-col ${msg.confirmed === false ? 'opacity-50 grayscale-[0.5]' : 'opacity-100 grayscale-0'}`}>
                                    <div
                                        className={`px-5 py-3.5 rounded-2xl text-base leading-relaxed transition-all duration-300 shadow-md ${msg.speaker === 'User'
                                            ? 'bg-slate-700/70 text-slate-200 rounded-tl-sm border border-slate-600/50'
                                            : `${AI_STYLE.bg} text-white rounded-tr-sm border ${AI_STYLE.border}`
                                        }`}
                                    >
                                        {msg.speaker === 'User' ? `"${msg.line}"` : msg.line}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Listening indicator (user speaking) */}
                        {isListening && (
                            <motion.div
                                key="__listening__"
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex justify-start"
                            >
                                <div className="bg-slate-700/60 border border-indigo-500/40 rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-end gap-[3px] h-10">
                                    {[0, 150, 300, 450, 600].map((delay, i) => (
                                        <span
                                            key={i}
                                            className="inline-block w-[3px] bg-indigo-400 rounded-full"
                                            style={{
                                                animation: `bounce 0.9s infinite ${delay}ms`,
                                                height: i === 1 || i === 3 ? '18px' : i === 2 ? '22px' : '14px',
                                            }}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Bot responding indicator */}
                        {isBotResponding && !isListening && (
                            <motion.div
                                key="__responding__"
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex justify-end"
                            >
                                <div className="bg-teal-950/70 border border-teal-700/40 rounded-2xl rounded-tr-sm px-4 py-2.5 flex items-end gap-[3px] h-10">
                                    {[0, 150, 300, 450].map((delay, i) => (
                                        <span
                                            key={i}
                                            className="inline-block w-[3px] bg-teal-400 rounded-full"
                                            style={{
                                                animation: `bounce 0.9s infinite ${delay}ms`,
                                                height: i === 1 || i === 2 ? '18px' : '12px',
                                            }}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    )
}
