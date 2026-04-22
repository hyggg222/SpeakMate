"use client";

import { Radio } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";

const TOTAL = 25;

export default function DailyTask() {
  const [done, setDone] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDailyCount() {
      try {
        // Try API first (authenticated users)
        const sessions = await apiClient.getUserSessions(100);
        if (sessions && sessions.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const todaySessions = sessions.filter((s: any) =>
            s.created_at?.startsWith(today)
          );
          setDone(todaySessions.length);
          setLoading(false);
          return;
        }
      } catch {
        // Fall through to localStorage
      }

      // Fallback: localStorage (guest mode)
      try {
        const stored = localStorage.getItem('speakmate_history');
        if (stored) {
          const sessions = JSON.parse(stored);
          const today = new Date().toLocaleDateString('vi-VN');
          const todaySessions = sessions.filter((s: any) => s.date?.startsWith(today));
          setDone(todaySessions.length);
        }
      } catch (e) {
        console.error("Failed to read history", e);
      }
      setLoading(false);
    }
    fetchDailyCount();
  }, []);

  const pct = (done / TOTAL) * 100;
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const strokeDash = (pct / 100) * circ;

  return (
    <div className="rounded-xl p-3 shadow-sm" style={{ backgroundColor: "var(--card)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: "var(--teal)" }}>
          <Radio size={13} className="text-white" />
        </div>
        <span className="text-[11px] font-medium" style={{ color: "var(--muted-foreground)" }}>
          Nhiệm vụ hôm nay
        </span>
      </div>

      {/* Body */}
      <div className="flex items-center justify-between">
        <div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-5 w-32 rounded bg-slate-200 mb-1" />
              <div className="h-3 w-28 rounded bg-slate-200" />
            </div>
          ) : (
            <>
              <p className="text-[18px] font-bold leading-tight" style={{ color: "var(--foreground)" }}>
                {done >= TOTAL ? (
                  <>🎉 Hoàn thành<br />xuất sắc!</>
                ) : (
                  <>Luyện {TOTAL} lần để<br />đạt aim nhé!</>
                )}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                {done > 0 ? `Đã luyện ${done} lần hôm nay 💪` : 'Nói nhiều mới tiến bộ á :)'}
              </p>
            </>
          )}
        </div>

        {/* Circular Progress */}
        <div className="relative flex items-center justify-center flex-shrink-0">
          <svg width="60" height="60" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="5" />
            <circle
              cx="36" cy="36" r={radius}
              fill="none"
              stroke="var(--teal)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circ}`}
              strokeDashoffset={circ * 0.25}
              transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-[13px] font-bold" style={{ color: "var(--foreground)" }}>
              {done}/{TOTAL}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
