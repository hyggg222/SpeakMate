'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import AvatarGreeting from "@/components/dashboard/AvatarGreeting";
import RecentScenario from "@/components/dashboard/RecentScenario";
import FeaturedScenarios from "@/components/dashboard/FeaturedScenarios";
import ScenarioStudio from "@/components/dashboard/ScenarioStudio";
import ComingSoonPremium from "@/components/dashboard/ComingSoonPremium";
import DailyTask from "@/components/dashboard/DailyTask";
import StreakCard from "@/components/dashboard/StreakCard";
import ActiveChallenges from "@/components/dashboard/ActiveChallenges";
import ProgressCard from "@/components/dashboard/ProgressCard";
import WelcomeBanner from "@/components/WelcomeBanner";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    try {
      const onboarding = localStorage.getItem('speakmate_onboarding');
      if (!onboarding) router.push('/onboarding');
    } catch {
      // localStorage unavailable (private mode) — skip redirect
    }
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden font-sans select-none" style={{ backgroundColor: "var(--background)" }}>
      {/* Sidebar (desktop) + mobile hamburger drawer */}
      <Sidebar />

      {/* Main content */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Center panel */}
        <section className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pt-16 md:pt-3 pb-8 flex flex-col hide-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full">
            <WelcomeBanner />

            <h1 className="text-[22px] md:text-[24px] font-bold mb-2 text-balance leading-tight" style={{ color: "var(--foreground)" }}>
              Trung tâm Luyện tập
            </h1>

            {/* Desktop greeting row — hidden on mobile to prevent overflow */}
            <div className="hidden md:flex items-end gap-6 w-full">
              <AvatarGreeting />
              <div className="flex-1 flex justify-center">
                <RecentScenario />
              </div>
            </div>

            {/* Mobile: compact action CTA instead of avatar widget */}
            <div className="md:hidden mb-4">
              <Link
                href="/setup"
                className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)' }}
              >
                <div>
                  <p className="font-bold text-[15px]">Bắt đầu luyện tập 🎤</p>
                  <p className="text-[12px] opacity-80 mt-0.5">Chọn chủ đề và luyện ngay</p>
                </div>
                <span className="text-2xl">→</span>
              </Link>
            </div>

            {/* Sections */}
            <FeaturedScenarios />
            <ScenarioStudio />
            <ComingSoonPremium />
          </div>
        </section>

        {/* Right panel — hidden on mobile/tablet, shown lg+ */}
        <aside
          className="hidden lg:flex w-80 flex-shrink-0 overflow-y-auto px-3 pt-2 pb-10 flex-col gap-2 hide-scrollbar sticky top-0 h-full"
          style={{ borderLeft: "1px solid var(--border)", backgroundColor: "rgba(10, 15, 25, 0.3)" }}
        >
          <ProgressCard />
          <ActiveChallenges />
          <DailyTask />
          <StreakCard />
        </aside>
      </main>
    </div>
  );
}
