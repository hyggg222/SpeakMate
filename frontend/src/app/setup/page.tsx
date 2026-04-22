'use client';

import { ArrowLeft, Home, Settings, Sparkles, Loader2, RefreshCw, Trash2, Save, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/apiClient'
import { useScenario } from '@/context/ScenarioContext'
import { FullScenarioContext } from '@/types/api.contracts'
import { Users, User } from 'lucide-react'

const STORAGE_KEY = 'speakmate_saved_context';
interface AgentConfig {
    name: string;
    persona: string;
    gender: 'male' | 'female';
}

const DEFAULT_AGENT: AgentConfig = { name: '', persona: '', gender: 'male' };

// PII patterns (mirrors backend)
const PHONE_RE = /\b(0\d{9,10})\b/g;
const EMAIL_RE = /\b[\w.-]+@[\w.-]+\.\w{2,}\b/gi;
const CCCD_RE = /\b(\d{12})\b/g;

function detectPII(text: string): string | null {
    PHONE_RE.lastIndex = 0; EMAIL_RE.lastIndex = 0; CCCD_RE.lastIndex = 0;
    if (PHONE_RE.test(text)) return 'Phát hiện số điện thoại trong nội dung. Hãy xóa để bảo vệ thông tin cá nhân của bạn.';
    PHONE_RE.lastIndex = 0; EMAIL_RE.lastIndex = 0; CCCD_RE.lastIndex = 0;
    if (EMAIL_RE.test(text)) return 'Phát hiện địa chỉ email trong nội dung. Hãy xóa để bảo vệ thông tin cá nhân của bạn.';
    PHONE_RE.lastIndex = 0; EMAIL_RE.lastIndex = 0; CCCD_RE.lastIndex = 0;
    if (CCCD_RE.test(text)) return 'Phát hiện số CCCD trong nội dung. Hãy xóa để bảo vệ thông tin cá nhân của bạn.';
    return null;
}

export default function ContextBuilderPage() {
    const [userGoal, setUserGoal] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isAdjusting, setIsAdjusting] = useState(false)
    const [hasCreatedFirst, setHasCreatedFirst] = useState(false)
    const [saveIndicator, setSaveIndicator] = useState(false)
    const [adjustmentText, setAdjustmentText] = useState('')
    const [filterError, setFilterError] = useState<string | null>(null)
    const [piiWarning, setPiiWarning] = useState<string | null>(null)
    const { scenario, setScenario, setHistory, setAudioFileKeys } = useScenario()
    const router = useRouter()

    // Agent config state
    const [agentCount, setAgentCount] = useState<1 | 2>(1)
    const [agent1, setAgent1] = useState<AgentConfig>({ ...DEFAULT_AGENT })
    const [agent2, setAgent2] = useState<AgentConfig>({ ...DEFAULT_AGENT, gender: 'female' })
    const [activeCharIndex, setActiveCharIndex] = useState(0)


    // Load saved context from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const topic = params.get('topic');
            if (topic) {
                setUserGoal(topic);
                return;
            }

            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.scenario && parsed.scenario.scenario) {
                        setScenario(parsed.scenario);
                        setUserGoal(parsed.userGoal || '');
                        setHasCreatedFirst(true);
                    }
                } catch (e) {
                    console.error('Failed to load saved context:', e);
                }
            }
        }
    }, []);

    // Save context to localStorage whenever scenario changes
    const saveToMemory = useCallback((scenarioData: FullScenarioContext, goal: string) => {
        if (typeof window !== 'undefined') {
            const data = {
                scenario: scenarioData,
                userGoal: goal,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

            setSaveIndicator(true);
            setTimeout(() => setSaveIndicator(false), 2000);
        }
    }, []);

    // Build goal string with agent config appended
    const buildGoalWithAgents = (goal: string): string => {
        let enriched = goal;
        if (agentCount === 2) {
            const a1 = agent1.name ? `${agent1.name} (${agent1.gender === 'male' ? 'nam' : 'nữ'}): ${agent1.persona}` : '';
            const a2 = agent2.name ? `${agent2.name} (${agent2.gender === 'male' ? 'nam' : 'nữ'}): ${agent2.persona}` : '';
            if (a1 || a2) {
                enriched += `\n\n[CẤU HÌNH 2 NHÂN VẬT AI]\nNhân vật 1: ${a1 || 'Tự tạo'}\nNhân vật 2: ${a2 || 'Tự tạo'}`;
            } else {
                enriched += '\n\n[Yêu cầu: Tạo kịch bản có 2 nhân vật AI với tính cách khác nhau]';
            }
        } else if (agent1.name || agent1.persona) {
            enriched += `\n\n[CẤU HÌNH NHÂN VẬT AI]\nTên: ${agent1.name || 'Tự tạo'}, Giới tính: ${agent1.gender === 'male' ? 'nam' : 'nữ'}, Tính cách: ${agent1.persona || 'Tự tạo'}`;
        }
        return enriched;
    };

    // Real-time PII detection when user types
    const handleGoalChange = (val: string) => {
        setUserGoal(val);
        setFilterError(null);
        setPiiWarning(detectPII(val));
    };

    // FIRST TIME: Generate a brand new scenario
    const handleGenerateScenario = async () => {
        if (!userGoal.trim()) return;
        if (piiWarning) return; // Block if PII present
        setFilterError(null);
        setIsGenerating(true);
        try {
            const enrichedGoal = buildGoalWithAgents(userGoal);
            const result = await apiClient.setupScenario(enrichedGoal);

            const scenarioObj = result.scenario || result as any;
            if (agentCount === 2) {
                // Inject characters if LLM didn't generate them
                if (!scenarioObj?.characters?.length) {
                    const chars = [
                        { id: 'char_1', name: agent1.name || 'Nhân vật 1', persona: agent1.persona || scenarioObj.interviewerPersona || '', gender: agent1.gender, color: 'teal' },
                        { id: 'char_2', name: agent2.name || 'Nhân vật 2', persona: agent2.persona || 'Đồng nghiệp thân thiện', gender: agent2.gender, color: 'indigo' },
                    ];
                    scenarioObj.characters = chars;
                    if (!result.scenario) {
                        (result as any).scenario = scenarioObj;
                    }
                }
            } else {
                // Single agent — remove characters to ensure AUDIO mode
                delete scenarioObj.characters;
            }

            setScenario(result);
            setHistory([]);
            setAudioFileKeys([]);
            setHasCreatedFirst(true);
            saveToMemory(result, userGoal);
        } catch (error: any) {
            console.error('Error generating scenario:', error);
            if (error?.filtered) {
                setFilterError(error.message);
            } else {
                setFilterError('Không thể tạo kịch bản. Vui lòng kiểm tra lại kết nối.');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    // ADJUST: Modify the existing scenario with new text
    const handleAdjustScenario = async (adjustment?: string) => {
        const text = adjustment || adjustmentText;
        if (!text.trim() || !scenario) return;
        setIsAdjusting(true);
        try {
            const result = await apiClient.adjustScenario(scenario, text);
            setScenario(result);
            saveToMemory(result, userGoal);
            setAdjustmentText('');
        } catch (error) {
            console.error('Error adjusting scenario:', error);
            alert('Không thể điều chỉnh kịch bản. Vui lòng thử lại.');
        } finally {
            setIsAdjusting(false);
        }
    };

    // CREATE NEW: Reset everything and start fresh
    const handleCreateNew = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
        }
        setScenario(null);
        setUserGoal('');
        setHasCreatedFirst(false);
        setHistory([]);
        setAudioFileKeys([]);
        setAdjustmentText('');
        setAgentCount(1);
        setAgent1({ ...DEFAULT_AGENT });
        setAgent2({ ...DEFAULT_AGENT, gender: 'female' });
        setActiveCharIndex(0);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] w-full font-sans">
            {/* Custom Setup Header */}
            <header className="flex flex-row items-center justify-between px-6 py-3 bg-[#0f172a] text-white">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Quay lại</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                        <Home className="w-4 h-4" />
                        <span className="text-sm font-medium">Trang chủ</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    {/* Save Status Indicator */}
                    {saveIndicator && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full animate-fade-in">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-300">Đã lưu</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Mentor Ni</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-slate-800">
                            <Image src="/ni-avatar.png" alt="Mentor Ni" width={32} height={32} className="object-cover" />
                        </div>
                    </div>
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <Settings className="w-5 h-5 text-slate-300" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 lg:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12">

                {/* Left Panel: Input Data */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-[#0f172a]">Dữ liệu đầu vào</h1>
                        {hasCreatedFirst && (
                            <button
                                onClick={handleCreateNew}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-all border border-red-200 hover:border-red-300 hover:shadow-sm group"
                            >
                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>Tạo Bối Cảnh Mới</span>
                            </button>
                        )}
                    </div>

                    <div className="bg-[#0f172a] rounded-3xl p-6 lg:p-8 flex flex-col relative overflow-hidden text-white shadow-xl shadow-slate-200/50 border border-slate-200">

                        {/* Main Input — for first-time goal entry */}
                        <div className="bg-white rounded-2xl p-5 lg:p-6 mb-4 shadow-sm border border-slate-100 flex flex-col min-h-[140px]">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {hasCreatedFirst ? 'Nội dung gốc' : 'Nhập mục tiêu'}
                                </label>
                                {hasCreatedFirst && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                        <Save className="w-3 h-3" />
                                        Đã lưu trong bộ nhớ
                                    </span>
                                )}
                            </div>
                            <textarea
                                value={userGoal}
                                onChange={(e) => handleGoalChange(e.target.value)}
                                placeholder="Nhập đề cương, nội dung chính hoặc ý tưởng thuyết trình tại đây... Ví dụ: Tôi muốn phỏng vấn Software Engineer bằng tiếng Việt."
                                className="w-full flex-1 resize-none bg-transparent outline-none text-slate-700 placeholder:text-slate-400 text-[15px] leading-relaxed"
                                disabled={isGenerating || (hasCreatedFirst && true)}
                                readOnly={hasCreatedFirst}
                            />
                        </div>

                        {/* PII Warning — real-time */}
                        {piiWarning && (
                            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-sm">
                                <span className="shrink-0 mt-0.5">⚠️</span>
                                <span>{piiWarning}</span>
                            </div>
                        )}

                        {/* Filter Error — from server */}
                        {filterError && (
                            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-sm">
                                <span className="shrink-0 mt-0.5">🚫</span>
                                <span>{filterError}</span>
                            </div>
                        )}

                        {/* Adjustment Input — shown after first context is created */}
                        {hasCreatedFirst && (
                            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/50 rounded-2xl p-5 lg:p-6 mb-4 border border-slate-600/50 flex flex-col min-h-[120px] backdrop-blur-sm">
                                <label className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <RefreshCw className="w-3 h-3" />
                                    Điều chỉnh bối cảnh
                                </label>
                                <textarea
                                    value={adjustmentText}
                                    onChange={(e) => setAdjustmentText(e.target.value)}
                                    placeholder="Nhập điều chỉnh... Ví dụ: Tăng độ khó, thêm câu hỏi kỹ thuật, thay đổi vai trò đối phương..."
                                    className="w-full flex-1 resize-none bg-transparent outline-none text-slate-200 placeholder:text-slate-500 text-[14px] leading-relaxed"
                                    disabled={isAdjusting}
                                />
                            </div>
                        )}

                        {/* Agent Config — choose 1 or 2 AI characters */}
                        <div className="mb-4 relative z-10">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Số nhân vật AI</label>
                            <div className="flex gap-3 mb-4">
                                <button
                                    onClick={() => setAgentCount(1)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all border ${agentCount === 1
                                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                                        : 'bg-slate-800/50 border-slate-600/50 text-slate-400 hover:border-slate-500'}`}
                                >
                                    <User className="w-4 h-4" /> 1 nhân vật
                                </button>
                                <button
                                    onClick={() => setAgentCount(2)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all border ${agentCount === 2
                                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                                        : 'bg-slate-800/50 border-slate-600/50 text-slate-400 hover:border-slate-500'}`}
                                >
                                    <Users className="w-4 h-4" /> 2 nhân vật
                                </button>
                            </div>

                            {/* Agent cards */}
                            <div className={`grid gap-4 ${agentCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {/* Agent 1 */}
                                <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-600/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                                        <span className="text-sm font-semibold text-teal-300">Nhân vật {agentCount === 2 ? '1' : 'AI'}</span>
                                        <select
                                            value={agent1.gender}
                                            onChange={e => setAgent1(a => ({ ...a, gender: e.target.value as 'male' | 'female' }))}
                                            className="ml-auto text-xs bg-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 border border-slate-600 outline-none"
                                        >
                                            <option value="male">Nam</option>
                                            <option value="female">Nữ</option>
                                        </select>
                                    </div>
                                    <input
                                        value={agent1.name}
                                        onChange={e => setAgent1(a => ({ ...a, name: e.target.value }))}
                                        placeholder="Tên (VD: Anh Minh)"
                                        className="w-full bg-slate-700/50 text-slate-200 placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm outline-none border border-slate-600/30 focus:border-teal-500/50 mb-3"
                                    />
                                    <textarea
                                        value={agent1.persona}
                                        onChange={e => setAgent1(a => ({ ...a, persona: e.target.value }))}
                                        placeholder="Tính cách (VD: Giám đốc nghiêm túc, hay đưa ra những câu hỏi sắc bén và tình huống khó)"
                                        rows={4}
                                        className="w-full bg-slate-700/50 text-slate-200 placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm outline-none border border-slate-600/30 focus:border-teal-500/50 resize-none leading-relaxed"
                                    />
                                </div>

                                {/* Agent 2 */}
                                {agentCount === 2 && (
                                    <div className="bg-slate-800/60 rounded-2xl p-5 border border-indigo-500/30">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                                            <span className="text-sm font-semibold text-indigo-300">Nhân vật 2</span>
                                            <select
                                                value={agent2.gender}
                                                onChange={e => setAgent2(a => ({ ...a, gender: e.target.value as 'male' | 'female' }))}
                                                className="ml-auto text-xs bg-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 border border-slate-600 outline-none"
                                            >
                                                <option value="male">Nam</option>
                                                <option value="female">Nữ</option>
                                            </select>
                                        </div>
                                        <input
                                            value={agent2.name}
                                            onChange={e => setAgent2(a => ({ ...a, name: e.target.value }))}
                                            placeholder="Tên (VD: Chị Lan)"
                                            className="w-full bg-slate-700/50 text-slate-200 placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm outline-none border border-indigo-500/20 focus:border-indigo-500/50 mb-3"
                                        />
                                        <textarea
                                            value={agent2.persona}
                                            onChange={e => setAgent2(a => ({ ...a, persona: e.target.value }))}
                                            placeholder="Tính cách (VD: HR thân thiện, hay động viên ứng viên và đặt câu hỏi về văn hóa công ty)"
                                            rows={4}
                                            className="w-full bg-slate-700/50 text-slate-200 placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm outline-none border border-indigo-500/20 focus:border-indigo-500/50 resize-none leading-relaxed"
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Để trống để AI tự tạo nhân vật phù hợp với bối cảnh.</p>
                        </div>

                        <div className="flex justify-center mb-6 z-10 w-full relative">
                            {!hasCreatedFirst ? (
                                <button
                                    onClick={handleGenerateScenario}
                                    disabled={isGenerating || !userGoal.trim()}
                                    className="flex items-center justify-center gap-2 px-8 py-3 bg-[#0f172a] hover:bg-slate-800 text-teal-400 disabled:opacity-50 border-2 border-teal-500 rounded-full font-bold transition-all"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Đang phân tích cùng Gemini Brain (AI)...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            <span>Phân Tích Tạo Bối Cảnh</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleAdjustScenario()}
                                    disabled={isAdjusting || !adjustmentText.trim()}
                                    className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white disabled:opacity-50 rounded-full font-bold transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {isAdjusting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Đang điều chỉnh bối cảnh...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-5 h-5" />
                                            <span>Áp Dụng Điều Chỉnh</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>


                    </div>
                </div>

                {/* Right Panel: Context Details */}
                <div className="flex-[1.2] flex flex-col min-w-0">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Bối cảnh giao tiếp</h1>

                    <div className="flex gap-6 relative flex-1">

                        {/* Main Context Card */}
                        <div className="flex-1 bg-white rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col text-[15px] leading-relaxed">
                            <div className="space-y-5 text-slate-700 flex-1">
                                {scenario ? (() => {
                                    const s = (scenario.scenario || scenario) as any;
                                    return (<>
                                        <div>
                                            <strong className="text-slate-900 block mb-1.5">Tên kịch bản:</strong>
                                            <p className="text-sm font-medium text-slate-800">{s.scenarioName || s.title || ''}</p>
                                        </div>
                                        {(s.topic || s.description) && (
                                            <div>
                                                <strong className="text-slate-900 block mb-1.5">Chủ đề:</strong>
                                                <p className="text-sm text-slate-600 leading-relaxed">{s.topic || s.description}</p>
                                            </div>
                                        )}
                                        <div>
                                            <strong className="text-slate-900 block mb-1.5">Bối cảnh & vai trò:</strong>
                                            <p className="text-sm text-slate-600 leading-relaxed">{s.interviewerPersona || ''}</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 block mb-2">Mục tiêu luyện tập:</strong>
                                            <ul className="list-disc pl-5 text-sm space-y-1.5 text-slate-600">
                                                {(s.goals || []).map((goal: string, i: number) => <li key={i}>{goal}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 block mb-1.5">Câu mở đầu:</strong>
                                            <div className="text-sm italic bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600 leading-relaxed">
                                                &ldquo;{(s.startingTurns || [])[0]?.line || ''}&rdquo;
                                            </div>
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 block mb-2">Tiêu chí đánh giá:</strong>
                                            <div className="flex flex-wrap gap-2">
                                                {(scenario.evalRules?.categories || []).map((cat: any, i: number) => (
                                                    <span key={i} className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium border border-teal-100">
                                                        {cat.category || cat.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </>);
                                })() : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                        <Sparkles className="w-8 h-8 opacity-50" />
                                        <p className="text-center text-sm">Chưa có kịch bản.<br />Hãy điền thông tin bên trái và bấm <b>Phân Tích</b>.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Character Panel */}
                        <div className="w-[240px] shrink-0 flex flex-col">
                            <h3 className="text-sm font-bold text-slate-800 pt-2 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-teal-500" />
                                Nhân vật AI
                            </h3>

                            {scenario ? (() => {
                                const scenarioData = scenario.scenario || scenario as any;
                                const chars = scenarioData?.characters || [];
                                const hasDual = chars.length >= 2;

                                // Build display list: from characters array or fallback from interviewerPersona
                                const displayChars = hasDual
                                    ? chars
                                    : [{ id: 'char_1', name: scenarioData?.interviewerPersona?.split(',')[0]?.trim() || 'Nhân vật AI', persona: scenarioData?.interviewerPersona || '', gender: 'male', color: 'teal' }];

                                const current = displayChars[activeCharIndex] || displayChars[0];
                                const colorTheme = activeCharIndex === 0
                                    ? { bg: 'bg-teal-50', border: 'border-teal-200', dot: 'bg-teal-400', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-600' }
                                    : { bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-400', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-600' };

                                return (
                                    <div className="space-y-3">
                                        {/* Active character card */}
                                        <div className={`${colorTheme.bg} ${colorTheme.border} border rounded-2xl p-5 shadow-sm`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`w-2.5 h-2.5 rounded-full ${colorTheme.dot}`} />
                                                <span className={`text-sm font-bold ${colorTheme.text}`}>{current.name}</span>
                                            </div>
                                            <div className="flex gap-2 mb-3">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colorTheme.badge}`}>
                                                    {current.gender === 'female' ? 'Nữ' : 'Nam'}
                                                </span>
                                                {hasDual && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                        {activeCharIndex + 1}/{displayChars.length}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">{current.persona}</p>
                                        </div>

                                        {/* Toggle button for dual characters */}
                                        {hasDual && (
                                            <button
                                                onClick={() => setActiveCharIndex(i => i === 0 ? 1 : 0)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-all shadow-sm hover:shadow-md"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                <span>Chuyển nhân vật</span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })() : (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                                    <User className="w-6 h-6 opacity-40" />
                                    <p className="text-xs text-center">Tạo kịch bản để xem<br />thông tin nhân vật</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-10 flex justify-center">
                        <button
                            disabled={!scenario}
                            onClick={() => router.push('/setup/confirm')}
                            className="px-10 py-3.5 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full font-bold shadow-lg shadow-teal-500/30 transition-all hover:scale-105 active:scale-95">
                            {scenario ? 'Xác nhận & Bắt đầu Luyện Tập' : 'Vui lòng Phân Tích Kịch Bản trước'}
                        </button>
                    </div>
                </div>

            </main>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    )
}
