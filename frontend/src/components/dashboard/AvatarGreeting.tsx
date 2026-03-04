'use client';

import Image from "next/image";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AvatarGreeting() {
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('bạn');

  useEffect(() => {
    // Dynamic greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng');
    else if (hour < 18) setGreeting('Chào buổi chiều');
    else setGreeting('Chào buổi tối');

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
  const [message] = useState(() => messages[Math.floor(Math.random() * messages.length)]);

  return (
    <div className="flex items-end gap-4 -mt-2">
      {/* Avatar Image */}
      <div className="relative flex-shrink-0 w-28 h-[140px]">
        <Image
          src="/ni-avatar.png"
          alt="Mentor Ni"
          fill
          className="object-contain object-bottom drop-shadow-md"
          priority
        />
      </div>

      {/* Speech Bubble */}
      <div className="relative mb-2">
        <div
          className="relative px-5 py-4 rounded-2xl rounded-bl-none text-sm leading-relaxed max-w-xs shadow-sm"
          style={{ backgroundColor: "#e6f7f5", border: "1.5px solid var(--teal-light)", color: "var(--foreground)" }}
        >
          <p className="font-medium text-[13px] leading-relaxed" style={{ color: "var(--foreground)" }}>
            {greeting}, <span className="font-bold" style={{ color: "var(--teal)" }}>{userName}</span>. {message}
          </p>
        </div>
        {/* Triangle pointer */}
        <div
          className="absolute -bottom-2 left-0 w-0 h-0"
          style={{
            borderTop: "10px solid #e6f7f5",
            borderRight: "12px solid transparent",
          }}
        />
      </div>
    </div>
  );
}
