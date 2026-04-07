"use client";

import { Home, History, BookOpen, Trophy, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: History, label: "History", href: "/history" },
  { icon: BookOpen, label: "Library", href: "/library" },
  { icon: Trophy, label: "Thành tích", href: "/achievements" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const avatarLetter = user?.user_metadata?.full_name?.[0]?.toUpperCase()
    || user?.email?.[0]?.toUpperCase()
    || "?";

  return (
    <aside className="flex flex-col items-center w-16 min-h-screen py-4 gap-1"
      style={{ backgroundColor: "var(--navy)", borderRight: "1px solid var(--sidebar-border)" }}>

      {/* Logo */}
      <div className="flex items-center justify-center w-10 h-10 mb-4 rounded-full overflow-hidden mt-2">
        <div className="flex items-center justify-center w-10 h-10 bg-[#0f1b2d] border border-slate-700/50">
          <svg viewBox="0 0 100 100" className="w-8 h-8" fill="none">
            <text x="25" y="65" fontFamily="Georgia, serif" fontSize="48" fill="white" fontWeight="bold">N</text>
            <path d="M 60,45 Q 68,30 75,45 T 90,45" stroke="#2dd4bf" strokeWidth="6" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-1 w-full px-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
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

      {/* Bottom: User avatar + Logout */}
      <div className="flex flex-col items-center gap-2 pb-2 w-full px-1">

        {/* User avatar */}
        {user && (
          <div
            className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold border border-teal-400/40"
            title={user.user_metadata?.full_name || user.email || ""}
          >
            {avatarLetter}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-full py-2 gap-1 text-white opacity-50 hover:opacity-100 transition-all group"
          title="Đăng xuất"
        >
          <LogOut size={18} className="text-white group-hover:text-red-400 transition-colors" />
          <span className="text-[10px] font-medium leading-none">Logout</span>
        </button>
      </div>
    </aside>
  );
}
