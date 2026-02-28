import { CalendarDays } from "lucide-react";

export default function StreakCard() {
  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: "var(--card)" }}>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
          style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0" }}
        >
          <CalendarDays size={20} style={{ color: "#22c55e" }} />
        </div>
        <div>
          <p className="text-[18px] font-bold" style={{ color: "var(--foreground)" }}>
            <span style={{ color: "var(--teal)" }}>0</span> Day(s) Streak
          </p>
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            Hoàn thành nhiệm vụ để bắt đầu streak nè :)
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="my-3" style={{ borderTop: "1px solid var(--border)" }} />

      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          Đóng đá streak: còn <span className="font-semibold">0</span> (ngày)
        </p>
        <div
          className="w-5 h-5 rounded-sm flex-shrink-0"
          style={{ backgroundColor: "var(--teal)", opacity: 0.7 }}
        />
      </div>
    </div>
  );
}
