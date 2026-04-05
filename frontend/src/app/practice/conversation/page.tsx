'use client'

import { ArrowLeft, Home, Settings, Mic, Loader2, RotateCcw, Sparkles, Send, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { useScenario } from '@/context/ScenarioContext'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useLiveKitRoom, TurnData } from '@/hooks/useLiveKitRoom'
import { useGeminiDirect } from '@/hooks/useGeminiDirect'
import { useBrowserTTS } from '@/hooks/useBrowserTTS'
import { useSileroVAD } from '@/hooks/useSileroVAD'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { RobotAvatar } from '@/components/practice/RobotAvatar'
import { FloatingTranscripts } from '@/components/practice/FloatingTranscripts'

/** Strip bracketed placeholders like [tên của bạn], [name], [địa điểm] from text */
function sanitize(text: string): string {
    let r = text.replace(/\[(?:tên của bạn|tên bạn|your name|tên|name|họ tên|địa điểm|chủ đề|topic)[^\]]*\]/gi, 'bạn')
    r = r.replace(/\[[^\]]{1,30}\]/g, '')
    return r.replace(/\s{2,}/g, ' ').trim()
}

const mode: 'gemini-direct' | 'livekit' | 'http' =
    FEATURE_FLAGS.useGeminiDirect ? 'gemini-direct'
        : FEATURE_FLAGS.useLiveKit ? 'livekit'
            : 'http';

