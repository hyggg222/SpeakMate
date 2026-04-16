'use client'

import { ArrowLeft, Home, Settings, Mic, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { useScenario } from '@/context/ScenarioContext'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useLiveKitRoom, TurnData } from '@/hooks/useLiveKitRoom'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { RobotAvatar } from '@/components/practice/RobotAvatar'
import { WebcamPreview } from '@/components/practice/WebcamPreview'
import { FloatingTranscripts } from '@/components/practice/FloatingTranscripts'
import { WaveformVisualizer } from '@/components/practice/WaveformVisualizer'

/** Strip bracketed placeholders like [tên của bạn], [name], [địa điểm] from text */
function sanitize(text: string): string {
    let r = text.replace(/\[(?:tên của bạn|tên bạn|your name|tên|name|họ tên|địa điểm|chủ đề|topic)[^\]]*\]/gi, 'bạn')
    r = r.replace(/\[[^\]]{1,30}\]/g, '')
    return r.replace(/\s{2,}/g, ' ').trim()
}

export default function ConversationStudioPage() {
    const router = useRouter()
    const { scenario, history, setHistory, audioFileKeys, setAudioFileKeys, livekitSession } = useScenario()
    const { isRecording, startRecording, stopRecording } = useAudioRecorder()

    // Ref to always have latest history inside LiveKit callbacks (avoids stale closure)
    const historyRef = useRef<any[]>(history)
    useEffect(() => { historyRef.current = history }, [history])

    const [isProcessing, setIsProcessing] = useState(false)
    const [currentBotMsg, setCurrentBotMsg] = useState('Đang khởi tạo kịch bản...')

    // LiveKit integration
    const {
        isConnected,
        isAgentReady,
        isAgentSpeaking,
        isUserSpeaking,
        isMicEnabled,
        connect: connectLiveKit,
        disconnect: disconnectLiveKit,
        toggleMic: toggleLiveKitMic
    } = useLiveKitRoom(
        useCallback((turn: TurnData) => {
            setHistory((prev: any[]) => {
                // If this is an AI turn and it was interrupted (part of history truncated), 
                // we should handle it. But transcripts coming from data channel are "new" turns.
                return [...prev, {
                    speaker: turn.speaker,
                    line: sanitize(turn.line),
                    turn_index: turn.turn_index,
                    confirmed: turn.confirmed ?? false
                }];
            });
        }, [setHistory]),
        useCallback((turnIndex: number) => {
            setHistory((prev: any[]) => prev.map(t =>
                t.turn_index === turnIndex ? { ...t, confirmed: true } : t
            ));
        }, [setHistory])
    )

    const isLiveKitMode = FEATURE_FLAGS.useLiveKit;

    // Story 2.3 — Redo state
    const [redoCount, setRedoCount] = useState(2)

    // Story 2.2 — Scaffolding Hints state
    const [hints, setHints] = useState<string[]>([])
    const [showHints, setShowHints] = useState(false)
    const [isLoadingHints, setIsLoadingHints] = useState(false)

    const hasConnectedRef = useRef(false);

    useEffect(() => {
        if (!scenario) {
            router.push('/setup')
            return;
        }

        const handleLiveKitConnect = async () => {
            if (isLiveKitMode && !isConnected && !hasConnectedRef.current) {
                hasConnectedRef.current = true;
                try {
                    if (livekitSession) {
                        // Use pre-created session from confirm page
                        await connectLiveKit(livekitSession.token, livekitSession.livekitUrl);
                    } else {
                        // Fallback: create on-the-fly
                        const data = await apiClient.createLivekitSession(scenario.scenario || scenario as any, history);
                        await connectLiveKit(data.token, data.livekitUrl);
                    }
                } catch (e) {
                    console.error("LiveKit connect error:", e);
                    hasConnectedRef.current = false;
                }
            }
        };
        handleLiveKitConnect();

        if (history.length === 0) {
            if (!isLiveKitMode) {
                const firstTurn = sanitize((scenario.scenario || scenario as any).startingTurns[0]?.line || 'Chào bạn, chúng ta bắt đầu phần luyện tập nhé.')
                setCurrentBotMsg(firstTurn)
                setHistory([{ speaker: 'AI', line: firstTurn }])
            }
        } else {
            const lastMsg = history[history.length - 1]?.line || '...'
            setCurrentBotMsg(lastMsg)
        }
    }, [scenario, router, history, setHistory, isLiveKitMode, isConnected, connectLiveKit])

    // LiveKit: auto-enable mic once agent is ready (not just connected)
    const hasAutoEnabledMic = useRef(false);
    useEffect(() => {
        if (isLiveKitMode && isConnected && isAgentReady && !isMicEnabled && !hasAutoEnabledMic.current) {
            hasAutoEnabledMic.current = true;
            toggleLiveKitMic();
        }
    }, [isLiveKitMode, isConnected, isAgentReady, isMicEnabled, toggleLiveKitMic])

    const playAudioUrl = (url: string) => {
        const audio = new Audio(url);
        audio.play().catch(e => {
            console.error("Error playing bot audio:", e);
        });
    };

    const handleMicToggle = async () => {
        if (isProcessing) return;

        if (isLiveKitMode) {
            await toggleLiveKitMic();
            if (!isMicEnabled) setShowHints(false);
            return;
        }

        if (isRecording) {
            const audioBlob = await stopRecording()
            if (audioBlob) {
                processUserAudio(audioBlob)
            }
        } else {
            setShowHints(false)
            startRecording()
        }
    }

    const processUserAudio = async (blob: Blob) => {
        setIsProcessing(true)
        try {
            const result = await apiClient.interactAudio(blob, scenario?.scenario || scenario as any, history)

            if (result.botAudioUrl) {
                playAudioUrl(result.botAudioUrl);
            }

            setHistory([...history, { speaker: 'User', line: result.userTranscript }, { speaker: 'AI', line: sanitize(result.botResponse) }])
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

        const newHistory = [...history];
        if (newHistory[newHistory.length - 2]?.speaker === 'User') {
            newHistory.splice(-2, 2);
        } else if (newHistory[newHistory.length - 1]?.speaker === 'User') {
            newHistory.splice(-1, 1);
        }

        setHistory(newHistory);
        setRedoCount(prev => prev - 1);
        setShowHints(false);
    }

    // Story 2.2 — Scaffolding Hints
    const handleRequestHints = async () => {
        if (isLoadingHints) return;
        setIsLoadingHints(true);
        setShowHints(true);
        try {
            const result = await apiClient.getHints(scenario?.scenario || scenario as any, history);
            setHints(result);
        } catch (error) {
            console.error('Hint error:', error);
            setHints(["Hãy thử lại", "Nói về bản thân", "Hỏi thêm câu hỏi"]);
        } finally {
            setIsLoadingHints(false);
        }
    }

    const handleEndSession = () => {
        if (history.length < 2) return;
        if (isLiveKitMode) {
            disconnectLiveKit();
        }
        router.push('/evaluation/conversation');
    }

    // Unified state
    const isListening = isRecording || (isLiveKitMode && isMicEnabled && isUserSpeaking);
    const isBotResponding = isProcessing || (isLiveKitMode && isAgentSpeaking);
    const isMicActive = isRecording || (isLiveKitMode && isMicEnabled);

    const userHasSpoken = history.some((msg: any) => msg.speaker === 'User');
    const personaName = (scenario?.scenario || scenario as any)?.interviewerPersona?.split(' ')?.[0] || 'Ni'

    return (
        <div className="relative flex flex-col h-screen bg-[#0d1117] text-white font-sans overflow-hidden">

            {/* Loading overlay — shown until agent is ready */}
            {isLiveKitMode && !isAgentReady && (
                <div className="absolute inset-0 z-50 bg-[#0d1117] flex flex-col items-center justify-center gap-5">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Mic className="w-7 h-7 text-teal-400/60" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-slate-300 text-base font-medium mb-1">
                            Đang chuẩn bị phòng luyện tập...
                        </p>
                        <p className="text-slate-600 text-sm">
                            AI Agent đang tải, vui lòng chờ một chút
                        </p>
                    </div>
                    {isConnected && (
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            <span className="text-xs text-slate-500">Đã kết nối, đang chờ AI...</span>
                        </div>
                    )}
                </div>
            )}

            {/* Webcam PiP — absolute top-left */}
            <WebcamPreview />

            {/* ── Header ────────────────────────────────────────────── */}
            <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#0d1117]/90 to-transparent pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-400 hover:text-white text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-medium">Quay lại</span>
                    </button>
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-slate-400 hover:text-white text-sm"
                    >
                        <Home className="w-4 h-4" />
                        <span className="font-medium">Trang chủ</span>
                    </Link>
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                    <button
                        onClick={handleRequestHints}
                        disabled={isLoadingHints || isRecording || isProcessing}
                        className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-full transition-all border border-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ni ơi, cứu!</span>
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-white">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* ── Stage: Avatar centered ────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10" style={{ paddingBottom: '11rem' }}>

                {/* Connection badge */}
                {isLiveKitMode && (
                    <div className="absolute top-20 right-6 flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-teal-400 animate-pulse' : 'bg-slate-600'}`} />
                        <span className="text-[11px] text-slate-500">{isConnected ? 'Đã kết nối' : 'Đang kết nối...'}</span>
                    </div>
                )}

                <RobotAvatar isSpeaking={isBotResponding} isListening={isListening} />

                {/* Persona label */}
                <div className="mt-6 mb-4 text-center">
                    <span className="text-sm font-medium text-slate-400">{personaName}</span>
                </div>

                {/* Waveform — visible when user is actively speaking */}
                <WaveformVisualizer isActive={isListening} />
            </div>

            {/* ── Floating Transcripts ──────────────────────────────── */}
            <div className="absolute bottom-[5.5rem] left-0 right-0 z-10 px-4">

                {/* Hints overlay */}
                {showHints && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-md">
                        <div className="bg-[#161b22]/95 backdrop-blur-md rounded-2xl border border-amber-500/30 p-4 shadow-[0_0_30px_rgba(245,158,11,0.12)]">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span className="text-sm font-semibold text-amber-300">Gợi ý từ Ni</span>
                                <button onClick={() => setShowHints(false)} className="ml-auto text-slate-500 hover:text-slate-300 text-xs">✕</button>
                            </div>
                            {isLoadingHints ? (
                                <div className="flex items-center justify-center gap-2 py-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                    <span className="text-sm text-slate-400">Ni đang nghĩ...</span>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {hints.map((hint, i) => (
                                        <span
                                            key={i}
                                            className="px-3 py-1.5 bg-amber-500/12 text-amber-200 rounded-full text-sm border border-amber-500/20 cursor-default"
                                        >
                                            💡 {hint}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <FloatingTranscripts
                    history={history}
                    isUserSpeaking={isListening}
                    isBotResponding={isBotResponding}
                    isListening={isListening}
                    personaName={personaName}
                />
            </div>

            {/* ── Bottom Controls ───────────────────────────────────── */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-8 px-6 py-5 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/80 to-transparent">

                {/* Redo */}
                <button
                    onClick={handleRedo}
                    disabled={!userHasSpoken || redoCount <= 0 || isRecording || isProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white font-medium rounded-full border border-slate-700/60 transition-all disabled:opacity-25 disabled:cursor-not-allowed text-sm"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Nói lại ({redoCount})</span>
                </button>

                {/* Mic button */}
                <button
                    onClick={handleMicToggle}
                    disabled={isProcessing}
                    className="relative flex flex-col items-center group cursor-pointer disabled:opacity-50"
                >
                    {/* Pulse ring */}
                    <div
                        className={`absolute inset-0 w-[72px] h-[72px] rounded-full border-2 transition-all duration-300 pointer-events-none
                            ${isMicActive
                                ? 'border-teal-400 scale-[1.35] opacity-80 animate-pulse'
                                : 'border-slate-600 scale-110 opacity-40 group-hover:scale-125 group-hover:opacity-70'
                            }`}
                    />
                    <div
                        className={`w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all shadow-lg
                            ${isMicActive
                                ? 'bg-teal-500 scale-95 shadow-[0_0_24px_rgba(20,184,166,0.5)]'
                                : 'bg-slate-700 hover:bg-slate-600 hover:scale-105 shadow-[0_0_16px_rgba(0,0,0,0.4)]'
                            }`}
                    >
                        {isProcessing
                            ? <Loader2 className="w-7 h-7 animate-spin text-white" />
                            : <Mic className={`w-7 h-7 text-white ${!isMicActive ? 'opacity-60' : ''}`} />
                        }
                    </div>
                    <span className="absolute -bottom-5 text-[10px] uppercase font-bold tracking-wider text-teal-400/70 whitespace-nowrap">
                        {isMicActive ? 'Đang bật' : 'Bắt đầu'}
                    </span>
                </button>

                {/* End session */}
                <button
                    onClick={handleEndSession}
                    disabled={history.length < 2 || isRecording || isProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white font-medium rounded-full border border-slate-700/60 transition-all text-sm disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <span>Kết thúc</span>
                </button>
            </div>
        </div>
    )
}
