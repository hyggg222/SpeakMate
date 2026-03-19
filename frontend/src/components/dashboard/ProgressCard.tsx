"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { Flame, ChevronRight, Zap, Target } from "lucide-react";

const LEVEL_NAMES: Record<number, string> = {
    1: "Bắt đầu", 2: "Tập sự", 3: "Quen dần", 4: "Tự tin hơn", 5: "Khá ổn",
    6: "Vững vàng", 7: "Thành thạo", 8: "Xuất sắc", 9: "Chuyên gia", 10: "Bậc thầy",
};

const BADGE_ICONS: Record<string, string> = {
    "Khởi động": "🚀", "Kiên trì": "💪", "Thực chiến gia": "🏆",
};

export default function ProgressCard() {
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.getUserProgress()
            .then(data => { setProgress(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="rounded-2xl p-4 animate-pulse space-y-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="h-3 bg-slate-700/40 rounded w-20" />
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-700/40" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-slate-700/40 rounded w-24" />
                        <div className="h-1.5 bg-slate-700/40 rounded-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!progress) {
        return (
            <div className="rounded-2xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-teal-400" /> Tiến trình
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                    Hoàn thành phiên luyện đầu tiên để bắt đầu theo dõi tiến bộ.
                </p>
                <Link href="/setup" className="mt-3 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold text-teal-400 hover:text-teal-300 transition-colors"
                    style={{ backgroundColor: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.2)' }}>
                    Luyện tập ngay <ChevronRight className="w-3 h-3" />
                </Link>
            </div>
        );
    }

    const level = progress.communication_level || 1;
    const xp = progress.total_xp || 0;
    const streak = progress.current_streak || 0;
    const badges: string[] = progress.badges || [];
    const xpForNextLevel = level * 100;
    const xpInLevel = xp % xpForNextLevel;
    const xpPct = Math.min(xpInLevel / xpForNextLevel * 100, 100);

    return (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>

            {/* ── Level header ── */}
            <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-3">
                    {/* Level badge */}
                    <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg">
                            <span className="text-white font-black text-xl leading-none">{level}</span>
                        </div>
                    </div>

                    {/* Name + XP bar */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1.5">
                            <span className="text-[14px] font-bold text-white truncate">
                                {LEVEL_NAMES[level] || `Level ${level}`}
                            </span>
                            <span className="text-[10px] text-slate-500 shrink-0 ml-2">{xp} XP</span>
                        </div>
                        {/* XP progress bar */}
                        <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-blue-500 transition-all duration-1000"
                                style={{ width: `${xpPct}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-[9px] text-slate-600">{xpInLevel} / {xpForNextLevel} XP</span>
                            <span className="text-[9px] text-slate-600">Lv {level + 1}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />

            {/* ── Stats row ── */}
            <div className="grid grid-cols-3">
                <div className="px-3 py-2.5 text-center" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[11px] font-bold text-white">{progress.total_sessions || 0}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Phiên</p>
                </div>
                <div className="px-3 py-2.5 text-center" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[11px] font-bold text-white">{(progress.avg_coherence || 0).toFixed(0)}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Mạch lạc</p>
                </div>
                <div className="px-3 py-2.5 text-center">
                    {streak > 0 ? (
                        <>
                            <p className="text-[11px] font-bold text-orange-400 flex items-center justify-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" />{streak}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Tuần</p>
                        </>
                    ) : (
                        <>
                            <p className="text-[11px] font-bold text-slate-500">—</p>
                            <p className="text-[9px] text-slate-600 mt-0.5">Streak</p>
                        </>
                    )}
                </div>
            </div>

            {/* ── Badges (if any) ── */}
            {badges.length > 0 && (
                <>
                    <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                        {badges.map((badge, i) => (
                            <span key={i}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                                style={{ backgroundColor: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}>
                                {BADGE_ICONS[badge] || "🏅"} {badge}
                            </span>
                        ))}
                    </div>
                </>
            )}

            {/* ── CTA ── */}
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <Link href="/progress"
                className="flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                style={{ backgroundColor: 'rgba(20,184,166,0.05)' }}>
                <Zap className="w-3 h-3" /> Xem chi tiết tiến trình <ChevronRight className="w-3 h-3" />
            </Link>
        </div>
    );
}
