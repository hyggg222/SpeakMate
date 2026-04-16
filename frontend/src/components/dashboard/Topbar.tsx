"use client";

import { ChevronLeft, Home, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface TopbarProps {
    variant?: "brand" | "light";
}

export default function Topbar({ variant = "brand" }: TopbarProps) {
    const isLight = variant === "light";
    const router = useRouter();
    const { t } = useLanguage();
    // Cache-buster computed only on client to keep SSR HTML in sync with hydration
    const [avatarSrc, setAvatarSrc] = useState("/ni-avatar.png");
    useEffect(() => {
        const now = new Date();
        setAvatarSrc(`/ni-avatar.png?v=${now.getHours()}_${Math.floor(now.getMinutes() / 5)}`);
    }, []);

    return (
        <header
            className={cn(
                "flex items-center justify-between h-14 px-6 shrink-0",
                isLight ? "bg-white text-slate-800 border-b border-slate-100" : "text-white"
            )}
            style={isLight ? {} : { backgroundColor: "var(--navy)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
            <div className="flex items-center gap-6 pl-12 md:pl-0">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-[13px] font-medium opacity-80 hover:opacity-100 transition-opacity"
                >
                    <ChevronLeft size={16} />
                    {t('nav.back')}
                </button>
                <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium opacity-80 hover:opacity-100 transition-opacity">
                    <Home size={15} />
                    {t('nav.home')}
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <Link href="/chat" title={t('practice.mentorChat')}
                    className={cn("w-[30px] h-[30px] rounded-full overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-teal-400/50 transition-all cursor-pointer", isLight ? "bg-slate-100 border border-slate-200" : "bg-white/10")}>
                    <Image
                        src={avatarSrc}
                        width={30}
                        height={30}
                        alt="Mentor Ni"
                        className="object-cover object-top scale-150 translate-y-2"
                        unoptimized
                    />
                </Link>
                <button className="opacity-80 hover:opacity-100 transition-opacity">
                    <Settings size={18} />
                </button>
            </div>
        </header>
    );
}
