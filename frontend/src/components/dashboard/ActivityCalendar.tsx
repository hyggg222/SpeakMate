"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";

const WEEKS = 24;
const DAYS_PER_WEEK = 7;

const MONTHS = ["Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const DAY_LABELS = ["Thu", "Sat", "Tue"];
const LEVEL_COLORS = [
  "#e9f0ef",  // 0
  "#a7d9d3",  // 1
  "#6ec4bb",  // 2
  "#3aada2",  // 3
  "#1a7a74",  // 4
];

function buildHeatmapFromSessions(sessions: any[]): number[][] {
  // Count sessions per day
  const dayCounts: Record<string, number> = {};
  sessions.forEach((s: any) => {
    const day = (s.created_at || '').slice(0, 10);
    if (day) dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  // Build grid: 7 rows x WEEKS columns, ending at today
  const today = new Date();
  const data: number[][] = Array.from({ length: DAYS_PER_WEEK }, () => Array(WEEKS).fill(0));

  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const offset = (WEEKS - 1 - w) * 7 + (6 - d);
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      const key = date.toISOString().slice(0, 10);
      const count = dayCounts[key] || 0;
      // Map count to level 0-4
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
  const weeksPerMonth = 4;

  useEffect(() => {
    async function fetchActivity() {
      try {
        const sessions = await apiClient.getUserSessions(100);
        if (sessions && sessions.length > 0) {
          setActivityRows(buildHeatmapFromSessions(sessions));
        }
      } catch {
        // Guest mode — keep empty grid
      }
      setLoading(false);
    }
    fetchActivity();
  }, []);

  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: "var(--card)" }}>
      <h3 className="text-[15px] font-bold mb-3" style={{ color: "var(--foreground)" }}>
        Lịch hoạt động
      </h3>

      <div className="overflow-x-auto">
        <div className="flex flex-col gap-1" style={{ minWidth: "fit-content" }}>

          {/* Months Header */}
          <div className="flex" style={{ paddingLeft: 24 }}>
            {MONTHS.map((month) => (
              <div key={month} className="text-[10px] text-center" style={{ width: weeksPerMonth * 12.5, color: "var(--muted-foreground)" }}>
                {month}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {DAY_LABELS.map((dayLabel, rowIndex) => (
            <div key={dayLabel} className="flex items-center gap-1.5">
              <span className="text-[9px] w-5 text-right" style={{ color: "var(--muted-foreground)" }}>
                {dayLabel}
              </span>
              <div className="flex gap-1" style={{ width: WEEKS * 12.5 }}>
                {activityRows[rowIndex].map((val, colIndex) => (
                  <div
                    key={colIndex}
                    className={`rounded-[2px] ${loading ? 'animate-pulse' : ''}`}
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: LEVEL_COLORS[val],
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Đóng đá</span>
          <div className="flex items-center gap-1.5">
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                className="rounded-[2px]"
                style={{ width: 10, height: 10, backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nhiều</span>
        </div>
      </div>
    </div>
  );
}
