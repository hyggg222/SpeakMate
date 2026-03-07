"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useScenario } from "@/context/ScenarioContext";
import { apiClient } from "@/lib/apiClient";
import { motion } from "framer-motion";
import { hotScenarios } from "@/data/scenarios";

export default function FeaturedScenarios() {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const selectScenario = async (scenario: typeof hotScenarios[0]) => {
        setLoadingId(scenario.id);
        // Redirect to setup page with the topic as a query param
        // This satisfies "chỉ tạo bối cảnh trong khung chứ không vào thẳng phòng"
        router.push(`/setup?topic=${encodeURIComponent(scenario.requirement)}`);
        setLoadingId(null);
    };

    return (
        <section className="mt-8">
            <div className="flex justify-between items-center mb-6 px-1">
                <div>
                    <h2 className="text-[20px] font-bold text-foreground font-sans">
                        Thư viện Bối cảnh 🔥
                    </h2>
                    <p className="text-[13px] text-muted-foreground mt-1">
                        Hơn 50+ tình huống giao tiếp Tiếng Việt thực tế
                    </p>
                </div>
                <button className="text-[13px] text-primary font-bold hover:underline">
                    Xem tất cả
                </button>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-8 -mx-6 px-6 custom-scrollbar-horizontal snap-x snap-mandatory select-none">
                {hotScenarios.map((s, index) => (
                    <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`group relative flex-shrink-0 w-[280px] h-[440px] rounded-[40px] overflow-hidden cursor-pointer shadow-2xl hover:shadow-primary/20 transition-all border border-white/10 bg-gradient-to-br ${s.color} select-none snap-center`}
                        onClick={() => !loadingId && selectScenario(s)}
                    >
                        {/* Decorative dynamic circles */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500" />

                        {/* Card Content */}
                        <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                            <div>
                                {/* Badges */}
                                <div className="flex gap-2 mb-8">
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white text-black/80">
                                        {s.tag}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/20 text-white border border-white/10 backdrop-blur-md">
                                        {s.difficulty}
                                    </span>
                                </div>

                                {/* Typography Section */}
                                <h3 className="text-[26px] font-black text-white leading-[1.1] mb-6">
                                    {s.title}
                                </h3>

                                <div className="space-y-4">
                                    <div className="w-12 h-1.5 bg-white/40 rounded-full group-hover:w-20 transition-all" />
                                    <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                                        <p className="text-[14px] text-white/90 leading-relaxed font-medium line-clamp-6">
                                            {s.requirement}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-[13px] font-bold text-white/80 group-hover:text-white transition-colors underline underline-offset-4 decoration-white/30">
                                    Bắt đầu tập luyện
                                </span>
                                <div
                                    className={`bg-white text-black h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all group-hover:scale-110 group-hover:rotate-6 ${loadingId === s.id ? 'animate-pulse' : ''}`}
                                >
                                    {loadingId === s.id ? (
                                        <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <PlayIcon />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Immersive Loading State */}
                        {loadingId === s.id && (
                            <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center z-30">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-white/10 rounded-full" />
                                    <div className="absolute inset-0 w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                                </div>
                                <div className="mt-6 text-white text-[14px] font-black uppercase tracking-[0.3em] animate-pulse">
                                    Initializing
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}
