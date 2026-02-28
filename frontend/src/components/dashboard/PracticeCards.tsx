"use client";

import React from "react";
import Link from "next/link";

const modes = [
  {
    id: "monologue",
    title: "Giao tiếp cơ bản",
    subtitle: "(Safe Mode)",
    desc: "Luyện tập giao tiếp thoải mái, phản xạ tự nhiên. AI ít đánh giá khắt khe về nội dung.",
    bg: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", // lighter, more vibrant teal
    buttonColor: "#ffffff40", // translucent white button to match bright bg
    svg: <PodiumSvg />,
    isUpdating: false,
  },
  {
    id: "presentation",
    title: "Thuyết trình",
    subtitle: "(Presentation)",
    desc: "Trau dồi kỹ năng nói trước đám đông, trình bày lưu loát và cấu trúc bài nói mạch lạc.",
    bg: "linear-gradient(135deg, #1e3a5f 0%, #0f1c3a 100%)",
    buttonColor: "#3b82f6", // blue-500
    svg: <PodiumSvg />, // Swapped to Podium for presentation
    isUpdating: true,
  },
];

const debateMode = {
  id: "debate",
  title: "Tranh biện",
  subtitle: "(Debate)",
  desc: "Luyện phản biện, phản hồi nhanh và xây dựng lập luận chặt chẽ.",
  bg: "linear-gradient(135deg, #2a1b08 0%, #170e03 100%)",
  buttonColor: "#f59e0b", // amber-500
  svg: <DebateSvg />,
  isUpdating: true,
};

export default function PracticeCards() {
  return (
    <section className="mt-8 flex flex-col flex-1 transform scale-[0.95] origin-top">
      <h2 className="text-[16px] font-bold mb-3" style={{ color: "var(--foreground)" }}>
        Chọn chế độ luyện tập
      </h2>

      {/* Top row: 2 cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {modes.map((mode) => (
          <PracticeCard key={mode.id} mode={mode} />
        ))}
      </div>

      {/* Bottom row: 1 centered card (debate) */}
      <div className="flex justify-center">
        {/* Make it take ~70% width to match the UI visual balance */}
        <div className="w-[70%]">
          <PracticeCard mode={debateMode} />
        </div>
      </div>
    </section>
  );
}

function PracticeCard({ mode }: { mode: any }) {
  return (
    <div
      className={`relative rounded-3xl p-5 overflow-hidden text-white flex flex-col justify-between shadow-sm ${mode.isUpdating ? 'opacity-80 grayscale-[20%]' : ''}`}
      style={{ background: mode.bg, minHeight: "200px" }}
    >
      {/* Background icon */}
      <div className="absolute -right-3 -bottom-3 w-36 h-36 opacity-40 pointer-events-none">
        {mode.svg}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start">
          <h3 className="text-[20px] font-bold leading-tight flex flex-col gap-1">
            {mode.title}
            <span className="font-normal text-[14px] opacity-80" style={{ color: mode.id === 'debate' ? '#fde68a' : (mode.id === 'presentation' ? '#93c5fd' : '#99f6e4') }}>{mode.subtitle}</span>
          </h3>
          {mode.isUpdating && (
            <span className="bg-white/20 text-white text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap shadow-sm border border-white/10">Đang cập nhật</span>
          )}
        </div>
        <p className="text-[13px] opacity-80 mt-2 leading-relaxed flex-1 max-w-[80%]">{mode.desc}</p>
        <div className="mt-3">
          {mode.isUpdating ? (
            <span
              className="inline-block px-5 py-2.5 rounded-full text-[13px] font-bold text-white/50 cursor-not-allowed align-center bg-white/10 border border-white/5"
            >
              Sắp ra mắt
            </span>
          ) : (
            <Link
              href="/setup"
              className="inline-block px-5 py-2.5 rounded-full text-[13px] font-bold text-white transition-opacity hover:opacity-90 align-center shadow-md hover:shadow-lg hover:-translate-y-0.5"
              style={{ backgroundColor: mode.buttonColor }}
            >
              Bắt đầu
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Decorative SVGs ─────────────────────────────── */
function PodiumSvg() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
      <ellipse cx="50" cy="35" rx="16" ry="22" fill="#2dd4bf" opacity="0.8" />
      <rect x="44" y="57" width="12" height="20" rx="2" fill="#2dd4bf" opacity="0.6" />
      <path d="M34 68 Q50 78 66 68" stroke="#2dd4bf" strokeWidth="3" fill="none" opacity="0.6" />
      <rect x="46" y="76" width="8" height="12" rx="2" fill="#2dd4bf" opacity="0.4" />
      <rect x="36" y="86" width="28" height="4" rx="2" fill="#2dd4bf" opacity="0.4" />

      {/* Spotlight effect */}
      <polygon points="50,0 20,100 80,100" fill="#2dd4bf" opacity="0.1" />
    </svg>
  );
}

function ChatSvg() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
      <rect x="12" y="20" width="50" height="35" rx="8" fill="#60a5fa" opacity="0.9" />
      <polygon points="20,54 12,65 32,54" fill="#60a5fa" opacity="0.9" />
      <rect x="38" y="45" width="50" height="35" rx="8" fill="#93c5fd" opacity="0.6" />
      <polygon points="78,79 88,90 68,79" fill="#93c5fd" opacity="0.6" />

      {/* Lines in chat */}
      <rect x="22" y="30" width="30" height="3" rx="1.5" fill="white" opacity="0.8" />
      <rect x="22" y="38" width="20" height="3" rx="1.5" fill="white" opacity="0.8" />
    </svg>
  );
}

function DebateSvg() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
      {/* Speaker Left (Blue/Cyan) */}
      <path d="M 25 35 Q 35 30 40 40 L 40 60 L 20 60 Z" fill="#38bdf8" opacity="0.9" />
      <circle cx="28" cy="22" r="10" fill="#38bdf8" opacity="0.9" />
      <rect x="38" y="48" width="4" height="15" rx="2" fill="#0284c7" />
      <rect x="34" y="60" width="12" height="40" fill="#0284c7" />

      {/* Speaker Right (Yellow/Orange) */}
      <path d="M 75 35 Q 65 30 60 40 L 60 60 L 80 60 Z" fill="#fbbf24" opacity="0.9" />
      <circle cx="72" cy="22" r="10" fill="#fbbf24" opacity="0.9" />
      <rect x="58" y="48" width="4" height="15" rx="2" fill="#d97706" />
      <rect x="54" y="60" width="12" height="40" fill="#d97706" />

      {/* Sound waves */}
      <path d="M 45 25 Q 48 30 45 35" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M 48 22 Q 52 30 48 38" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.4" />

      <path d="M 55 25 Q 52 30 55 35" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M 52 22 Q 48 30 52 38" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.4" />
    </svg>
  );
}
