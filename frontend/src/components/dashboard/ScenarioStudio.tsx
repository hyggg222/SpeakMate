"use client";

import React from "react";
import { motion } from "framer-motion";
import { Palette, Image as ImageIcon, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

export default function ScenarioStudio() {
    return (
        <section className="mt-8">
            <h2 className="text-[18px] font-bold text-foreground mb-4">
                Phòng Lab Sáng tạo (Studio) 🎨
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Custom Scenario Builder */}
                <Link href="/setup">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="h-40 relative rounded-2xl overflow-hidden group cursor-pointer border border-border/50"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 group-hover:from-violet-600/30 group-hover:to-fuchsia-600/30 transition-all" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6 text-violet-400" />
                            </div>
                            <h3 className="text-[16px] font-bold text-foreground">
                                Tạo bối cảnh mới
                            </h3>
                            <p className="text-[12px] text-muted-foreground mt-1">
                                Tự định nghĩa tình huống luyện tập của riêng bạn.
                            </p>
                        </div>
                    </motion.div>
                </Link>

                {/* Image Collection / Studio */}
                <Link href="/studio/assets">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="h-40 relative rounded-2xl overflow-hidden group cursor-pointer border border-border/50 bg-secondary/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-600/10 to-emerald-600/10" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <ImageIcon className="w-6 h-6 text-teal-400" />
                            </div>
                            <h3 className="text-[16px] font-bold text-foreground">
                                Quản lý Tài nguyên (Assets)
                            </h3>
                            <p className="text-[12px] text-muted-foreground mt-1">
                                Cập nhật Mentor Ni và hình ảnh bối cảnh (Dev Tool).
                            </p>

                            <div className="mt-3 flex gap-1">
                                <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">🛠 Dev Tool</span>
                                <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <Sparkles size={10} /> Hot
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </Link>
            </div>
        </section>
    );
}
