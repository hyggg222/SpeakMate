"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { hotScenarios, ScenarioItem } from "@/data/scenarios";

function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}

export default function LibraryPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTag, setFilterTag] = useState('Tất cả');
    const [filterDifficulty, setFilterDifficulty] = useState('Tất cả');
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const tags = ['Tất cả', ...Array.from(new Set(hotScenarios.map(s => s.tag)))];

    const filteredScenarios = hotScenarios.filter(s => {
        if (filterTag !== 'Tất cả' && s.tag !== filterTag) return false;
        if (filterDifficulty !== 'Tất cả' && s.difficulty !== filterDifficulty) return false;
        if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase()) && !s.requirement.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const selectScenario = async (scenario: ScenarioItem) => {
        setLoadingId(scenario.id);
        router.push(`/setup?topic=${encodeURIComponent(scenario.requirement)}`);
        setLoadingId(null);
    };

    return (
        <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
            <Sidebar />

            <main className="flex flex-col flex-1 overflow-hidden bg-[#f8fafc]">
                <Topbar variant="light" />

                <section className="flex-1 overflow-y-auto px-[5%] xl:px-[10%] py-10">
                    <div className="max-w-7xl mx-auto">

                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-4xl font-bold font-serif text-slate-900 mb-2">
                                Thư viện Bối cảnh 🔥
                            </h1>
                            <p className="text-slate-500 text-[15px]">
                                Khám phá hàng chục tình huống giao tiếp Tiếng Việt thực tế được chuẩn bị sẵn.
                            </p>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-4 bg-[#f8fafc] pb-8 border-b border-slate-200">
                            <div className="relative flex-1 min-w-[250px] max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm bối cảnh..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[var(--teal)] transition-colors shadow-sm bg-white"
                                />
                            </div>

                            <div className="flex flex-col ml-4">
                                <span className="text-[11px] font-medium text-slate-500 px-1 mb-0.5">Chủ đề</span>
                                <select
                                    value={filterTag}
                                    onChange={(e) => setFilterTag(e.target.value)}
                                    className="border-none bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer pr-4 appearance-none custom-select"
                                >
                                    {tags.map(t => (
                                        <option key={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col ml-4">
                                <span className="text-[11px] font-medium text-slate-500 px-1 mb-0.5">Độ khó</span>
                                <select
                                    value={filterDifficulty}
                                    onChange={(e) => setFilterDifficulty(e.target.value)}
                                    className="border-none bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer pr-4 appearance-none custom-select"
                                >
                                    <option>Tất cả</option>
                                    <option>Dễ</option>
                                    <option>Trung bình</option>
                                    <option>Khó</option>
                                </select>
                            </div>
                        </div>

                        {/* Flash Cards Grid */}
                        <div className="pt-8 pb-16">
                            {filteredScenarios.length === 0 && (
                                <div className="text-center text-slate-500 py-10 w-full">Không tìm thấy bối cảnh phù hợp.</div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredScenarios.map((s, index) => (
                                    <motion.div
                                        key={s.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05, duration: 0.3 }}
                                        className={`group relative flex-shrink-0 w-full aspect-[2/3] lg:aspect-auto lg:h-[400px] rounded-[32px] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all border border-white/10 bg-gradient-to-br ${s.color} select-none`}
                                        onClick={() => !loadingId && selectScenario(s)}
                                    >
                                        {/* Decorative dynamic circles */}
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500" />

                                        {/* Card Content */}
                                        <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                                            <div>
                                                {/* Badges */}
                                                <div className="flex gap-2 mb-6">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white text-black/80">
                                                        {s.tag}
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/20 text-white border border-white/10 backdrop-blur-md">
                                                        {s.difficulty}
                                                    </span>
                                                </div>

                                                {/* Typography Section */}
                                                <h3 className="text-[20px] font-black text-white leading-[1.2] mb-4">
                                                    {s.title}
                                                </h3>

                                                <div className="space-y-3">
                                                    <div className="w-12 h-1 bg-white/40 rounded-full group-hover:w-16 transition-all" />
                                                    <div className="bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-white/5">
                                                        <p className="text-[13px] text-white/90 leading-relaxed font-medium line-clamp-5">
                                                            {s.requirement}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Row */}
                                            <div className="flex items-center justify-between mt-auto">
                                                <span className="text-[12px] font-bold text-white/80 group-hover:text-white transition-colors underline underline-offset-4 decoration-white/30 hidden sm:inline-block">
                                                    Bắt đầu
                                                </span>
                                                <div
                                                    className={`bg-white text-black h-12 w-12 rounded-xl flex flex-shrink-0 items-center justify-center shadow-xl transition-all group-hover:scale-110 group-hover:rotate-6 sm:ml-auto ${loadingId === s.id ? 'animate-pulse' : ''}`}
                                                >
                                                    {loadingId === s.id ? (
                                                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                                    ) : (
                                                        <PlayIcon />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Immersive Loading State */}
                                        {loadingId === s.id && (
                                            <div className="absolute inset-0 bg-black/30 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-30">
                                                <div className="relative">
                                                    <div className="w-12 h-12 border-4 border-white/10 rounded-full" />
                                                    <div className="absolute inset-0 w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                                                </div>
                                                <div className="mt-4 text-white text-[12px] font-black uppercase tracking-[0.2em] animate-pulse">
                                                    Initializing
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                    </div>
                </section>
            </main>
        </div>
    );
}
