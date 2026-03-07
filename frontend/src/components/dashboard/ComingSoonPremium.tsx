"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Languages, Mic2, Users } from "lucide-react";

const upcomingFeatures = [
    {
        title: "Phòng luyện phát âm",
        desc: "Phân tích khẩu hình và ngữ điệu AI chuyên sâu.",
        icon: Mic2,
        color: "from-blue-500 to-indigo-600",
    },
    {
        title: "Gia sư Ngữ pháp",
        desc: "Chỉnh sửa lỗi sai trong thời gian thực khi bạn nói.",
        icon: Languages,
        color: "from-emerald-500 to-teal-600",
    },
    {
        title: "Thách thức Cộng đồng",
        desc: "Cùng luyện tập và thi đua với bạn học toàn cầu.",
        icon: Users,
        color: "from-purple-500 to-pink-600",
    },
];

export default function ComingSoonPremium() {
    return (
        <section className="mt-10 mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-[18px] font-bold text-foreground">
                    Sắp ra mắt
                </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {upcomingFeatures.map((f, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -5 }}
                        className="p-4 rounded-2xl bg-secondary/30 border border-border/50 relative overflow-hidden group"
                    >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 shadow-lg`}>
                            <f.icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-[15px] font-bold text-foreground mb-1">
                            {f.title}
                        </h3>
                        <p className="text-[12px] text-muted-foreground leading-snug">
                            {f.desc}
                        </p>

                        {/* Glossy shine effect */}
                        <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-shine" />
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
