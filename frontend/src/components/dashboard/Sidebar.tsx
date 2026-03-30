"use client";

import { History, FileText, MessageCircle, Settings, LogOut, Share2, Target, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

const navItems = [
  { icon: MessageCircle, label: "Mentor Ni", href: "/chat" },
  { icon: Share2, label: "Chia sẻ", href: "/feedback/new" },
  { icon: Target, label: "Thử thách", href: "/challenges" },
  { icon: FileText, label: "Kho Chuyện", href: "/stories" },
  { icon: History, label: "Lịch sử", href: "/history" },
  { icon: Settings, label: "Cài đặt", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
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
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col items-center w-20 min-h-screen py-4 gap-1"
        style={{ backgroundColor: "var(--navy)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center w-12 h-12 p-1.5 mb-3 rounded-xl overflow-hidden mt-2 border border-slate-700/50 bg-[#0f1b2d] hover:border-teal-500/50 transition-colors shadow-inner">
          <Image
            src="/brand-logo.png"
            alt="SpeakMate"
            width={40}
            height={40}
            style={{ width: '100%', height: '100%' }}
            className="object-contain"
            priority
          />
        </Link>

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
                  "relative flex flex-col items-center justify-center w-full py-2.5 my-0.5 gap-1 transition-all group",
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
          {user && (
            <div
              className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold border border-teal-400/40"
              title={user.user_metadata?.full_name || user.email || ""}
            >
              {avatarLetter}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-full py-2 gap-1 text-white opacity-50 hover:opacity-100 transition-all group"
            title="Đăng xuất"
          >
            <LogOut size={18} className="text-white group-hover:text-red-400 transition-colors" />
            <span className="text-[10px] font-medium leading-none">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile: hamburger + drawer ────────────────────────────── */}
      <div className="md:hidden">
        {/* Hamburger button — fixed top-left */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed top-3.5 left-3.5 z-50 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-slate-700/60"
          style={{ backgroundColor: "var(--navy)" }}
          aria-label="Mở menu"
        >
          <Menu size={20} className="text-white" />
        </button>

        {/* Backdrop */}
        {drawerOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Drawer — slides from left */}
        <div
          className={cn(
            "fixed top-0 left-0 h-full w-64 z-[70] flex flex-col transition-transform duration-300 ease-in-out",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{ backgroundColor: "var(--navy)", borderRight: "1px solid var(--sidebar-border)" }}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/40">
            <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700/50 bg-[#0f1b2d] p-1">
                <Image src="/brand-logo.png" alt="SpeakMate" width={32} height={32} className="object-contain w-full h-full" />
              </div>
              <span className="text-white font-bold text-[15px]">SpeakMate</span>
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
            <Link
              href="/"
              onClick={() => setDrawerOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all",
                pathname === "/"
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              <span className="text-base">🏠</span> Trang chủ
            </Link>
            <Link
              href="/setup"
              onClick={() => setDrawerOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all",
                pathname.startsWith("/setup")
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              <span className="text-base">🎤</span> Luyện tập
            </Link>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all",
                    isActive
                      ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                      : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info + logout */}
          <div className="p-3 border-t border-slate-700/40 space-y-1">
            {user && (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/40">
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold border border-teal-400/40 shrink-0">
                  {avatarLetter}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => { setDrawerOpen(false); handleLogout(); }}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[14px] font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
