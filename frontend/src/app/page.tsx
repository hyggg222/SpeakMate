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
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";

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
      {/* Sidebar — hidden on mobile, shown md+ */}
      <Sidebar />

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Center panel */}
        <section className="flex-1 overflow-y-auto px-6 pt-3 pb-20 md:pb-8 flex flex-col hide-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full">
            <WelcomeBanner />
            <h1 className="text-[24px] font-bold mb-2 text-balance leading-tight" style={{ color: "var(--foreground)" }}>
              Trung tâm Luyện tập
            </h1>

            <div className="flex items-end gap-6 w-full">
              <AvatarGreeting />
              <div className="flex-1 flex justify-center">
                <RecentScenario />
              </div>
            </div>

            {/* New Modern Sections */}
            <FeaturedScenarios />
            <ScenarioStudio />
            <ComingSoonPremium />
          </div>
        </section>

        {/* Right panel — hidden on mobile, shown lg+ */}
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

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
