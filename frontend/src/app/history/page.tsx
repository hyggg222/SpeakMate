'use client';

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function HistoryPage() {
    const [sessions, setSessions] = useState<any[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('speakmate_history');
        if (stored) {
            try {
                setSessions(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, []);

    const getModeColorStr = (mode: string) => {
        if (mode === 'Giao tiếp cơ bản') return '#10b981';
        if (mode === 'Giao tiếp') return '#3b82f6';
        if (mode === 'Tranh biện') return '#f59e0b';
        return '#94a3b8';
    };

    const getBadgeStyle = (mode: string) => {
        return {
            backgroundColor: getModeColorStr(mode),
            color: "white"
        };
    };

    return (
        <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
            <Sidebar />

            <main className="flex flex-col flex-1 overflow-hidden">
                {/* We use Topbar directly here since practice pages don't have sidebar but have topbar */}
                <Topbar />
                <AuthGate feature="Lịch sử">
                <section className="flex-1 overflow-y-auto px-4 sm:px-[10%] xl:px-[20%] py-10 md:py-16 bg-[#f8fafc]">
                    <div className="max-w-5xl mx-auto space-y-12">

                        {/* Header section with Stats */}
                        <div className="flex items-center justify-between px-2">
                            <h1 className="text-3xl font-bold font-serif" style={{ color: "var(--foreground)" }}>
                                Lịch sử luyện tập
                            </h1>

                            <div className="flex items-center gap-4">
                                <div className="bg-white border text-center px-5 py-2 rounded-xl shadow-sm min-w-[120px]">
                                    <p className="text-xs text-slate-500 mb-1">Tổng số buổi</p>
                                    <p className="text-3xl font-bold" style={{ color: "var(--navy)" }}>{sessions.length}</p>
                                </div>
                                <div className="bg-white border px-5 py-2 rounded-xl shadow-sm min-w-[160px] flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Điểm trung bình</p>
                                        <p className="text-3xl font-bold" style={{ color: "var(--navy)" }}>
                                            {sessions.length > 0
                                                ? (sessions.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0) / sessions.length).toFixed(1)
                                                : "0"}
                                        </p>
                                    </div>
                                    {/* Mini sparkline chart placeholder */}
                                    <svg width="40" height="20" viewBox="0 0 40 20" className="opacity-80">
                                        <path d="M0 15 Q5 10 10 12 T20 8 T30 10 T40 5" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx="40" cy="5" r="2.5" fill="#10b981" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center justify-between border-b pb-6 mt-10 px-2">
                            <div className="flex items-center gap-4">
                                <FilterPill label="Giao tiếp cơ bản" color="#10b981" />
                                <FilterPill label="Giao tiếp" color="#3b82f6" />
                                <FilterPill label="Tranh biện" color="#f59e0b" />
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[15px] font-medium text-slate-600">Khoảng thời gian</span>
                                <select className="border text-[15px] rounded-xl px-4 py-2 outline-none shadow-sm cursor-pointer bg-white">
                                    <option>📅 Tất cả</option>
                                    <option>Tuần này</option>
                                    <option>Tháng này</option>
                                </select>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="space-y-6 px-2">
                            {sessions.length === 0 ? (
                                <p className="text-center text-slate-500 py-10">Bạn chưa có phiên luyện tập nào được lưu trữ.</p>
                            ) : sessions.map((session, i) => (
                                <div key={i} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[15px] font-semibold text-slate-800">{session.date}</span>
                                            <span className="text-[13px] font-bold px-4 py-1 rounded-full" style={getBadgeStyle(session.mode)}>
                                                {session.mode}
                                            </span>
                                            <span className="text-[13px] font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
                                                {session.score} / 10
                                            </span>
                                        </div>
                                        <p className="text-[15px] text-slate-600">
                                            <span className="text-slate-500 mr-2">Chủ đề:</span>
                                            {session.topic}
                                        </p>
                                    </div>
                                    <Link
                                        href={'/evaluation/conversation'}
                                        className="text-[15px] font-semibold text-[var(--teal)] opacity-90 group-hover:opacity-100 px-4 py-2 border border-transparent group-hover:border-[var(--teal)] group-hover:bg-[var(--teal)]/5 rounded-full transition-all text-center"
                                    >
                                        Xem chi tiết
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {/* Pagination - Hide if few items or implement real logic */}
                        {sessions.length > 5 && (
                            <div className="flex items-center justify-center gap-6 pt-10 pb-16">
                                <button className="text-[15px] border rounded-xl px-5 py-2 font-medium text-slate-500 hover:bg-slate-50 transition-colors shadow-sm bg-white cursor-not-allowed">
                                    Trang trước
                                </button>
                                <span className="text-[15px] font-medium text-slate-600">
                                    1 of {Math.ceil(sessions.length / 5) || 1}
                                </span>
                                <button className="text-[15px] border rounded-xl px-5 py-2 font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm bg-white cursor-not-allowed">
                                    Trang sau
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

function FilterPill({ label, color }: { label: string, color: string }) {
    return (
        <button
            className="px-5 py-2 rounded-full text-[15px] font-medium bg-white transition-colors shadow-sm hover:shadow"
            style={{ border: `1.5px solid ${color}`, color: color }}
        >
            {label}
        </button>
    );
}
