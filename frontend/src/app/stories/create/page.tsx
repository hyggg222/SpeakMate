'use client';

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { ArrowLeft, Sparkles, Save, Loader2, Mic, MicOff, UploadCloud, AlertTriangle, Send, X, MessageCircle } from "lucide-react";
import Link from "next/link";
import {
    FRAMEWORK_OPTIONS, FRAMEWORK_COLORS, STRUCTURED_FIELDS,
    estimateDuration, wordCount, MAX_FULLSCRIPT_WORDS, MAX_TAGS, MAX_TAG_LENGTH,
} from "@/lib/storybank-constants";
import { useStoryChat } from "@/hooks/useStoryChat";

type Stage = 'input' | 'chatting' | 'preview';

export default function CreateStoryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo');

    const {
        session, structuredResult, loading: chatLoading, error: chatError, scrollRef,
        hasExistingSession, restoreSession, startSession, initChat, sendMessage,
        structureNow, backToChat, clearSession,
    } = useStoryChat();

    // Stage — derived from session status when chatting/previewing
    const [stage, setStage] = useState<Stage>('input');
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);

    // Input stage
    const [rawInput, setRawInput] = useState("");
    const [inputMethod, setInputMethod] = useState<'text' | 'voice' | 'upload'>('text');
    const [framework, setFramework] = useState<string>("STAR");

    // Voice input
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recognitionRef = useRef<any>(null);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // File upload
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

    // Chat input
    const [chatInput, setChatInput] = useState("");

    // Preview stage (editable fields from structuredResult)
    const [title, setTitle] = useState("");
    const [structured, setStructured] = useState<any>(null);
    const [fullScript, setFullScript] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [status, setStatus] = useState<string>("draft");

    // Resume session check
    const [showResumePrompt, setShowResumePrompt] = useState(false);

    const scriptWordCount = wordCount(fullScript);
    const duration = estimateDuration(fullScript);

    // Sync chatError to local error
    useEffect(() => {
        if (chatError) setError(chatError);
    }, [chatError]);

    // Check for existing session on mount
    useEffect(() => {
        if (hasExistingSession()) {
            setShowResumePrompt(true);
        }
    }, [hasExistingSession]);

    // Sync stage with session status
    useEffect(() => {
        if (session?.status === 'chatting' || session?.status === 'structuring') {
            setStage('chatting');
        } else if (session?.status === 'previewing') {
            setStage('preview');
        }
    }, [session?.status]);

    // Populate preview fields when structuredResult changes
    useEffect(() => {
        if (structuredResult) {
            setTitle(structuredResult.title);
            setStructured(structuredResult.structured);
            setFullScript(structuredResult.fullScript);
            setTags(structuredResult.suggestedTags);
        }
    }, [structuredResult]);

    // Init chat when entering chatting stage for the first time
    useEffect(() => {
        if (session && session.status === 'chatting' && session.chatMessages.length === 0) {
            initChat();
        }
    }, [session?.status, session?.chatMessages.length, initChat]);

    // --- Voice Input (Web Speech API) ---
    const toggleVoiceInput = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
            const finals: string[] = [];
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finals.push(event.results[i][0].transcript);
                }
            }
            if (finals.length > 0) {
                setRawInput(prev => (prev ? prev + ' ' : '') + finals.join(' '));
            }
        };

        recognition.onerror = () => { setIsRecording(false); if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; } };
        recognition.onend = () => { setIsRecording(false); if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; } };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        setRecordingDuration(0);
        recordingTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
        setInputMethod('voice');
    };

    // --- File Upload ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError("File quá lớn (tối đa 5MB).");
            return;
        }
        try {
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                const text = await file.text();
                setRawInput(prev => prev ? prev + '\n' + text : text);
                setInputMethod('upload');
                setUploadedFileName(file.name);
            } else {
                setError("Chỉ hỗ trợ file .txt.");
            }
        } catch {
            setError("Không thể đọc file.");
        }
        e.target.value = '';
    };

    // --- Start Chat ---
    const handleStartChat = () => {
        if (rawInput.length < 10) return;
        setError(null);
        startSession(framework, rawInput, inputMethod);
    };

    // --- Send Chat Message ---
    const handleSendMessage = () => {
        const text = chatInput.trim();
        if (!text || chatLoading) return;
        setChatInput("");
        sendMessage(text);
    };

    // --- Save Story ---
    const handleSave = async () => {
        if (scriptWordCount > MAX_FULLSCRIPT_WORDS) {
            setError(`Đoạn nói tối đa ${MAX_FULLSCRIPT_WORDS} từ (hiện có ${scriptWordCount} từ).`);
            return;
        }
        setSaveLoading(true);
        setError(null);
        try {
            const story = await apiClient.saveStory({
                title,
                rawInput: session?.initialInput || rawInput,
                inputMethod: session?.inputMethod || inputMethod,
                framework: session?.framework || framework,
                structured,
                fullScript,
                estimatedDuration: duration,
                tags,
                status,
            });
            clearSession();
            if (returnTo) {
                sessionStorage.setItem('pendingStoryForContext', story.id);
                router.push(returnTo);
            } else {
                router.push(`/stories/${story.id}`);
            }
        } catch (err: any) {
            setError(err.message || "Không thể lưu. Vui lòng thử lại.");
            setSaveLoading(false);
        }
    };

    const addTag = () => {
        const trimmed = newTag.trim();
        if (trimmed && !tags.includes(trimmed) && tags.length < MAX_TAGS && trimmed.length <= MAX_TAG_LENGTH) {
            setTags([...tags, trimmed]);
            setNewTag("");
        }
    };

    const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

    // --- Resume / Discard Session ---
    const handleResumeSession = () => {
        const restored = restoreSession();
        if (restored) {
            setFramework(restored.framework);
            setRawInput(restored.initialInput);
            setInputMethod(restored.inputMethod);
        }
        setShowResumePrompt(false);
    };

    const handleDiscardSession = () => {
        clearSession();
        setShowResumePrompt(false);
    };

    const fields = STRUCTURED_FIELDS[session?.framework || framework] || STRUCTURED_FIELDS.STAR;
    const frameworkColor = FRAMEWORK_COLORS[session?.framework || framework] || FRAMEWORK_COLORS.STAR;
    const isLoading = chatLoading || saveLoading;

    return (
        <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
            <Sidebar />
            <main className="flex flex-col flex-1 overflow-hidden">
                <Topbar />

                {/* Resume Session Prompt */}
                {showResumePrompt && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                                    <Image src="/ni-avatar.png" alt="Ni" width={40} height={40} className="object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Phiên tạo chuyện đang dở</h3>
                                    <p className="text-xs text-slate-500">Bạn có muốn tiếp tục?</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleResumeSession}
                                    className="flex-1 px-4 py-2 rounded-xl text-white font-medium"
                                    style={{ backgroundColor: "var(--teal)" }}>
                                    Tiếp tục
                                </button>
                                <button onClick={handleDiscardSession}
                                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                                    Tạo mới
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <section className="flex-1 overflow-y-auto px-[5%] xl:px-[12%] py-10 bg-[#f8fafc]">
                    <div className="max-w-5xl mx-auto space-y-6">

                        {/* Back link */}
                        <Link href="/stories" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                            <ArrowLeft size={16} /> Quay lại Kho Chuyện
                        </Link>

                        <h1 className="text-2xl font-bold font-serif" style={{ color: "var(--foreground)" }}>
                            Tạo Chuyện Mới
                        </h1>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                                <AlertTriangle size={16} className="flex-shrink-0" /> {error}
                            </div>
                        )}

                        {/* === INPUT STAGE === */}
                        {stage === 'input' && (
                            <div className="space-y-5">
                                {/* Framework Selector */}
                                <div className="bg-white border rounded-2xl p-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Framework</label>
                                    <div className="flex gap-3">
                                        {FRAMEWORK_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setFramework(opt.value)}
                                                className={`flex-1 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                                                    framework === opt.value
                                                        ? 'border-[var(--teal)] bg-teal-50/50'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <span className="text-xs font-bold px-2 py-0.5 rounded text-white inline-block mb-1"
                                                    style={{ backgroundColor: FRAMEWORK_COLORS[opt.value] }}>
                                                    {opt.label}
                                                </span>
                                                <p className="text-[11px] text-slate-500">{opt.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Input Area */}
                                <div className="bg-white border rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">
                                                Kể cho Ni nghe trải nghiệm của bạn
                                            </label>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Viết tự do, nói bằng giọng, hoặc upload file — Ni sẽ hỏi thêm để làm giàu câu chuyện.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={toggleVoiceInput}
                                                className={`p-2.5 rounded-xl border transition-all ${
                                                    isRecording
                                                        ? 'bg-red-50 border-red-300 text-red-500 animate-pulse'
                                                        : 'border-slate-200 text-slate-400 hover:text-[var(--teal)] hover:border-[var(--teal)]'
                                                }`}
                                                title={isRecording ? "Dừng ghi âm" : "Nói bằng giọng"}
                                            >
                                                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                                            </button>
                                            <label className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-[var(--teal)] hover:border-[var(--teal)] transition-all cursor-pointer"
                                                title="Upload file (.txt)">
                                                <UploadCloud size={18} />
                                                <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
                                            </label>
                                        </div>
                                    </div>

                                    {isRecording && (
                                        <div className="flex items-center justify-between text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                Đang nghe... Nói xong bấm mic để dừng.
                                            </div>
                                            <span className="font-mono font-bold text-red-600">
                                                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                    )}

                                    {uploadedFileName && !isRecording && (
                                        <div className="flex items-center justify-between text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <UploadCloud size={14} className="text-slate-400" />
                                                <span className="truncate">{uploadedFileName}</span>
                                            </div>
                                            <button onClick={() => setUploadedFileName(null)} className="text-slate-400 hover:text-slate-600">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}

                                    <textarea
                                        value={rawInput}
                                        onChange={e => { setRawInput(e.target.value); setInputMethod('text'); }}
                                        placeholder='Kể ngắn về một trải nghiệm bạn tự hào — ví dụ: đồ án, cuộc thi, lần giải quyết vấn đề...'
                                        rows={8}
                                        className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-y focus:ring-2 focus:ring-[var(--teal)]/30 min-h-[150px]"
                                    />
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-400">
                                            {rawInput.length} ký tự {rawInput.length > 0 && rawInput.length < 10 && "— cần ít nhất 10"}
                                        </p>
                                        {inputMethod !== 'text' && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                {inputMethod === 'voice' ? 'Nhập bằng giọng' : 'Upload file'}
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleStartChat}
                                        disabled={rawInput.length < 10}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        style={{ backgroundColor: "var(--teal)" }}
                                    >
                                        <MessageCircle size={18} /> Khởi tạo câu chuyện
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* === CHATTING STAGE === */}
                        {stage === 'chatting' && session && (
                            <div className="bg-white border rounded-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
                                {/* Chat Header */}
                                <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50/80">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
                                            <Image src="/ni-avatar.png" alt="Ni" width={36} height={36} className="object-cover" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-semibold text-slate-800">Tạo câu chuyện mới</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white"
                                                    style={{ backgroundColor: frameworkColor }}>
                                                    {session.framework}
                                                </span>
                                                <span className="text-[11px] text-slate-400">{session.totalTurns} lượt chat</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => { setStage('input'); clearSession(); }}
                                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Chat Messages */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                                    {/* Initial input context bubble */}
                                    <div className="flex justify-end">
                                        <div className="max-w-[75%] bg-[var(--teal)]/10 border border-[var(--teal)]/20 rounded-2xl rounded-tr-md px-4 py-3">
                                            <p className="text-[11px] text-[var(--teal)] font-medium mb-1">Ý tưởng ban đầu</p>
                                            <p className="text-sm text-slate-700">{session.initialInput}</p>
                                        </div>
                                    </div>

                                    {session.chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'mentor' && (
                                                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 mr-2 mt-1">
                                                    <Image src="/ni-avatar.png" alt="Ni" width={32} height={32} className="object-cover" />
                                                </div>
                                            )}
                                            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                                                msg.role === 'user'
                                                    ? 'bg-[var(--teal)] text-white rounded-tr-md'
                                                    : 'bg-slate-100 text-slate-800 rounded-tl-md'
                                            }`}>
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                {msg.role === 'mentor' && msg.fieldTargeted && (
                                                    <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-slate-500">
                                                        {msg.fieldTargeted}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Loading indicator */}
                                    {chatLoading && session.status === 'chatting' && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                                                <Image src="/ni-avatar.png" alt="Ni" width={32} height={32} className="object-cover" />
                                            </div>
                                            <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-3">
                                                <div className="flex gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Structuring loading */}
                                    {session.status === 'structuring' && (
                                        <div className="flex items-center justify-center py-6">
                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <Loader2 size={20} className="animate-spin text-[var(--teal)]" />
                                                Đang cấu trúc hóa câu chuyện...
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chat Footer */}
                                <div className="border-t px-4 py-3 space-y-3">
                                    {/* Chat Input */}
                                    <div className="flex items-end gap-2">
                                        <textarea
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            placeholder="Trả lời Ni..."
                                            rows={1}
                                            disabled={chatLoading || session.status === 'structuring'}
                                            className="flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--teal)]/30 disabled:opacity-50 max-h-[100px]"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!chatInput.trim() || chatLoading || session.status === 'structuring'}
                                            className="p-2.5 rounded-xl text-white disabled:opacity-50 transition-all flex-shrink-0"
                                            style={{ backgroundColor: "var(--teal)" }}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>

                                    {/* Structure Button — ALWAYS visible, ALWAYS enabled */}
                                    <button
                                        onClick={structureNow}
                                        disabled={chatLoading || session.status === 'structuring'}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-base disabled:opacity-70 transition-all"
                                        style={{ backgroundColor: "var(--teal)" }}
                                    >
                                        {session.status === 'structuring' ? (
                                            <><Loader2 size={20} className="animate-spin" /> Đang cấu trúc hóa...</>
                                        ) : (
                                            <><Sparkles size={20} /> Cấu trúc hóa câu chuyện</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* === PREVIEW STAGE === */}
                        {stage === 'preview' && (
                            <div className="space-y-5">
                                {/* Missing Fields Banner */}
                                {structuredResult && structuredResult.missingFields.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                                        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm text-amber-800">
                                                {structuredResult.completenessNote || `Phần ${structuredResult.missingFields.join(', ')} chưa rõ — bạn có thể bổ sung sau.`}
                                            </p>
                                            <button onClick={backToChat}
                                                className="text-sm text-amber-700 font-medium hover:underline mt-1">
                                                Quay lại chat để bổ sung
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Title */}
                                <div className="bg-white border rounded-2xl p-6 space-y-3">
                                    <label className="block text-sm font-medium text-slate-700">Tiêu đề</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full border rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--teal)]/30"
                                        maxLength={200}
                                    />
                                    <p className="text-xs text-slate-400 text-right">{title.length}/200</p>
                                </div>

                                {/* Structured Fields */}
                                <div className="bg-white border rounded-2xl p-6 space-y-4">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: frameworkColor }}>
                                            {session?.framework || framework}
                                        </span>
                                        Cấu trúc
                                    </h3>
                                    {fields.map(({ key, label, emoji }) => {
                                        const isMissing = structuredResult?.missingFields?.includes(key);
                                        return (
                                            <div key={key}>
                                                <label className={`block text-xs font-medium mb-1 ${isMissing ? 'text-amber-600' : 'text-slate-500'}`}>
                                                    {emoji} {label} {isMissing && <span className="text-amber-500">(thiếu)</span>}
                                                </label>
                                                <textarea
                                                    value={structured?.[key] || ""}
                                                    onChange={e => setStructured({ ...structured, [key]: e.target.value })}
                                                    rows={3}
                                                    className={`w-full border rounded-xl px-4 py-2 text-sm outline-none resize-y focus:ring-2 focus:ring-[var(--teal)]/30 ${
                                                        isMissing ? 'border-amber-300 bg-amber-50/30' : ''
                                                    }`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Full Script */}
                                <div className="bg-white border rounded-2xl p-6 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-800">Đoạn nói hoàn chỉnh</h3>
                                        <span className="text-xs text-slate-400">~{duration}s</span>
                                    </div>
                                    <textarea
                                        value={fullScript}
                                        onChange={e => setFullScript(e.target.value)}
                                        rows={8}
                                        className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-y focus:ring-2 focus:ring-[var(--teal)]/30 leading-relaxed min-h-[180px]"
                                    />
                                    <p className={`text-xs ${scriptWordCount > MAX_FULLSCRIPT_WORDS ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                                        {scriptWordCount}/{MAX_FULLSCRIPT_WORDS} từ
                                        {scriptWordCount > MAX_FULLSCRIPT_WORDS && " — vượt giới hạn!"}
                                    </p>
                                </div>

                                {/* Tags */}
                                <div className="bg-white border rounded-2xl p-6 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-800">Tags</h3>
                                        <span className="text-xs text-slate-400">{tags.length}/{MAX_TAGS}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                                                {tag}
                                                <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                    {tags.length < MAX_TAGS && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newTag}
                                                onChange={e => setNewTag(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                                placeholder="Thêm tag..."
                                                maxLength={MAX_TAG_LENGTH}
                                                className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]/30 w-40"
                                            />
                                            <button onClick={addTag} className="text-sm text-[var(--teal)] font-medium hover:underline">Thêm</button>
                                        </div>
                                    )}
                                </div>

                                {/* Status & Save */}
                                <div className="bg-white border rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <label className="text-sm font-medium text-slate-700">Trạng thái:</label>
                                        <select value={status} onChange={e => setStatus(e.target.value)}
                                            className="border rounded-xl px-4 py-2 text-sm outline-none bg-white cursor-pointer">
                                            <option value="draft">Bản nháp</option>
                                            <option value="ready">Sẵn sàng</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            onClick={handleSave}
                                            disabled={!title.trim() || !fullScript.trim() || scriptWordCount > MAX_FULLSCRIPT_WORDS || isLoading}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium disabled:opacity-50 transition-all"
                                            style={{ backgroundColor: "var(--teal)" }}
                                        >
                                            {saveLoading ? <><Loader2 size={18} className="animate-spin" /> Đang lưu...</> : <><Save size={18} /> Lưu vào Kho Chuyện</>}
                                        </button>
                                        <button onClick={backToChat}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                                            <MessageCircle size={16} /> Quay lại chat
                                        </button>
                                        <button onClick={() => { setStage('input'); clearSession(); }}
                                            className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                                            Làm lại
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
