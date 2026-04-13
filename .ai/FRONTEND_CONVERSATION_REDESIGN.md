# Frontend: Conversation Room Redesign

**Date:** 2026-04-13
**Sprint:** Sprint 2 — LiveKit Real-Time Voice Integration

---

## Tổng quan

Redesign toàn bộ giao diện phòng luyện tập (`/practice/conversation`) từ dạng chat bubbles sang voice-first UI với robot avatar trung tâm, webcam PiP, floating transcripts và waveform animation.

---

## Files thay đổi

### Mới tạo — `frontend/src/components/practice/`

#### `RobotAvatar.tsx`
Avatar Mentor Ni đặt trung tâm màn hình.

| State | Animation |
|---|---|
| Idle | Breathing nhẹ (scale 1→1.012, opacity 0.3→0.5), glow xám mờ |
| `isListening` | Glow indigo/tím, pulse ring indigo |
| `isSpeaking` | Glow teal mạnh, pulse nhanh 0.7s, badge "Đang nói..." |

Props:
```ts
interface RobotAvatarProps {
    isSpeaking: boolean   // isBotResponding
    isListening: boolean  // isListening (user speaking / mic active)
}
```

---

#### `WebcamPreview.tsx`
Webcam PiP góc trên trái.

- `getUserMedia({ video: true, audio: false })` — không xin mic
- Mirror video (`scaleX(-1)`)
- Tự ẩn nếu camera bị từ chối hoặc không có
- Framer Motion slide-in từ trái sau 0.6s

---

#### `FloatingTranscripts.tsx`
Transcript nổi phía dưới avatar.

- `AnimatePresence mode="popLayout"` + `layout` prop → text đẩy lên khi có tin mới
- CSS `mask-image: linear-gradient(to bottom, transparent 0%, black 22%, black 100%)` → fade đầu danh sách
- Khi `isUserSpeaking`: `opacity: 0.2` → nhường chỗ cho waveform
- Auto-scroll xuống khi history thay đổi
- User turns: bubble trái, nền slate
- AI turns: bubble phải, nền teal-950
- Indicator listening (5 bars indigo, bounce) và responding (4 bars teal, bounce)

Props:
```ts
interface FloatingTranscriptsProps {
    history: Turn[]
    isUserSpeaking: boolean
    isBotResponding: boolean
    isListening: boolean
    personaName?: string
}
```

---

#### `WaveformVisualizer.tsx`
35 thanh waveform hiện khi user đang nói.

- Màu: teal → cyan → blue → indigo → purple (lặp)
- Random height mỗi 100ms qua `setInterval`
- Thanh trung tâm cao hơn (max 80px), thanh biên thấp hơn (max 30px)
- `AnimatePresence` fade in/out khi `isActive` thay đổi
- Reset về 6px (flat) khi không active

---

### Sửa — `frontend/src/app/practice/conversation/page.tsx`

Layout mới (absolute positioning, full-screen):

```
┌─────────────────────────────────────────┐
│ [← Quay lại]  [Home]     [Ni ơi cứu!] ⚙│  ← header (absolute top)
│                                         │
│ [📷 Webcam PiP]         [● Đã kết nối] │  ← absolute overlays
│                                         │
│                ┌───────┐                │
│                │  Ni   │                │  ← RobotAvatar (flex center)
│                └───────┘                │
│              Mentor Ni                  │
│         ▁▃▅▇▅▃▁▃▅▇▅▃▁▃▅▇               │  ← WaveformVisualizer (khi nghe)
│                                         │
│    ┌────────────────────────────┐       │
│    │ "Câu của user..."          │       │  ← FloatingTranscripts
│    │         Câu AI trả lời... │       │
│    └────────────────────────────┘       │
│                                         │
│   [Nói lại(2)]   [🎙]   [Kết thúc]     │  ← bottom controls (absolute bottom)
└─────────────────────────────────────────┘
```

**Logic giữ nguyên 100%:**
- LiveKit connect / auto-enable mic
- HTTP fallback (khi `FEATURE_FLAGS.useLiveKit = false`)
- Hints ("Ni ơi, cứu!") overlay
- Redo (2 lần/session)
- `sanitize()` placeholder stripping
- `processUserAudio()` + `playAudioUrl()`

---

## Data flow

```
useLiveKitRoom.ts
  └── onNewTurn(turn) → setHistory([...prev, turn])
        └── FloatingTranscripts receives history prop → renders

RoomEvent.ActiveSpeakersChanged
  └── isAgentSpeaking → RobotAvatar isSpeaking=true + badge
  └── isUserSpeaking  → WaveformVisualizer isActive=true
                      → FloatingTranscripts dims to 0.2 opacity
```

---

## Dependencies sử dụng

| Package | Version | Dùng cho |
|---|---|---|
| `framer-motion` | ^12.34.3 | RobotAvatar, FloatingTranscripts, WaveformVisualizer, WebcamPreview |
| `lucide-react` | ^0.575.0 | Volume2, ArrowLeft, Home, Mic, Loader2, RotateCcw, Sparkles, Settings |
| `next/image` | Next 16 | Avatar image |

---

## Lưu ý khi maintain

- `WebcamPreview` dùng `getUserMedia` — chỉ chạy được trên HTTPS hoặc localhost
- `FloatingTranscripts` dùng `scrollbarWidth: none` inline style để ẩn scrollbar cross-browser (không cần class Tailwind)
- `WaveformVisualizer` interval 100ms — nếu cần tiết kiệm CPU có thể tăng lên 150ms
- `RobotAvatar` dùng `/ni-avatar.png` từ `public/` — thay ảnh tại đây nếu cần đổi nhân vật
