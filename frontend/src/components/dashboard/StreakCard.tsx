"use client";

import { CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

export default function StreakCard() {
  const { t, lang } = useLanguage();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStreak() {
      try {
        // Try API first (authenticated users)
        const stats = await apiClient.getUserStats();
        if (stats) {
          setStreak(stats.currentStreak);
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
          const uniqueDays = new Set(
            sessions.map((s: any) => {
              const datePart = s.date?.split(' – ')[0];
              return datePart;
            }).filter(Boolean)
          );
          setStreak(uniqueDays.size);
        }
      } catch (e) {
        console.error("Failed to calculate streak", e);
      }
      setLoading(false);
    }
    fetchStreak();
  }, []);

  return (
    <div className="rounded-xl p-3 shadow-sm" style={{ backgroundColor: "var(--card)" }}>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
        >
          <CalendarDays size={16} style={{ color: "#22c55e" }} />
        </div>
        <div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-5 w-28 rounded bg-slate-200 mb-1" />
              <div className="h-3 w-36 rounded bg-slate-200" />
            </div>
          ) : (
            <>
              <p className="text-[18px] font-bold" style={{ color: "var(--foreground)" }}>
                <span style={{ color: "var(--teal)" }}>{streak}</span> {t('streak.label')}
              </p>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                {streak > 0 ? t('streak.great') : t('streak.start')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="my-3" style={{ borderTop: "1px solid var(--border)" }} />

      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          {t('streak.footer')} <span className="font-semibold">{streak}</span>
        </p>
        <div
          className="w-5 h-5 rounded-sm flex-shrink-0"
          style={{ backgroundColor: "var(--teal)", opacity: streak > 0 ? 1 : 0.7 }}
        />
      </div>
    </div>
  );
}
