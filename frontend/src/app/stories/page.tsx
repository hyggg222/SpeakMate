'use client';

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Plus, Search, Clock, Target, Zap, BookOpen, X, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { STATUS_LABELS, FRAMEWORK_COLORS } from "@/lib/storybank-constants";

const PAGE_SIZE = 12;

export default function StoriesPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Init filters from URL
    const [stories, setStories] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || "");
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "");
    const [frameworkFilter, setFrameworkFilter] = useState(searchParams.get('framework') || "");
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || "newest");
    const [activeTagFilters, setActiveTagFilters] = useState<string[]>(() => {
        const t = searchParams.get('tags');
        return t ? t.split(',').filter(Boolean) : [];
    });
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
    const [allTags, setAllTags] = useState<string[]>([]);

    // Persist filters to URL
    useEffect(() => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        if (frameworkFilter) params.set('framework', frameworkFilter);
        if (sortBy && sortBy !== 'newest') params.set('sort', sortBy);
        if (activeTagFilters.length) params.set('tags', activeTagFilters.join(','));
        if (page > 1) params.set('page', String(page));
        const qs = params.toString();
        router.replace(`/stories${qs ? `?${qs}` : ''}`, { scroll: false });
    }, [search, statusFilter, frameworkFilter, sortBy, activeTagFilters, page, router]);

    const fetchStories = useCallback(async () => {
        setLoading(true);
        // Retry up to 3 times with backoff (Render cold start can take 30-50s)
        let result: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                result = await apiClient.listStories({
                    search: search || undefined,
                    status: statusFilter || undefined,
                    tags: activeTagFilters.length > 0 ? activeTagFilters.join(',') : undefined,
                    limit: PAGE_SIZE,
                    offset: (page - 1) * PAGE_SIZE,
                });
                break; // success
            } catch (err) {
                console.warn(`[stories] fetch attempt ${attempt}/3 failed:`, (err as any)?.message);
                if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 3000));
                else { setLoading(false); return; }
            }
        }
        try {

            // Client-side framework filter (API may not support it)
            let filtered = result.data;
            if (frameworkFilter) {
                filtered = filtered.filter((s: any) => s.framework === frameworkFilter);
            }

            // Client-side sorting
            const sorted = [...filtered].sort((a: any, b: any) => {
                switch (sortBy) {
                    case 'most-practiced': return (b.practice_count || 0) - (a.practice_count || 0);
                    case 'highest-score': return (b.last_score || 0) - (a.last_score || 0);
                    case 'shortest': return (a.estimated_duration || 30) - (b.estimated_duration || 30);
                    case 'newest':
                    default: return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
                }
            });

            setStories(sorted);
            setTotal(frameworkFilter ? sorted.length : result.total);

            // Collect unique tags from ALL stories (not just current page)
            if (page === 1 && !search && !statusFilter && !frameworkFilter && activeTagFilters.length === 0) {
                const tags = new Set<string>();
                result.data.forEach((s: any) => (s.tags || []).forEach((t: string) => tags.add(t)));
                setAllTags(Array.from(tags).sort());
            }
        } catch (err) {
            console.error("Failed to load stories:", err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter, frameworkFilter, sortBy, activeTagFilters, page]);

    useEffect(() => { fetchStories(); }, [fetchStories]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const addTagFilter = (tag: string) => {
        if (!activeTagFilters.includes(tag)) {
            setActiveTagFilters([...activeTagFilters, tag]);
            setPage(1);
        }
    };

    const removeTagFilter = (tag: string) => {
        setActiveTagFilters(activeTagFilters.filter(t => t !== tag));
        setPage(1);
    };

    return (
        <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
            <Sidebar />
            <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <Topbar />
                <AuthGate feature="Kho Chuyện">
                <section className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-[5%] xl:px-[12%] py-8 bg-[#f8fafc]">
                    <div className="max-w-5xl mx-auto space-y-8">

                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold font-serif" style={{ color: "var(--foreground)" }}>{t('stories.title')}</h1>
                                <p className="text-slate-500 mt-1 text-sm">{t('stories.subtitle')}</p>
                            </div>
                            <Link href="/stories/create"
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium shadow-md hover:shadow-lg transition-all self-start"
                                style={{ backgroundColor: "var(--teal)" }}>
                                <Plus size={18} /> {t('stories.createNew')}
                            </Link>
                        </div>

                        {/* Stats row */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-white border px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                                <BookOpen size={16} className="text-slate-400" />
                                <span className="text-sm text-slate-600">{total} {t('stories.count')}</span>
                            </div>
                            <div className="bg-white border px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                                <Target size={16} className="text-emerald-500" />
                                <span className="text-sm text-slate-600">
                                    {stories.filter(s => s.status === 'ready' || s.status === 'battle-tested').length} {t('stories.ready')}
                                </span>
                            </div>
                            <div className="bg-white border px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                                <Zap size={16} className="text-amber-500" />
                                <span className="text-sm text-slate-600">
                                    {stories.filter(s => s.status === 'battle-tested').length} {t('stories.battleTested')}
                                </span>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[200px] max-w-md">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={t('stories.searchPlaceholder')}
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                                        className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white"
                                    />
                                </div>

                                {/* Status filter */}
                                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                    className="border rounded-xl px-4 py-2 text-sm outline-none bg-white cursor-pointer">
                                    <option value="">{t('stories.allStatus')}</option>
                                    <option value="draft">Bản nháp</option>
                                    <option value="ready">Sẵn sàng</option>
                                    <option value="battle-tested">Thực chiến</option>
                                </select>

                                {/* Framework filter */}
                                <select value={frameworkFilter} onChange={e => { setFrameworkFilter(e.target.value); setPage(1); }}
                                    className="border rounded-xl px-4 py-2 text-sm outline-none bg-white cursor-pointer">
                                    <option value="">Tất cả framework</option>
                                    <option value="STAR">STAR</option>
                                    <option value="PREP">PREP</option>
                                    <option value="CAR">CAR</option>
                                </select>

                                {/* Sort */}
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                    className="border rounded-xl px-4 py-2 text-sm outline-none bg-white cursor-pointer">
                                    <option value="newest">Mới nhất</option>
                                    <option value="most-practiced">Luyện nhiều nhất</option>
                                    <option value="highest-score">Điểm cao nhất</option>
                                    <option value="shortest">Ngắn nhất</option>
                                </select>
                            </div>

                            {/* Tag chips (clickable filter) */}
                            {(activeTagFilters.length > 0 || allTags.length > 0) && (
                                <div className="flex flex-wrap gap-2">
                                    {/* Active tag filters */}
                                    {activeTagFilters.map(tag => (
                                        <button key={`active-${tag}`} onClick={() => removeTagFilter(tag)}
                                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium text-white transition-all"
                                            style={{ backgroundColor: "var(--teal)" }}>
                                            {tag} <X size={12} />
                                        </button>
                                    ))}
                                    {/* Available tags */}
                                    {allTags.filter(t => !activeTagFilters.includes(t)).map(tag => (
                                        <button key={tag} onClick={() => addTagFilter(tag)}
                                            className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Story Grid */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white border rounded-2xl p-5 animate-pulse">
                                        <div className="h-5 bg-slate-200 rounded w-3/4 mb-3" />
                                        <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                                        <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                                        <div className="h-3 bg-slate-100 rounded w-2/3" />
                                    </div>
                                ))}
                            </div>
                        ) : stories.length === 0 ? (
                            <div className="text-center py-16 bg-white border rounded-2xl">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                    <BookOpen size={28} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                                    {search || statusFilter || activeTagFilters.length ? t('common.error') : t('stories.empty')}
                                </h3>
                                <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
                                    {search || statusFilter || activeTagFilters.length
                                        ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
                                        : "Bắt đầu bằng cách nhập trải nghiệm của bạn. Ni sẽ giúp bạn đóng gói thành mẫu chuyện có cấu trúc."}
                                </p>
                                {!search && !statusFilter && activeTagFilters.length === 0 && (
                                    <Link href="/stories/create"
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium"
                                        style={{ backgroundColor: "var(--teal)" }}>
                                        <Plus size={18} /> Tạo chuyện đầu tiên
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {stories.map((story: any) => (
                                    <StoryCard key={story.id} story={story} onTagClick={addTagFilter} />
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 pt-4">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                    className="flex items-center gap-1 px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-sm">
                                    <ChevronLeft size={16} /> Trước
                                </button>
                                <span className="text-sm text-slate-500">{page} / {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                    className="flex items-center gap-1 px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-sm">
                                    Sau <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </section>
                </AuthGate>
            </main>
        </div>
    );
}

function StoryCard({ story, onTagClick }: { story: any; onTagClick: (tag: string) => void }) {
    const statusInfo = STATUS_LABELS[story.status] || STATUS_LABELS.draft;
    const frameworkColor = FRAMEWORK_COLORS[story.framework] || "#6b7280";

    return (
        <Link href={`/stories/${story.id}`}>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-slate-800 group-hover:text-[var(--teal)] transition-colors line-clamp-2 flex-1 pr-2">
                        {story.title}
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap text-white"
                        style={{ backgroundColor: frameworkColor }}>
                        {story.framework}
                    </span>
                </div>

                {/* Tags (clickable) */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {(story.tags || []).slice(0, 4).map((tag: string) => (
                        <button key={tag}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); onTagClick(tag); }}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-[var(--teal)]/10 hover:text-[var(--teal)] transition-colors">
                            {tag}
                        </button>
                    ))}
                    {(story.tags || []).length > 4 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">+{story.tags.length - 4}</span>
                    )}
                </div>

                <div className="flex-1" />

                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}>
                            {statusInfo.label}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock size={11} /> ~{story.estimated_duration || 30}s
                        </span>
                    </div>
                    {story.practice_count > 0 && (
                        <span className="text-[11px] text-slate-400">
                            {story.practice_count}x{story.last_score != null && ` | ${story.last_score}%`}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
