"use client";

import { ChevronLeft, Home, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TopbarProps {
    variant?: "brand" | "light";
}

export default function Topbar({ variant = "brand" }: TopbarProps) {
    const isLight = variant === "light";

    return (
        <header
            className={cn(
                "flex items-center justify-between h-14 px-6 shrink-0",
                isLight ? "bg-white text-slate-800 border-b border-slate-100" : "text-white"
            )}
            style={isLight ? {} : { backgroundColor: "var(--navy)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
            <div className="flex items-center gap-6">
                <button className="flex items-center gap-1.5 text-[13px] font-medium opacity-80 hover:opacity-100 transition-opacity">
                    <ChevronLeft size={16} />
                    Quay lại
                </button>
                <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium opacity-80 hover:opacity-100 transition-opacity">
                    <Home size={15} />
                    Trang chủ
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <div className={cn("w-[30px] h-[30px] rounded-full overflow-hidden flex items-center justify-center", isLight ? "bg-slate-100 border border-slate-200" : "bg-white/10")}>
                    {/* Fallback to simple icon since ni-avatar.png is full body, but let's try scaling it */}
                    <Image
                        src="/ni-avatar.png"
                        width={30}
                        height={30}
                        alt="User avatar"
                        className="object-cover object-top scale-150 translate-y-2"
                    />
                </div>
                <button className="opacity-80 hover:opacity-100 transition-opacity">
                    <Settings size={18} />
                </button>
            </div>
        </header>
    );
}
