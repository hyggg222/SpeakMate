'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Clock, ArrowRight, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function RecentScenario() {
    const [recentSession, setRecentSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchRecent() {
            try {
                const sessions = await apiClient.getUserSessions(1, 0);
                if (sessions && sessions.length > 0) {
                    setRecentSession(sessions[0]);
                }
            } catch (err) {
                console.error("Failed to fetch recent session:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchRecent();
    }, []);

    if (loading) {
        return (
            <div className="w-56 h-[120px] bg-slate-100/50 rounded-3xl animate-pulse border border-slate-100" />
        );
    }

    if (!recentSession) {
        return (
            <div className="w-56 p-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <BookOpen size={14} />
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Bối cảnh đang luyện tập</p>
                <p className="text-[10px] text-slate-400 italic">Chưa có lịch sử</p>
            </div>
        );
    }

    const scenario = recentSession.scenario || {};

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-56 p-5 rounded-[32px] bg-white shadow-[0_15px_30px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col justify-between mb-8 group hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
        >
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500">
                        <Clock size={12} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang luyện tập</span>
                </div>
                <h4 className="text-[14px] font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors">
                    {scenario.title || "Tình huống chưa đặt tên"}
                </h4>
            </div>

            <button
                onClick={() => router.push(`/setup?topic=${encodeURIComponent(scenario.scenario?.requirement || scenario.requirement || "")}`)}
                className="mt-4 flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-emerald-500 hover:text-white text-slate-600 rounded-2xl text-[12px] font-bold transition-all"
            >
                Luyện tiếp
                <ArrowRight size={14} />
            </button>
        </motion.div>
    );
}
