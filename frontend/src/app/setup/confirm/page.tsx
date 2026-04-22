'use client'

import { ArrowLeft, Home, Loader2, BookOpen, Plus, ChevronDown, ChevronUp, Clock, Search, CheckCircle2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useScenario } from '@/context/ScenarioContext'
import { apiClient } from '@/lib/apiClient'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { useStoryBankSuggestions } from '@/hooks/useStoryBankSuggestions'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: "Bản nháp", color: "#94a3b8" },
    ready: { label: "Sẵn sàng", color: "#10b981" },
    "battle-tested": { label: "Thực chiến", color: "#f59e0b" },
};

export default function ContextConfirmationPage() {
    const { scenario, livekitSession, setLivekitSession, geminiDirectSession, setGeminiDirectSession, selectedStoryIds, setSelectedStoryIds } = useScenario()
    const router = useRouter()
    const hasPreCreatedRef = useRef(false)

    // Story Bank
    const scenarioData = scenario?.scenario || scenario as any;
    const relevantTags = scenarioData?.relevantTags
        || [scenarioData?.scenarioName, ...(scenarioData?.goals || [])].filter(Boolean).slice(0, 5);
    const { suggestions: storySuggestions, loading: storiesLoading, allStories, hasStories } = useStoryBankSuggestions(
        relevantTags.length > 0 ? relevantTags : undefined
    );

    // Browse mode
    const [showAll, setShowAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Selected stories (local toggle)
    const toggleStory = (id: string) => {
        setSelectedStoryIds(
            selectedStoryIds.includes(id)
                ? selectedStoryIds.filter(s => s !== id)
                : [...selectedStoryIds, id]
        );
    };

    // Filter stories for browse mode
    const filteredStories = useMemo(() => {
        const source = showAll ? allStories : storySuggestions;
        if (!searchQuery.trim()) return source;
        const q = searchQuery.toLowerCase();
        return source.filter((s: any) =>
            s.title?.toLowerCase().includes(q) ||
            s.tags?.some((t: string) => t.toLowerCase().includes(q))
        );
    }, [showAll, allStories, storySuggestions, searchQuery]);

    // Handle return from /stories/create
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const pendingId = sessionStorage.getItem('pendingStoryForContext');
            if (pendingId) {
                sessionStorage.removeItem('pendingStoryForContext');
                setSelectedStoryIds([...selectedStoryIds, pendingId]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pre-load session
    useEffect(() => {
        if (!scenario) {
            router.push('/setup')
            return
        }

        if (!hasPreCreatedRef.current) {
            if (FEATURE_FLAGS.useGeminiDirect && !geminiDirectSession) {
                hasPreCreatedRef.current = true;
                apiClient.createGeminiDirectToken(scenario.scenario || scenario as any)
                    .then(data => {
                        setGeminiDirectSession({ token: data.token, model: data.model });
                    })
                    .catch(() => { hasPreCreatedRef.current = false; });
            } else if (FEATURE_FLAGS.useGeminiLive && !livekitSession) {
                hasPreCreatedRef.current = true
                apiClient.createGeminiLiveSession(scenario.scenario || scenario as any)
                    .then(data => setLivekitSession({ token: data.token, livekitUrl: data.livekitUrl }))
                    .catch(() => { hasPreCreatedRef.current = false })
            } else if (FEATURE_FLAGS.useLiveKit && !livekitSession) {
                hasPreCreatedRef.current = true
                apiClient.createLivekitSession(scenario.scenario || scenario as any, [])
                    .then(data => setLivekitSession({ token: data.token, livekitUrl: data.livekitUrl }))
                    .catch(() => { hasPreCreatedRef.current = false })
            }
        }
    }, [scenario, router, livekitSession, setLivekitSession, geminiDirectSession, setGeminiDirectSession])

    if (!scenario) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] w-full font-sans">
            {/* Header */}
            <header className="flex flex-row items-center justify-between px-6 py-3 bg-[#0f172a] text-white">
                <div className="flex items-center gap-6">
                    <Link href="/setup" className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Quay lại</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                        <Home className="w-4 h-4" />
                        <span className="text-sm font-medium">Trang chủ</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 max-w-[900px] w-full mx-auto p-6 lg:py-12 flex flex-col">

                {/* Title */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <BookOpen className="w-7 h-7 text-teal-500" />
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Chuẩn bị trước buổi tập</h1>
                    </div>
                    <p className="text-slate-500 text-sm">Chọn story để ôn trước khi vào phòng, hoặc bỏ qua để vào luôn.</p>
                </div>

                {/* Tab toggle + Search */}
                <div className="flex items-center gap-3 mb-5">
                    <button
                        onClick={() => { setShowAll(false); setSearchQuery(''); }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!showAll ? 'bg-teal-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'}`}
                    >
                        <Sparkles className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                        Gợi ý phù hợp
                    </button>
                    <button
                        onClick={() => setShowAll(true)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${showAll ? 'bg-teal-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'}`}
                    >
                        Tất cả ({allStories.length})
                    </button>
                    {showAll && (
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Tìm story..."
                                className="w-full pl-9 pr-4 py-2 rounded-full bg-white border border-slate-200 text-sm outline-none focus:border-teal-400"
                            />
                        </div>
                    )}
                    <button
                        onClick={() => router.push('/stories/create?returnTo=/setup/confirm')}
                        className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Tạo mới
                    </button>
                </div>

                {/* Story List */}
                <div className="flex-1 mb-8">
                    {storiesLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-teal-500 mr-2" />
                            <span className="text-sm text-slate-400">Đang tải Story Bank...</span>
                        </div>
                    ) : filteredStories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <BookOpen className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-500 font-medium mb-1">
                                {hasStories ? 'Không tìm thấy story phù hợp' : 'Chưa có story nào'}
                            </p>
                            <p className="text-slate-400 text-sm mb-4">
                                {hasStories ? 'Thử tìm kiếm hoặc xem tất cả' : 'Tạo story đầu tiên để ôn trước buổi tập'}
                            </p>
                            <button
                                onClick={() => router.push('/stories/create?returnTo=/setup/confirm')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-full text-sm font-medium shadow-md transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Tạo Story mới
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredStories.map((story: any) => {
                                const isSelected = selectedStoryIds.includes(story.id);
                                const isExpanded = expandedId === story.id;
                                const status = STATUS_LABELS[story.status] || STATUS_LABELS.draft;

                                return (
                                    <div key={story.id} className={`bg-white rounded-2xl border transition-all ${isSelected ? 'border-teal-400 shadow-md shadow-teal-500/10' : 'border-slate-200 shadow-sm'}`}>
                                        {/* Story header row */}
                                        <div className="flex items-center gap-4 px-5 py-4">
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => toggleStory(story.id)}
                                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-slate-300 hover:border-teal-400'}`}
                                            >
                                                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                            </button>

                                            {/* Title + meta */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{story.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${status.color}20`, color: status.color }}>
                                                        {story.framework || 'STAR'}
                                                    </span>
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                                                        {status.label}
                                                    </span>
                                                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        ~{story.estimated_duration || 30}s
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expand toggle */}
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : story.id)}
                                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {/* Expanded content */}
                                        {isExpanded && (
                                            <div className="px-5 pb-4 pt-0 border-t border-slate-100">
                                                {story.structured && (
                                                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-slate-600">
                                                        {story.structured.situation && (
                                                            <div className="bg-slate-50 p-2.5 rounded-lg">
                                                                <span className="font-semibold text-slate-700 block mb-0.5">Situation</span>
                                                                {story.structured.situation}
                                                            </div>
                                                        )}
                                                        {story.structured.task && (
                                                            <div className="bg-slate-50 p-2.5 rounded-lg">
                                                                <span className="font-semibold text-slate-700 block mb-0.5">Task</span>
                                                                {story.structured.task}
                                                            </div>
                                                        )}
                                                        {story.structured.action && (
                                                            <div className="bg-slate-50 p-2.5 rounded-lg">
                                                                <span className="font-semibold text-slate-700 block mb-0.5">Action</span>
                                                                {story.structured.action}
                                                            </div>
                                                        )}
                                                        {story.structured.result && (
                                                            <div className="bg-slate-50 p-2.5 rounded-lg">
                                                                <span className="font-semibold text-slate-700 block mb-0.5">Result</span>
                                                                {story.structured.result}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {story.full_script && (
                                                    <p className="text-xs text-slate-500 mt-3 italic leading-relaxed line-clamp-3">{story.full_script}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="sticky bottom-0 bg-[#f8fafc] pt-4 pb-6 border-t border-slate-200 flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-500">
                        {selectedStoryIds.length > 0
                            ? <span className="font-medium text-teal-600">{selectedStoryIds.length} story đã chọn</span>
                            : 'Chưa chọn story nào'
                        }
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/practice/conversation"
                            className="px-6 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                        >
                            Bỏ qua
                        </Link>
                        <Link
                            href="/practice/conversation"
                            className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-full font-bold shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm"
                        >
                            Vào luyện tập
                        </Link>
                    </div>
                </div>

            </main>
        </div>
    )
}