export default function ConversationStudioPage() {
    const router = useRouter()
    const { scenario, history, setHistory, audioFileKeys, setAudioFileKeys, livekitSession, setLivekitSession, geminiDirectSession, setGeminiDirectSession } = useScenario()
    const { isRecording, startRecording, stopRecording } = useAudioRecorder()

    // Ref to always have latest history inside callbacks (avoids stale closure)
    const historyRef = useRef<any[]>(history)
    useEffect(() => { historyRef.current = history }, [history])

    const [isProcessing, setIsProcessing] = useState(false)
    const [currentBotMsg, setCurrentBotMsg] = useState('Đang khởi tạo kịch bản...')
    const [showTextInput, setShowTextInput] = useState(false)
    const [textInput, setTextInput] = useState('')
    const textInputRef = useRef<HTMLInputElement>(null)

    // Shared turn callback for both LiveKit and Gemini Direct
    const handleNewTurn = useCallback((turn: TurnData) => {
        setHistory((prev: any[]) => [...prev, {
            speaker: turn.speaker,
            character_id: turn.character_id,
            character_name: turn.character_name,
            line: sanitize(turn.line),
            turn_index: turn.turn_index,
            confirmed: turn.confirmed ?? false
        }]);
    }, [setHistory]);

    const handleTurnConfirmed = useCallback((turnIndex: number) => {
        setHistory((prev: any[]) => prev.map(t =>
            t.turn_index === turnIndex ? { ...t, confirmed: true } : t
        ));
    }, [setHistory]);

    // LiveKit integration
    const lk = useLiveKitRoom(handleNewTurn, handleTurnConfirmed);

    // Browser TTS for secondary character voice
    const browserTTS = useBrowserTTS();

    // Silero VAD for instant speech detection UI
    const sileroVAD = useSileroVAD();

    // Gemini Direct integration (with browser TTS for dual-character)
    const gd = useGeminiDirect(handleNewTurn, browserTTS);

    const [forceReady, setForceReady] = useState(false);

    // Unified state from active mode
    const isConnected = mode === 'gemini-direct' ? gd.isConnected : mode === 'livekit' ? lk.isConnected : false;
    const isAgentReady = forceReady || (mode === 'gemini-direct' ? gd.isAgentReady : mode === 'livekit' ? lk.isAgentReady : true);
    const isAgentSpeaking = mode === 'gemini-direct' ? (gd.isAgentSpeaking || browserTTS.isSpeaking) : mode === 'livekit' ? lk.isAgentSpeaking : false;
    const isUserSpeaking = mode === 'gemini-direct' ? (sileroVAD.isSpeaking || gd.isUserSpeaking) : mode === 'livekit' ? lk.isUserSpeaking : false;
    const isMicEnabled = mode === 'gemini-direct' ? gd.isMicEnabled : mode === 'livekit' ? lk.isMicEnabled : false;
    const isRealtimeMode = mode !== 'http';

    // Story 2.3 — Redo state
    const [redoCount, setRedoCount] = useState(2)

    // Story 2.2 — Scaffolding Hints state
    const [hints, setHints] = useState<string[]>([])
    const [showHints, setShowHints] = useState(false)
    const [isLoadingHints, setIsLoadingHints] = useState(false)

    const hasConnectedRef = useRef(false);

    // Clear sessions on unmount so next confirm page triggers fresh creation
    useEffect(() => {
        return () => {
            setLivekitSession(null);
            setGeminiDirectSession(null);
        };
    }, [setLivekitSession, setGeminiDirectSession]);

    // Redirect if no scenario
    useEffect(() => {
        if (!scenario) router.push('/setup');
    }, [scenario, router]);

    // Connect to realtime service (runs once)
    useEffect(() => {
        if (!scenario || !isRealtimeMode || hasConnectedRef.current) return;
        hasConnectedRef.current = true;

        const doConnect = async () => {
            try {
                if (mode === 'gemini-direct') {
                    const scenarioData = scenario.scenario || scenario as any;
                    const chars = (scenarioData as any)?.characters?.map((c: any) => ({ id: c.id, name: c.name, gender: c.gender }));
                    if (geminiDirectSession) {
                        await gd.connect(geminiDirectSession.token, geminiDirectSession.model, chars);
                    } else {
                        // Retry up to 2 times with 2s gap (backend may be starting up)
                        let lastErr: unknown;
                        for (let attempt = 1; attempt <= 2; attempt++) {
                            try {
                                const data = await apiClient.createGeminiDirectToken(scenarioData);
                                await gd.connect(data.token, data.model, (data as any).characters || chars);
                                lastErr = null;
                                break;
                            } catch (e) {
                                lastErr = e;
                                console.warn(`[GeminiDirect] Token attempt ${attempt}/2:`, (e as any)?.message);
                                if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
                            }
                        }
                        if (lastErr) throw lastErr;
                    }
                } else if (mode === 'livekit') {
                    if (livekitSession) {
                        await lk.connect(livekitSession.token, livekitSession.livekitUrl);
                    } else {
                        const data = await apiClient.createLivekitSession(scenario.scenario || scenario as any, []);
                        await lk.connect(data.token, data.livekitUrl);
                    }
                }
            } catch (e) {
                console.warn(`[${mode}] realtime connect failed, falling back to HTTP mode:`, (e as any)?.message);
                hasConnectedRef.current = false;
                // Fall back gracefully — HTTP mode will work without realtime
                setForceReady(true);
            }
        };
        doConnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scenario]);

    // Set initial bot message for HTTP mode (single-char)
    useEffect(() => {
        if (!scenario || isRealtimeMode || history.length > 0) return;
        const firstTurn = sanitize((scenario.scenario || scenario as any).startingTurns?.[0]?.line || 'Chào bạn, chúng ta bắt đầu phần luyện tập nhé.');
        setCurrentBotMsg(firstTurn);
        setHistory([{ speaker: 'AI', line: firstTurn }]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scenario]);


    // Timeout: if not ready after 15s, force ready (user can use text input)
    useEffect(() => {
        if (isAgentReady || !isRealtimeMode) return;
        const timer = setTimeout(() => {
            if (!isAgentReady) {
                console.warn('[Conversation] Agent not ready after 15s, forcing ready for text mode');
                setForceReady(true);
            }
        }, 15000);
        return () => clearTimeout(timer);
    }, [isAgentReady, isRealtimeMode]);

    // Auto-enable mic + start Silero VAD once agent is ready
    const hasAutoEnabledMic = useRef(false);
    useEffect(() => {
        if (isRealtimeMode && isConnected && isAgentReady && !isMicEnabled && !hasAutoEnabledMic.current) {
            hasAutoEnabledMic.current = true;
            if (mode === 'gemini-direct') {
                // Mic is auto-enabled on connect for Gemini Direct
                // Start Silero VAD for instant UI feedback
                sileroVAD.start();
            } else {
                lk.toggleMic();
            }
        }
    }, [isRealtimeMode, isConnected, isAgentReady, isMicEnabled])

    const playAudioUrl = (url: string) => {
        const audio = new Audio(url);
        audio.play().catch(e => {
            console.error("Error playing bot audio:", e);
        });
    };

    /** Play base64-encoded audio (WAV or raw PCM) returned by Modal NeuTTS */
    const playAudioBase64 = async (base64: string, mimeType?: string) => {
        try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            if (!mimeType || mimeType.includes('wav') || mimeType.includes('mpeg') || mimeType.includes('mp3')) {
                // WAV / MP3: play via HTMLAudioElement (handles headers automatically)
                const blob = new Blob([bytes], { type: mimeType || 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audio.onended = () => URL.revokeObjectURL(url);
                await audio.play();
            } else {
                // Raw PCM fallback (e.g. audio/pcm;rate=24000)
                const sampleRate = mimeType?.match(/rate=(\d+)/)?.[1]
                    ? parseInt(mimeType.match(/rate=(\d+)/)![1])
                    : 24000;
                const int16 = new Int16Array(bytes.buffer);
                const float32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
                const ctx = new AudioContext({ sampleRate });
                const buf = ctx.createBuffer(1, float32.length, sampleRate);
                buf.getChannelData(0).set(float32);
                const src = ctx.createBufferSource();
                src.buffer = buf;
                src.connect(ctx.destination);
                src.start();
            }
        } catch (e) {
            console.error("Error playing audio base64:", e);
        }
    };

    const handleMicToggle = async () => {
        if (isProcessing) return;

        if (mode === 'gemini-direct') {
            await gd.toggleMic();
            if (!gd.isMicEnabled) setShowHints(false);
            return;
        }

        if (mode === 'livekit') {
            await lk.toggleMic();
            if (!lk.isMicEnabled) setShowHints(false);
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
        const scenarioData = scenario?.scenario || scenario as any;

        try {
            const result = await apiClient.interactAudio(blob, scenarioData, history);
            if (result.botAudioUrl) {
                playAudioUrl(result.botAudioUrl);
            }
            setHistory([...history,
                { speaker: 'User', line: result.userTranscript },
                { speaker: 'AI', line: sanitize(result.botResponse) }
            ]);
            if (result.audioUploadedKey) {
                setAudioFileKeys([...audioFileKeys, result.audioUploadedKey]);
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

    // Text input — send through Gemini Live session or HTTP API
    const handleTextSend = async () => {
        const text = textInput.trim();
        if (!text || isProcessing) return;
        setTextInput('');

        const scenarioData = scenario?.scenario || scenario as any;

        // Add user turn to history immediately
        setHistory((prev: any[]) => [...prev, { speaker: 'User', line: text, confirmed: true }]);

        if (mode === 'gemini-direct' && isConnected) {
            gd.sendText(text);
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://speakmate-k26b.onrender.com/api'}/practice/interact-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioStr: JSON.stringify(scenarioData),
                    conversationHistoryStr: JSON.stringify(historyRef.current),
                    userMessage: text,
                }),
            });
            const data = await res.json();
            const aiResponse = sanitize(data.botResponse || data.response || 'Xin lỗi, tôi chưa hiểu.');
            setHistory((prev: any[]) => [...prev, { speaker: 'AI', line: aiResponse, confirmed: true }]);
            browserTTS.speak(aiResponse);
        } catch (err) {
            console.error('Text interaction error:', err);
            setHistory((prev: any[]) => [...prev, { speaker: 'AI', line: 'Xin lỗi, có lỗi xảy ra.', confirmed: true }]);
        } finally {
            setIsProcessing(false);
        }
        textInputRef.current?.focus();
    };

    const handleEndSession = () => {
        if (history.length < 2) return;
        sileroVAD.stop();
        if (mode === 'gemini-direct') {
            gd.disconnect();
            setGeminiDirectSession(null);
        } else if (mode === 'livekit') {
            lk.disconnect();
        }
        setLivekitSession(null);
        router.push('/evaluation/overall');
    }

    // Unified state
    const isListening = isRecording || (isRealtimeMode && isMicEnabled && isUserSpeaking);
    const isBotResponding = isProcessing || (isRealtimeMode && isAgentSpeaking);
    const isMicActive = isRecording || (isRealtimeMode && isMicEnabled);

    const userHasSpoken = history.some((msg: any) => msg.speaker === 'User');
    const scenarioChars = (scenario?.scenario as any)?.characters || [];
    const personaName = scenarioChars.length > 0
        ? scenarioChars[0].name
        : (scenario?.scenario || scenario as any)?.interviewerPersona?.split(' ')?.[0] || 'Ni'

    return (
        <div className="relative flex flex-col h-screen bg-[#0d1117] text-white font-sans overflow-hidden">

            {/* Loading overlay — shown until agent is ready */}
            {isRealtimeMode && !isAgentReady && (
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
                            {mode === 'gemini-direct' ? 'Đang kết nối Gemini Live...' : 'AI Agent đang tải, vui lòng chờ một chút'}
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

            {/* ── Layout chính: Chia đôi màn hình (Split Screen) ──────── */}
            <div className="flex-1 flex flex-col md:flex-row w-full pt-16 pb-24 md:pt-20 md:pb-28 h-full relative z-10">

                {/* Panel Trái: Avatar & Waveform */}
                <div className="w-full md:w-5/12 flex flex-col items-center justify-center relative p-6 border-b md:border-b-0 md:border-r border-slate-800/50">

                    {/* Connection badge */}
                    {isRealtimeMode && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-800/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-slate-700/50">
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-teal-400 animate-pulse' : 'bg-slate-600'}`} />
                            <span className="text-[11px] font-medium text-slate-400">{isConnected ? 'Đã kết nối' : 'Đang kết nối...'}</span>
                        </div>
                    )}

                    <RobotAvatar isSpeaking={isBotResponding} isListening={isListening} />


                </div>

                {/* Panel Phải: Chat Log */}
                <div className="flex-1 w-full md:w-7/12 flex flex-col relative h-full overflow-y-auto md:overflow-hidden bg-slate-900/20">

                    {/* Hints overlay */}
                    <div className="absolute top-4 left-0 right-0 z-30 px-4 flex justify-center pointer-events-none">
                        <AnimatePresence>
                            {showHints && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="w-full max-w-lg pointer-events-auto"
                                >
                                    <div className="bg-[#161b22]/95 backdrop-blur-md rounded-2xl border border-amber-500/30 p-4 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles className="w-4 h-4 text-amber-400" />
                                            <span className="text-sm font-semibold text-amber-300">Gợi ý từ Ni</span>
                                            <button onClick={() => setShowHints(false)} className="ml-auto text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-slate-800">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                            </button>
                                        </div>
                                        {isLoadingHints ? (
                                            <div className="flex items-center justify-center gap-2 py-4">
                                                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                                                <span className="text-sm font-medium text-slate-400">Ni đang nghĩ...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {hints.map((hint, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-3.5 py-2 bg-amber-500/10 text-amber-200/90 rounded-xl text-sm border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-default leading-snug"
                                                    >
                                                        💡 {hint}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex-1 w-full h-full p-4 md:p-8">
                        <FloatingTranscripts
                            history={history}
                            isUserSpeaking={isListening}
                            isBotResponding={isBotResponding}
                            isListening={isListening}
                            personaName={personaName}
                            characters={scenarioChars}
                        />
                    </div>
                </div>
            </div>

            {/* ── Text Input Bar (toggle) ──────────────────────────── */}
            {showTextInput && (
                <div className="absolute bottom-[88px] left-0 right-0 z-20 px-6 flex justify-center">
                    <div className="w-full max-w-lg flex items-center gap-2 bg-slate-800/90 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2 shadow-xl">
                        <input
                            ref={textInputRef}
                            value={textInput}
                            onChange={e => setTextInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend(); } }}
                            placeholder="Nhập tin nhắn thay vì nói..."
                            disabled={isProcessing}
                            className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-500 text-sm outline-none py-1.5"
                        />
                        <button
                            onClick={handleTextSend}
                            disabled={!textInput.trim() || isProcessing}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-30 transition-all shrink-0"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            )}

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

                {/* Text mode toggle */}
                <button
                    onClick={() => { setShowTextInput(v => !v); setTimeout(() => textInputRef.current?.focus(), 100); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border font-medium transition-all text-sm ${showTextInput ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700/60'}`}
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Text</span>
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
