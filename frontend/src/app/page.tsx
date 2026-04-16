import Sidebar from "@/components/dashboard/Sidebar";
import AvatarGreeting from "@/components/dashboard/AvatarGreeting";
import PracticeCards from "@/components/dashboard/PracticeCards";
import DailyTask from "@/components/dashboard/DailyTask";
import StreakCard from "@/components/dashboard/StreakCard";
import ActivityCalendar from "@/components/dashboard/ActivityCalendar";
import ActiveChallenges from "@/components/dashboard/ActiveChallenges";

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Center panel */}
        <section className="flex-1 overflow-hidden px-6 pt-3 pb-2 flex flex-col">
          <h1 className="text-[24px] font-bold mb-2 text-balance leading-tight" style={{ color: "var(--foreground)" }}>
            Trung tâm Luyện tập
          </h1>

          <AvatarGreeting />
          <PracticeCards />
        </section>

        {/* Right panel */}
        <aside
          className="w-72 flex-shrink-0 overflow-hidden px-4 pt-4 pb-2 flex flex-col gap-3"
          style={{ borderLeft: "1px solid var(--border)" }}
        >
          <ActiveChallenges />
          <DailyTask />
          <StreakCard />
          <ActivityCalendar />
        </aside>
      </main>
    </div>
  );
}
