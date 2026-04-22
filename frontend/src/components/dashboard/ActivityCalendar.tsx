"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";

const WEEKS = 5;
const DAYS_PER_WEEK = 7;

// Labels for specific indices to keep it clean (GitHub style: Mon, Wed, Fri)
const ALL_DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const LEVEL_COLORS = [
  "#e9f0ef",  // 0
  "#a7d9d3",  // 1
  "#6ec4bb",  // 2
  "#3aada2",  // 3
  "#1a7a74",  // 4
];

function buildHeatmapFromSessions(sessions: any[]): number[][] {
  const dayCounts: Record<string, number> = {};
  sessions.forEach((s: any) => {
    const day = (s.created_at || '').slice(0, 10);
    if (day) dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const today = new Date();
  const data: number[][] = Array.from({ length: DAYS_PER_WEEK }, () => Array(WEEKS).fill(0));

  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const offset = (WEEKS - 1 - w) * 7 + (6 - d);
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      const key = date.toISOString().slice(0, 10);
      const count = dayCounts[key] || 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
      data[d][w] = level;
    }
  }
  return data;
}

function emptyGrid(): number[][] {
  return Array.from({ length: DAYS_PER_WEEK }, () => Array(WEEKS).fill(0));
}

export default function ActivityCalendar() {
  const [activityRows, setActivityRows] = useState<number[][]>(emptyGrid());
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    const now = new Date();
    const monthName = `Tháng ${now.getMonth() + 1}`;
    setCurrentMonth(monthName);

    async function fetchActivity() {
      try {
        const sessions = await apiClient.getUserSessions(100);
        if (sessions && Array.isArray(sessions)) {
          setActivityRows(buildHeatmapFromSessions(sessions));
        }
      } catch (error) {
        console.error("Lỗi fetch activity:", error);
      }
      setLoading(false);
    }
    fetchActivity();
  }, []);

  return (
    <div className="rounded-xl p-3 shadow-sm" style={{ backgroundColor: "var(--card)" }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-bold" style={{ color: "var(--foreground)" }}>
          Lịch hoạt động
        </h3>
        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {currentMonth}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex flex-col gap-1 items-center" style={{ minWidth: "fit-content" }}>
          {/* Grid Rows - 7 Rows (one for each day of the week) */}
          {Array.from({ length: DAYS_PER_WEEK }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-1.5">
              <span className="text-[8px] w-5 text-right font-medium" style={{ color: "var(--muted-foreground)" }}>
                {ALL_DAY_LABELS[rowIndex]}
              </span>
              <div className="flex gap-1">
                {activityRows[rowIndex].map((val, colIndex) => (
                  <div
                    key={colIndex}
                    className={`rounded-[2px] transition-colors duration-500 ${loading ? 'animate-pulse' : ''}`}
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: LEVEL_COLORS[val],
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-2 justify-end">
          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Ít</span>
          <div className="flex items-center gap-1">
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                className="rounded-[1.5px]"
                style={{ width: 7, height: 7, backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Nhiều</span>
        </div>
      </div>
    </div>
  );
}
