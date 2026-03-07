'use client';

import { useState, useMemo } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Clock, X, Plus, ArrowLeft, Search, Sparkles, CheckCircle2 } from 'lucide-react';

interface Story {
    id: string;
    title: string;
    tags: string[];
    framework: string;
    status: string;
    full_script: string;
    estimated_duration: number;
    structured: any;
    overlapCount: number;
}

interface Props {
    stories: Story[];           // top 5 gợi ý
    allStories: Story[];        // toàn bộ story bank
    hasStories: boolean;        // có story nào không
    onSelect: (ids: string[]) => void;
    onSkip: () => void;
    onCreateStory: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: "Bản nháp", color: "#94a3b8" },
    ready: { label: "Sẵn sàng", color: "#10b981" },
    "battle-tested": { label: "Thực chiến", color: "#f59e0b" },
};

const FRAMEWORK_COLORS: Record<string, string> = {
    STAR: "#3b82f6",
    PREP: "#8b5cf6",
    CAR: "#f97316",
};

type View = 'suggest' | 'browse';

function StoryCard({ story, isSelected, isExpanded, onToggleSelect, onToggleExpand }: {
    story: Story;
    isSelected: boolean;
    isExpanded: boolean;
    onToggleSelect: () => void;
    onToggleExpand: () => void;
}) {
    const statusInfo = STATUS_LABELS[story.status] || STATUS_LABELS.draft;
    const fwColor = FRAMEWORK_COLORS[story.framework] || "#3b82f6";

    return (
        <div className={`border rounded-xl transition-all ${isSelected ? 'border-[var(--teal)] bg-teal-50/30' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
                <button
                    onClick={onToggleSelect}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--teal)] border-[var(--teal)] text-white' : 'border-slate-300 hover:border-slate-400'}`}
                >
                    {isSelected && <span className="text-xs">&#10003;</span>}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleExpand}>
                    <p className="text-sm font-medium text-slate-800 truncate">{story.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: fwColor }}>
                            {story.framework}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}>
                            {statusInfo.label}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <Clock size={9} /> ~{story.estimated_duration}s
                        </span>
                    </div>
                </div>
                <button onClick={onToggleExpand} className="text-slate-400 hover:text-slate-600 p-1">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 leading-relaxed italic">
                        &ldquo;{story.full_script}&rdquo;
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {(story.tags || []).map((tag: string) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{tag}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StoryBankSuggestionModal({ stories, allStories, hasStories, onSelect, onSkip, onCreateStory }: Props) {
    const [view, setView] = useState<View>('suggest');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>(stories.map(s => s.id));
    const [searchQuery, setSearchQuery] = useState('');

    // IDs that were selected before entering browse
    const [idsBeforeBrowse, setIdsBeforeBrowse] = useState<string[]>([]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const openBrowse = () => {
        setIdsBeforeBrowse([...selectedIds]);
        setView('browse');
        setSearchQuery('');
        setExpandedId(null);
    };

    const closeBrowse = () => {
        setView('suggest');
        setExpandedId(null);
    };

    // Suggest view: merge suggested stories + any additionally selected from browse
    const suggestedIds = useMemo(() => new Set(stories.map(s => s.id)), [stories]);
    const additionalStories = useMemo(() => {
        return allStories.filter(s => selectedIds.includes(s.id) && !suggestedIds.has(s.id));
    }, [allStories, selectedIds, suggestedIds]);

    // Browse: count new selections
    const newSelectCount = useMemo(() => {
        return selectedIds.filter(id => !idsBeforeBrowse.includes(id)).length;
    }, [selectedIds, idsBeforeBrowse]);

    // Browse: filter by search
    const filteredBrowseStories = useMemo(() => {
        if (!searchQuery.trim()) return allStories;
        const q = searchQuery.toLowerCase();
        return allStories.filter(s =>
            s.title.toLowerCase().includes(q) ||
            (s.tags || []).some(t => t.toLowerCase().includes(q))
        );
    }, [allStories, searchQuery]);

    // ========== EMPTY STATE ==========
    if (!hasStories) {
        return (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden flex flex-col shadow-xl">
                    <div className="px-6 py-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                                <BookOpen size={16} style={{ color: "var(--teal)" }} />
                            </div>
                            <h3 className="font-semibold text-slate-800">Story Bank</h3>
                        </div>
                        <button onClick={onSkip} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <Sparkles size={28} className="text-slate-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-[15px] mb-1">Bạn chưa có câu chuyện nào</h4>
                            <p className="text-[13px] text-slate-500 leading-relaxed">
                                Tạo câu chuyện đầu tiên để ôn trước khi luyện tập!
                                Story Bank giúp bạn chuẩn bị tốt hơn cho mỗi buổi gym.
                            </p>
                        </div>
                        <button
                            onClick={onCreateStory}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                            style={{ backgroundColor: "var(--teal)" }}
                        >
                            <Plus size={16} />
                            Tạo story mới
                        </button>
                    </div>

                    <div className="px-6 py-3 border-t">
                        <button onClick={onSkip} className="text-sm text-slate-500 hover:text-slate-700">
                            Bỏ qua, bắt đầu luôn
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========== BROWSE VIEW ==========
    if (view === 'browse') {
        return (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
                    <div className="px-6 py-4 border-b flex items-center gap-3">
                        <button onClick={closeBrowse} className="text-slate-400 hover:text-slate-600">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-800">Thư viện Story Bank</h3>
                            <p className="text-xs text-slate-500">
                                {selectedIds.length} story đã chọn · Tick thêm để đưa vào buổi luyện tập
                            </p>
                        </div>
                    </div>

                    <div className="px-6 py-3 border-b">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                            <Search size={14} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên hoặc tag..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder-slate-400"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                        {filteredBrowseStories.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-8">Không tìm thấy story nào</p>
                        ) : (
                            filteredBrowseStories.map(story => (
                                <StoryCard
                                    key={story.id}
                                    story={story}
                                    isSelected={selectedIds.includes(story.id)}
                                    isExpanded={expandedId === story.id}
                                    onToggleSelect={() => toggleSelect(story.id)}
                                    onToggleExpand={() => toggleExpand(story.id)}
                                />
                            ))
                        )}
                    </div>

                    <div className="px-6 py-4 border-t flex items-center justify-between">
                        <button onClick={closeBrowse} className="text-sm text-slate-500 hover:text-slate-700">
                            Quay lại
                        </button>
                        <button
                            onClick={closeBrowse}
                            disabled={newSelectCount === 0}
                            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${newSelectCount > 0
                                ? 'text-white'
                                : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                                }`}
                            style={newSelectCount > 0 ? { backgroundColor: "var(--teal)" } : {}}
                        >
                            {newSelectCount > 0 ? `Thêm ${newSelectCount} story` : 'Chọn story để thêm'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========== SUGGEST VIEW ==========
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                            <BookOpen size={16} style={{ color: "var(--teal)" }} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Chuẩn bị trước buổi tập</h3>
                            <p className="text-xs text-slate-500">
                                {selectedIds.length > 0
                                    ? `${selectedIds.length} story đã chọn để ôn`
                                    : 'Chọn story liên quan để ôn trước khi vào gym'
                                }
                            </p>
                        </div>
                    </div>
                    <button onClick={onSkip} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Story list */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {/* Gợi ý phù hợp */}
                    {stories.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                Gợi ý phù hợp với bối cảnh
                            </p>
                            {stories.map(story => (
                                <StoryCard
                                    key={story.id}
                                    story={story}
                                    isSelected={selectedIds.includes(story.id)}
                                    isExpanded={expandedId === story.id}
                                    onToggleSelect={() => toggleSelect(story.id)}
                                    onToggleExpand={() => toggleExpand(story.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Story đã thêm từ browse */}
                    {additionalStories.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 size={12} style={{ color: "var(--teal)" }} />
                                Đã thêm vào
                            </p>
                            {additionalStories.map(story => (
                                <StoryCard
                                    key={story.id}
                                    story={story}
                                    isSelected={selectedIds.includes(story.id)}
                                    isExpanded={expandedId === story.id}
                                    onToggleSelect={() => toggleSelect(story.id)}
                                    onToggleExpand={() => toggleExpand(story.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Không có gợi ý nào match */}
                    {stories.length === 0 && additionalStories.length === 0 && (
                        <div className="text-center py-6 text-slate-500 text-sm">
                            <p className="mb-2">Không tìm thấy story phù hợp với bối cảnh này.</p>
                            <p className="text-xs text-slate-400">Nhấn &quot;Thêm story&quot; để chọn từ thư viện, hoặc tạo story mới.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            onClick={onSkip}
                            className="text-sm text-slate-500 hover:text-slate-700 transition-colors shrink-0"
                        >
                            Bỏ qua
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={openBrowse}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium border border-slate-200 text-slate-600 hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors"
                            >
                                <Plus size={14} />
                                Thêm
                            </button>
                            <button
                                onClick={onCreateStory}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium border border-slate-200 text-slate-600 hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors"
                            >
                                <Sparkles size={14} />
                                Tạo mới
                            </button>
                            <button
                                onClick={() => onSelect(selectedIds)}
                                className="px-4 py-2 rounded-xl text-white text-[13px] font-medium transition-all"
                                style={{ backgroundColor: "var(--teal)" }}
                            >
                                Vào luyện tập
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
