"use client";

import { Home, History, BookOpen, Trophy, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: History, label: "History", href: "/history" },
  { icon: BookOpen, label: "Library", href: "/library" },
  { icon: Trophy, label: "Thành tích", href: "/achievements" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex flex-col items-center w-16 min-h-screen py-4 gap-1"
      style={{ backgroundColor: "var(--navy)", borderRight: "1px solid var(--sidebar-border)" }}>
      {/* Logo */}
      <div className="flex items-center justify-center w-10 h-10 mb-4 rounded-full overflow-hidden mt-2">
        <div className="flex items-center justify-center w-10 h-10 bg-[#0f1b2d] border border-slate-700/50">
          {/* Recreate N~ logo with soundwave */}
          <svg viewBox="0 0 100 100" className="w-8 h-8" fill="none">
            <text x="25" y="65" fontFamily="Georgia, serif" fontSize="48" fill="white" fontWeight="bold">N</text>
            <path d="M 60,45 Q 68,30 75,45 T 90,45" stroke="#2dd4bf" strokeWidth="6" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-1 w-full px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Exact match for home, partial for others (e.g. /history, /history/1)
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center w-full py-3 my-0.5 gap-1 transition-all group",
                isActive
                  ? "text-[var(--teal)] opacity-100"
                  : "text-white opacity-60 hover:opacity-100"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--teal)] rounded-r-md" />
              )}
              <Icon size={20} className={cn("transition-colors", isActive ? "text-[var(--teal)]" : "text-white group-hover:text-white")} />
              <span className="text-[10px] font-medium leading-none text-center mt-1 transition-colors">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
