'use client';

import Image from "next/image";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AvatarGreeting() {
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('bạn');
  const [imgSrc, setImgSrc] = useState('/ni-avatar.png');

  useEffect(() => {
    // Dynamic greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng');
    else if (hour < 18) setGreeting('Chào buổi chiều');
    else setGreeting('Chào buổi tối');

    // Randomize message on client only (avoid SSR/client mismatch)
    setMessage(messages[Math.floor(Math.random() * messages.length)]);

    // Cache-bust image on client only
    const h = new Date().getHours();
    const m = Math.floor(new Date().getMinutes() / 5);
    setImgSrc(`/ni-avatar.png?v=${h}_${m}`);

    // Try Supabase auth first, fallback to localStorage
    async function loadUserName() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
          return;
        }
        if (user?.email) {
          setUserName(user.email.split('@')[0]);
          return;
        }
      } catch {
        // Not authenticated
      }
      const savedName = localStorage.getItem('speakmate_username');
      if (savedName) setUserName(savedName);
    }
    loadUserName();
  }, []);

  // Motivational messages rotate
  const messages = [
    'Hôm nay luyện tập chút nhé? 💪',
    'Mỗi ngày một bước, bạn sẽ tự tin hơn!',
    'Ni sẵn sàng đồng hành cùng bạn rồi!',
    'Thử nói vài câu hôm nay nhé? 🎤',
  ];
  const [message, setMessage] = useState(messages[0]);

  return (
    <div className="flex items-end gap-6 py-2 group">
      {/* Mentor Ni "Elegant Architectural window" Container */}
      <div className="relative flex-shrink-0 w-44 h-[200px]">
        {/* Modern Window Structure */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-t-[100px] border-[2px] border-slate-200/50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col transition-all duration-500">

          {/* Sofisticated Glass Panes */}
          <div className="absolute inset-0 opacity-15 pointer-events-none z-20">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/40" />
            <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white/40" />
          </div>

          {/* Ni behind the glass */}
          <div className="relative flex-1 bg-gradient-to-b from-slate-50/20 via-slate-100/40 to-slate-200/60">
            <Image
              src={imgSrc}
              alt="Mentor Ni"
              fill
              className="object-contain object-bottom scale-[1.02] z-10"
              priority
              unoptimized
            />
          </div>
        </div>

        {/* Minimal Window Sill */}
        <div className="absolute -bottom-0.5 -inset-x-3 h-2.5 bg-slate-400/80 rounded-full shadow-lg z-30 border-b border-slate-500/30" />
      </div>

      {/* Speech Bubble / Greeting Box */}
      <div className="relative mb-8 max-w-sm">
        <div
          className="relative px-8 py-7 rounded-[40px] rounded-bl-none shadow-[0_25px_50px_-15px_rgba(0,0,0,0.06)] border border-white/80 bg-white/95 backdrop-blur-sm"
        >
          <div className="flex flex-col gap-2">
            <h3 className="text-[16px] font-black tracking-tight text-slate-800 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]" />
              {greeting}, <span className="text-emerald-500">{userName}</span>
            </h3>
            <p className="text-[17px] font-medium text-slate-500 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Elegant Triangle Pointer */}
        <div className="absolute -bottom-3 left-0 w-0 h-0 border-t-[16px] border-t-white/95 border-r-[22px] border-r-transparent" />
      </div>
    </div>
  );
}
