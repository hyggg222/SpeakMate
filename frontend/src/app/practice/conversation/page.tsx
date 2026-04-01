'use client'

import { ArrowLeft, Home, Settings, Mic, Loader2, ChevronDown, RotateCcw, Sparkles, Volume2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { useScenario } from '@/context/ScenarioContext'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

export default function ConversationStudioPage() {
    const router = useRouter()
    const { scenario, history, setHistory, audioFileKeys, setAudioFileKeys } = useScenario()
    const { isRecording, startRecording, stopRecording } = useAudioRecorder()

    const [isProcessing, setIsProcessing] = useState(false)
    const [currentBotMsg, setCurrentBotMsg] = useState('Đang khởi tạo kịch bản...')

    // Story 2.3 — Redo state
    const [redoCount, setRedoCount] = useState(2) // Max 2 redos per session

    // Story 2.2 — Scaffolding Hints state
    const [hints, setHints] = useState<string[]>([])
    const [showHints, setShowHints] = useState(false)
    const [isLoadingHints, setIsLoadingHints] = useState(false)

    // Story 2.5 — Track which AI message audio is playing
    const [playingAudioIndex, setPlayingAudioIndex] = useState<number | null>(null)

    // Auto-scroll logic
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    // Listen to scroll to show/hide the scroll-to-bottom button
    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            // Show button if user scrolled up more than 100px from bottom
            if (scrollHeight - scrollTop - clientHeight > 100) {
                setShowScrollButton(true);
            } else {
                setShowScrollButton(false);
            }
        }
    };

    // Auto scroll when history or recording state changes
    useEffect(() => {
        scrollToBottom();
    }, [history, isRecording, isProcessing]);

    useEffect(() => {
        if (!scenario) {
            router.push('/setup')
            return;
        }

        // Cần đảm bảo window is active để browser không chặn TTS. 
        if (history.length === 0) {
            const firstTurn = scenario.scenario.startingTurns[0]?.line || 'Chào bạn, chúng ta bắt đầu phần luyện tập nhé.'
            setCurrentBotMsg(firstTurn)
            setHistory([{ speaker: 'AI', line: firstTurn }])
        } else {
            const lastMsg = history[history.length - 1]?.line || '...'
            setCurrentBotMsg(lastMsg)
        }
    }, [scenario, router, history, setHistory])

    const playAudioUrl = (url: string, index?: number) => {
        const audio = new Audio(url);
        if (index !== undefined) setPlayingAudioIndex(index);
        audio.onended = () => setPlayingAudioIndex(null);
        audio.play().catch(e => {
            console.error("Error playing bot audio:", e);
            setPlayingAudioIndex(null);
        });
    };

    const handleMicToggle = async () => {
        if (isProcessing) return;

        if (isRecording) {
            const audioBlob = await stopRecording()
            if (audioBlob) {
                processUserAudio(audioBlob)
            }
        } else {
            // Hide hints when user starts recording
            setShowHints(false)
            startRecording()
        }
    }

    const processUserAudio = async (blob: Blob) => {
        setIsProcessing(true)
        try {
            const result = await apiClient.interactAudio(blob, scenario?.scenario, history)

            // Phát Audio trả lời từ backend
            if (result.botAudioUrl) {
                playAudioUrl(result.botAudioUrl);
            }

            setHistory([...history, { speaker: 'User', line: result.userTranscript }, { speaker: 'AI', line: result.botResponse }])
            if (result.audioUploadedKey) {
                setAudioFileKeys([...audioFileKeys, result.audioUploadedKey])
            }
        } catch (error) {
            console.error('Lỗi khi tương tác âm thanh:', error)
            alert('Có lỗi xảy ra trong quá trình kết nối tới The Voice AI. Hãy thử lại.')
        } finally {
            setIsProcessing(false)
        }
    }

    // Story 2.3 — Redo: Remove last user turn + AI response
    const handleRedo = () => {
        if (redoCount <= 0 || history.length < 2 || isRecording || isProcessing) return;

        // Find last user message and remove it + the AI response after it
        const newHistory = [...history];
        // Remove last 2 entries (User + AI)
        if (newHistory[newHistory.length - 2]?.speaker === 'User') {
            newHistory.splice(-2, 2);
        } else if (newHistory[newHistory.length - 1]?.speaker === 'User') {
            newHistory.splice(-1, 1);
        }

        setHistory(newHistory);
        setRedoCount(prev => prev - 1);
        setShowHints(false);
    }

    // Story 2.2 — Scaffolding Hints: "Ni ơi, cứu!"
    const handleRequestHints = async () => {
        if (isLoadingHints) return;
        setIsLoadingHints(true);
        setShowHints(true);
        try {
            const result = await apiClient.getHints(scenario?.scenario, history);
            setHints(result);
        } catch (error) {
            console.error('Hint error:', error);
            setHints(["Hãy thử lại", "Nói về bản thân", "Hỏi thêm câu hỏi"]);
        } finally {
            setIsLoadingHints(false);
        }
    }

    // Story 2.5 — Shadowing: Play AI suggestion audio via Google TTS
    const handleShadowing = async (text: string, index: number) => {
        if (playingAudioIndex !== null) return;
        try {
            // Use the browser SpeechSynthesis API for quick TTS
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            utterance.rate = 0.9;
            setPlayingAudioIndex(index);
            utterance.onend = () => setPlayingAudioIndex(null);
            utterance.onerror = () => setPlayingAudioIndex(null);
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Shadowing error:", e);
            setPlayingAudioIndex(null);
        }
    }

    // Check if user has spoken at least once (for redo eligibility)
    const userHasSpoken = history.some((msg: any) => msg.speaker === 'User');

    return (
        <div className="flex flex-col min-h-screen bg-[#10141b] text-white font-sans overflow-hidden relative">

            {/* Dark Topbar */}
            <header className="flex flex-row items-center justify-between px-6 py-4 relative z-20">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Quay lại</span>
                    </button>
                    <Link href="/" className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white">
                        <Home className="w-4 h-4" />
                        <span className="text-sm font-medium">Trang chủ</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    {/* Ni ơi cứu! button in header */}
                    <button
                        onClick={handleRequestHints}
                        disabled={isLoadingHints || isRecording || isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-full transition-all border border-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Ni ơi, cứu!</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-300">Mentor Ni</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-slate-800">
                            <Image src="/ni-avatar.png" alt="Mentor Ni" width={32} height={32} className="object-cover" />
                        </div>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-[900px] w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col justify-end pb-24 relative z-10 h-full max-h-[calc(100vh-80px)]">

                <div className="relative flex-1 flex flex-col justify-end overflow-hidden mb-8">

                    {/* Story 2.2 — Hints Overlay */}
                    {showHints && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="bg-[#1c212a]/95 backdrop-blur-md rounded-2xl border border-amber-500/30 p-4 shadow-[0_0_30px_rgba(245,158,11,0.15)] max-w-md">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm font-semibold text-amber-300">Gợi ý từ Ni</span>
                                    <button onClick={() => setShowHints(false)} className="ml-auto text-slate-500 hover:text-slate-300 text-xs">✕</button>
                                </div>
                                {isLoadingHints ? (
                                    <div className="flex items-center justify-center gap-2 py-3">
                                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                        <span className="text-sm text-slate-400">Ni đang nghĩ...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {hints.map((hint, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1.5 bg-amber-500/15 text-amber-200 rounded-full text-sm border border-amber-500/20 hover:bg-amber-500/25 transition-colors cursor-default"
                                            >
                                                💡 {hint}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Chat Area - Scrollable Container */}
                    <div
                        ref={chatContainerRef}
                        onScroll={handleScroll}
                        className="space-y-6 flex-1 flex flex-col overflow-y-auto pb-4 hide-scrollbar"
                    >

                        {history.map((msg: any, index: number) => {
                            if (msg.speaker === 'User') {
                                return (
                                    <div key={index} className="flex flex-col items-start gap-2 max-w-[85%] self-start">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-1">Bạn đã nói:</span>
                                        <div className="bg-slate-800/80 rounded-2xl rounded-tl-none p-4 md:p-5 border border-slate-700 shadow-xl max-h-[150px] overflow-y-auto custom-scrollbar relative group text-slate-200">
                                            <p className="text-[15px] leading-relaxed relative z-10">
                                                &quot;{msg.line}&quot;
                                            </p>
                                        </div>
                                    </div>
                                )
                            } else {
                                // AI message with Shadowing button
                                return (
                                    <div key={index} className="flex flex-col items-end gap-2 ml-auto max-w-[85%] self-end">
                                        <div className="flex items-center gap-3 w-full justify-end">
                                            <span className="text-xs font-medium text-teal-400/80 uppercase tracking-wide px-1">
                                                Đối phương ({scenario?.scenario?.interviewerPersona?.split(' ')?.[0] || 'AI'}):
                                            </span>
                                        </div>
                                        <div className="bg-[#1c212a] rounded-3xl rounded-br-none p-5 md:p-6 border border-slate-700/50 shadow-lg text-white group relative">
                                            <p className="text-[16px] md:text-lg font-medium leading-relaxed">
                                                {msg.line}
                                            </p>
                                            {/* Story 2.5 — Shadowing "Nghe gợi ý" button */}
                                            <button
                                                onClick={() => handleShadowing(msg.line, index)}
                                                disabled={playingAudioIndex !== null}
                                                className="mt-3 flex items-center gap-1.5 text-xs text-teal-400/60 hover:text-teal-300 transition-colors disabled:opacity-30"
                                            >
                                                <Volume2 className={`w-3.5 h-3.5 ${playingAudioIndex === index ? 'animate-pulse text-teal-300' : ''}`} />
                                                <span>{playingAudioIndex === index ? 'Đang phát...' : 'Nghe gợi ý'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )
                            }
                        })}

                        {isRecording && (
                            <div className="flex flex-col items-start gap-2 max-w-[85%] self-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-1">Đang thu âm...</span>
                                <div className="bg-slate-800/80 rounded-2xl rounded-tl-none p-4 md:p-5 border border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)] relative">
                                    <div className="flex items-center gap-1.5 h-6 px-2">
                                        <div className="w-1.5 h-4/6 bg-rose-500 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                                        <div className="w-1.5 h-full bg-rose-500 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                                        <div className="w-1.5 h-3/6 bg-rose-500 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                                        <div className="w-1.5 h-5/6 bg-rose-500 rounded-full animate-[bounce_1s_infinite_600ms]"></div>
                                        <div className="w-1.5 h-full bg-rose-500 rounded-full animate-[bounce_1s_infinite_800ms]"></div>
                                        <div className="w-1.5 h-4/6 bg-rose-500 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="flex flex-col items-end gap-2 ml-auto max-w-[85%] self-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <span className="text-xs font-medium text-teal-400/80 uppercase tracking-wide px-1 ml-auto">
                                    Ni đang suy nghĩ...
                                </span>
                                <div className="bg-[#1c212a] rounded-3xl rounded-br-none p-5 md:p-6 border border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.15)] group relative">
                                    <div className="flex items-center justify-center gap-1.5 h-6 px-4">
                                        <div className="w-1.5 h-full bg-teal-400 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                                        <div className="w-1.5 h-4/6 bg-teal-400 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                                        <div className="w-1.5 h-5/6 bg-teal-400 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                                        <div className="w-1.5 h-3/6 bg-teal-400 rounded-full animate-[bounce_1s_infinite_600ms]"></div>
                                        <div className="w-1.5 h-full bg-teal-400 rounded-full animate-[bounce_1s_infinite_800ms]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Floating Scroll to Bottom Button */}
                    {showScrollButton && (
                        <button
                            onClick={scrollToBottom}
                            className="absolute bottom-4 right-1/2 translate-x-1/2 p-2 bg-[#1c212a] hover:bg-slate-700 text-teal-400 rounded-full border border-slate-700 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all z-20 flex items-center gap-1 group"
                        >
                            <ChevronDown className="w-5 h-5 animate-bounce group-hover:animate-none" />
                        </button>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="flex items-center justify-center gap-4 md:gap-8 w-full mt-auto">

                    {/* Story 2.3 — Redo Button */}
                    <button
                        onClick={handleRedo}
                        disabled={!userHasSpoken || redoCount <= 0 || isRecording || isProcessing}
                        className="hidden md:flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-white text-slate-900 font-semibold rounded-full shadow-lg transition-all min-w-[120px] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Nói lại ({redoCount})</span>
                    </button>

                    {/* Circle Mic Button */}
                    <button
                        onClick={handleMicToggle}
                        disabled={isProcessing}
                        className="relative flex flex-col items-center group cursor-pointer disabled:opacity-50"
                    >
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all bg-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.3)]
                                ${isRecording ? 'scale-90 bg-rose-600' : 'hover:scale-105'}`}>
                            {isProcessing ? <Loader2 className="w-8 h-8 animate-spin text-white" /> : <Mic className="w-8 h-8 text-white" />}
                        </div>
                        {/* Status ring */}
                        <div className={`absolute inset-0 top-0 left-0 w-20 h-20 rounded-full border-2 transition-all duration-300 pointer-events-none 
                            ${isRecording ? 'border-teal-400 scale-125 opacity-100 animate-pulse' : 'border-teal-500 scale-110 opacity-50 group-hover:scale-125 group-hover:opacity-100'}`} />

                        <div className="absolute -bottom-6 w-max">
                            <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Bắt đầu / Dừng</span>
                        </div>
                    </button>

                    <Link href="/evaluation/conversation" className="hidden md:block px-8 py-3 bg-[#111827] hover:bg-[#1f2937] text-white font-semibold rounded-full border border-slate-700 shadow-lg transition-colors min-w-[120px] text-center">
                        Kết thúc
                    </Link>
                </div>
            </main >
        </div >
    )
}
