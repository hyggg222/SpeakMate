"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { TrendingUp, Award, Zap, Flame, ChevronRight } from "lucide-react";

const LEVEL_NAMES: Record<number, string> = {
    1: "Bắt đầu",
    2: "Tập sự",
    3: "Quen dần",
    4: "Tự tin hơn",
    5: "Khá ổn",
    6: "Vững vàng",
    7: "Thành thạo",
    8: "Xuất sắc",
    9: "Chuyên gia",
    10: "Bậc thầy",
};

const BADGE_ICONS: Record<string, string> = {
    "Khởi động": "🚀",
    "Kiên trì": "💪",
    "Thực chiến gia": "🏆",
};

export default function ProgressCard() {
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.getUserProgress().then(data => {
            setProgress(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                <div className="h-4 bg-slate-700/30 rounded w-24 mb-3" />
                <div className="h-8 bg-slate-700/30 rounded w-16" />
            </div>
        );
    }

    if (!progress) {
        return (
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Tiến trình
                </h3>
                <p className="text-[11px] text-slate-500">Luyện tập phiên đầu tiên để bắt đầu theo dõi tiến bộ!</p>
            </div>
        );
    }

    const level = progress.communication_level || 1;
    const xp = progress.total_xp || 0;
    const streak = progress.current_streak || 0;
    const badges: string[] = progress.badges || [];
    const xpForNextLevel = level * 100;
    const xpProgress = Math.min((xp % xpForNextLevel) / xpForNextLevel * 100, 100);

    return (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Tiến trình của bạn
            </h3>

            {/* Communication Level */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {level}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{LEVEL_NAMES[level] || `Level ${level}`}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-blue-500 transition-all duration-1000"
                                style={{ width: `${xpProgress}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">{xp} XP</span>
                    </div>
                </div>
            </div>

            {/* Streak + Badges row */}
            <div className="flex items-center gap-3">
                {streak > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span className="text-[11px] font-bold text-orange-400">{streak} tuần</span>
                    </div>
                )}
                {badges.length > 0 && badges.map((badge, i) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] font-medium text-purple-300">
                        {BADGE_ICONS[badge] || "🏅"} {badge}
                    </span>
                ))}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2 bg-slate-800/30">
                    <p className="text-[10px] text-slate-500">Phiên luyện</p>
                    <p className="text-sm font-bold text-white">{progress.total_sessions || 0}</p>
                </div>
                <div className="rounded-lg p-2 bg-slate-800/30">
                    <p className="text-[10px] text-slate-500">Độ mạch lạc TB</p>
                    <p className="text-sm font-bold text-white">{(progress.avg_coherence || 0).toFixed(0)}/100</p>
                </div>
            </div>

            {/* Link to detail page */}
            <Link
                href="/progress"
                className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                style={{ backgroundColor: 'rgba(20,184,166,0.08)' }}
            >
                Xem chi tiết <ChevronRight className="w-3 h-3" />
            </Link>
        </div>
    );
}
