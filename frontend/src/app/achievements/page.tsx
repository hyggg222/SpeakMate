"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import Image from "next/image";

const data = [
    { name: 'Session 1', score: 0.5 },
    { name: 'Session 2', score: 1.8 },
    { name: 'Session 3', score: 1.0 },
    { name: 'Session 4', score: 2.5 },
    { name: 'Session 5', score: 2.8 },
    { name: 'Session 6', score: 3.8 },
    { name: 'Session 7', score: 3.0 },
    { name: 'Session 8', score: 4.0 },
    { name: 'Session 9', score: 5.0 },
    { name: 'Session 10', score: 5.2 },
    { name: 'Session 11', score: 6.5 },
    { name: 'Session 12', score: 6.8 },
    { name: 'Session 13', score: 7.8 },
    { name: 'Session 14', score: 7.0 },
    { name: 'Session 15', score: 8.0 },
    { name: 'Session 16', score: 9.5 },
];

export default function AchievementsPage() {
    return (
        <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
            <Sidebar />

            <main className="flex flex-col flex-1 overflow-hidden bg-[#f8fafc] relative">
                <Topbar variant="brand" />

                <section className="flex-1 overflow-y-auto px-[5%] lg:px-[10%] py-10 pb-20">
                    <div className="max-w-5xl mx-auto">

                        {/* Header */}
                        <h1 className="text-4xl font-bold text-slate-800 mb-8 pl-4 tracking-tight">
                            Hành trình phát triển
                        </h1>

                        {/* Chart Card */}
                        <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 mb-12 h-[350px]">
                            <div className="w-full h-full relative mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 13 }}
                                            interval="preserveStartEnd"
                                            ticks={['Session 1', 'Session 5', 'Session 10', 'Session 15', 'Session 20']} // Simplified domain
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 13 }}
                                            domain={[0, 10]}
                                            ticks={[0, 2, 4, 6, 8, 10]}
                                        />
                                        {/* Highlighted dots based on the image */}
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#14b8a6" /* teal-500 */
                                            strokeWidth={4}
                                            dot={(props: any) => {
                                                const { cx, cy, payload, index } = props;
                                                const isMainPoint = ['Session 1', 'Session 5', 'Session 10', 'Session 15'].includes(payload.name) || index === data.length - 1;
                                                if (isMainPoint) {
                                                    return (
                                                        <svg key={index} x={cx - 12} y={cy - 12} width={24} height={24} overflow="visible">
                                                            <circle cx="12" cy="12" r="10" fill="rgba(251, 191, 36, 0.4)" />
                                                            <circle cx="12" cy="12" r="5" fill="#f59e0b" />
                                                        </svg>
                                                    );
                                                }
                                                return <svg key={index}></svg>;
                                            }}
                                            activeDot={{ r: 8, fill: '#f59e0b', stroke: 'rgba(251, 191, 36, 0.4)', strokeWidth: 8 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Badges Section */}
                        <div className="pl-4">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">
                                Các &apos;Huy hiệu&apos; cần loại bỏ
                            </h2>

                            <div className="flex flex-wrap items-center gap-16">

                                {/* Active Badge */}
                                <div className="flex items-center gap-5">
                                    <div className="relative w-[70px] h-[80px] flex-shrink-0">
                                        {/* Placeholder for shield badge - recreated using SVG */}
                                        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
                                            <path d="M50 0 L100 20 L100 70 C100 95 75 115 50 120 C25 115 0 95 0 70 L0 20 Z" fill="#334155" />
                                            <path d="M50 5 L95 24 L95 70 C95 90 75 105 50 112 C25 105 5 90 5 70 L5 24 Z" fill="#475569" stroke="#14b8a6" strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">À Ờ Master</h3>
                                        <p className="text-sm font-medium text-slate-500">Còn xuất hiện trong 40% bài nói</p>
                                    </div>
                                </div>

                                {/* Inactive Badge */}
                                <div className="flex items-center gap-5 opacity-40">
                                    <div className="relative w-[70px] h-[80px] flex-shrink-0">
                                        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-sm">
                                            <path d="M50 0 L100 20 L100 70 C100 95 75 115 50 120 C25 115 0 95 0 70 L0 20 Z" fill="#cbd5e1" />
                                            <path d="M50 5 L95 24 L95 70 C95 90 75 105 50 112 C25 105 5 90 5 70 L5 24 Z" fill="#e2e8f0" stroke="#f1f5f9" strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-500 mb-1">Giọng Robot</h3>
                                        <p className="text-sm font-medium text-slate-400">Đã cải thiện, chỉ còn 10%</p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Bottom Ni Message Card */}
                    <div className="max-w-5xl mx-auto mt-16 mb-8 px-4">
                        <div className="bg-[var(--navy)] rounded-[24px] p-6 sm:p-8 relative flex items-center min-h-[120px] shadow-lg border border-slate-700/50">

                            {/* Ni Avatar Overlapping Circle */}
                            <div className="absolute left-[-15px] sm:left-[-25px] top-1/2 -translate-y-1/2 w-[100px] h-[100px] rounded-full overflow-hidden bg-[var(--navy)] border-4 border-[#f8fafc] shadow-md z-10 flex items-center justify-center">
                                <Image
                                    src="/ni-avatar.png"
                                    alt="Ni"
                                    width={100}
                                    height={100}
                                    className="object-cover object-top scale-[1.65] translate-y-3"
                                />
                            </div>

                            {/* Message */}
                            <div className="pl-[75px] sm:pl-[95px] pr-8 sm:pr-12 text-white leading-relaxed text-[15px] sm:text-[16px] font-medium flex-1">
                                Level hiện tại: Người hùng biện tập sự. Chúng ta đã đi được một chặng đường khá dài. Đừng nản chí, sự tự tin được xây dựng từ hàng ngàn lần vấp váp. Ni luôn ở đây. Cố lên!
                            </div>

                            {/* Decorative Star */}
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none hidden md:block">
                                <svg width="60" height="60" viewBox="0 0 100 100" fill="white">
                                    <path d="M50 0 Q50 50 100 50 Q50 50 50 100 Q50 50 0 50 Q50 50 50 0 Z" />
                                </svg>
                            </div>

                        </div>
                    </div>

                </section>
            </main>
        </div>
    );
}
