# Plan: Tích hợp LiveKit Agent Framework vào SpeakMate

## Context

SpeakMate hiện dùng HTTP round-trip cho voice interaction: Frontend ghi âm blob → POST lên Express → forward base64 tới Modal (Faster-Whisper STT → Gemini LLM → Valtec TTS) → trả JSON. Mỗi lượt **4-6 giây** vì phải ghi xong audio mới gửi, 3 HTTP round-trips, và STT/LLM/TTS chạy tuần tự batch.

LiveKit thay HTTP bằng WebRTC (UDP, streaming mọi stage). Target: **< 1 giây** first audio chunk.

---

## Architecture Decisions (đã confirm với user)

| Quyết định | Chọn | Lý do |
|------------|------|-------|
| **Mic mode** | Toggle on/off, khi on → always-on + VAD (Silero) | Tự nhiên như hội thoại thật, tận dụng streaming |
| **TTS** | Valtec TTS (đã dùng), self-host trên Modal | Đã có, voice clone tiếng Việt, CPU-capable |
| **STT** | Faster-Whisper large-v3, giữ trên Modal | Đã có, tiếng Việt tốt |
| **LLM** | Gemini 2.0 Flash (API), self-host sau | Đang dùng, livekit-plugins-google hỗ trợ |
| **Infra** | **LiveKit agent chạy trên Modal** (GPU L4) | Tận dụng GPU hiện có, STT+TTS in-process (zero HTTP overhead) |
| **SFU** | LiveKit Cloud free tier | 5000 min/tháng, zero infra management |

### Key Architecture: LiveKit Agent on Modal

```
┌─────────────────────────────────────────────────────────┐
│  MODAL CLOUD (GPU L4)                                   │
│                                                         │
│  LiveKit Agent Process (Python, long-running)           │
│  ├── Faster-Whisper v3-Large (in-process STT)          │
│  ├── Gemini 2.0 Flash (API call, livekit-plugins-google)│
│  ├── Valtec ZeroShotTTS (in-process TTS)               │
│  └── WebSocket ←→ LiveKit Cloud                        │
│                                                         │
└───────────────────────┬─────────────────────────────────┘
                        │ WebRTC media relay
┌───────────────────────┴─────────────────────────────────┐
│  LIVEKIT CLOUD (SFU)                                    │
│  WebRTC audio routing between user ↔ agent              │
└───────────────────────┬─────────────────────────────────┘
                        │ WebRTC (UDP, sub-200ms)
┌───────────────────────┴─────────────────────────────────┐
│  FRONTEND (Next.js)                                     │
│  livekit-client: mic publish + agent audio subscribe    │
│  Data channel: transcript messages for history          │
└─────────────────────────────────────────────────────────┘
```

**Tại sao agent trên Modal?**
- STT (Faster-Whisper) + TTS (Valtec) chạy in-process → **zero HTTP round-trip** cho STT/TTS
- Tận dụng GPU L4 đã có
- `keep_warm=1` giữ container sẵn sàng
- LLM streaming tokens → Valtec TTS synthesize per-sentence chunk → audio plays ngay

---

## Implementation Phases

### Phase 0: Infrastructure Setup

1. **LiveKit Cloud account** → lấy `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

2. **Dependencies:**
   ```
   # Modal agent (thêm vào modal_pipeline.py image)
   livekit-agents>=1.0
   livekit-plugins-google>=1.0
   livekit-plugins-silero>=1.0
   
   # Backend
   npm install livekit-server-sdk     (in backend/)
   
   # Frontend
   npm install livekit-client @livekit/components-react   (in frontend/)
   ```

3. **Env vars mới:**
   - `backend/.env`: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   - `frontend/.env.local`: `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_USE_LIVEKIT=true`
   - Modal secret: thêm `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` vào Modal secrets

---

### Phase 1: Token Generation Endpoint (Express Backend)

**Files cần sửa/tạo:**

| File | Action |
|------|--------|
| `backend/src/config/env.ts` | Thêm `livekitUrl`, `livekitApiKey`, `livekitApiSecret` |
| `backend/src/services/livekit.service.ts` | **Create** — wrap `AccessToken` từ `livekit-server-sdk` |
| `backend/src/controllers/practice.controller.ts` | Thêm method `createLivekitSession()` |
| `backend/src/routes/practice.routes.ts` | Thêm `POST /livekit-session` route |
| `backend/src/validators/practice.validators.ts` | Thêm `livekitSessionSchema` |
| `backend/.env.example` | Thêm 3 biến LiveKit |

**`livekit.service.ts`:**
- `generateToken(roomName, identity, metadata)` → JWT string
- Room name: `speakmate-{timestamp}-{random4}`
- Metadata (JSON string): `{ scenario, history, userName }` — Python agent đọc khi participant join

**`createLivekitSession()` endpoint:**
- Input: `{ scenarioStr, conversationHistoryStr }`
- Reuse `authOptional` middleware (guest mode works)
- Output: `{ token, roomName, livekitUrl }`

---

### Phase 2: LiveKit Agent trên Modal

**Mục tiêu:** Extend `modal_pipeline.py` thêm LiveKit agent class chạy alongside existing endpoints.

**Files cần sửa/tạo:**

| File | Action |
|------|--------|
| `modal_pipeline.py` | Extend — thêm image deps, tạo `LiveKitAgentWorker` class |
| `livekit_plugins/whisper_stt.py` | **Create** — custom LiveKit STT plugin wrap Faster-Whisper |
| `livekit_plugins/valtec_tts.py` | **Create** — custom LiveKit TTS plugin wrap Valtec TTS |
| `livekit_plugins/__init__.py` | **Create** |

**Custom STT Plugin (`whisper_stt.py`):**
```python
class WhisperSTT(stt.STT):
    """Wraps in-process Faster-Whisper model as LiveKit STT plugin."""
    
    def __init__(self, model: WhisperModel):
        super().__init__(capabilities=stt.STTCapabilities(streaming=False, interim_results=False))
        self._model = model
    
    async def _recognize_impl(self, buffer: AudioBuffer) -> stt.SpeechEvent:
        # Convert AudioBuffer → WAV bytes → transcribe with self._model
        segments, _ = self._model.transcribe(audio_bytes, language="vi", beam_size=5, vad_filter=True)
        transcript = " ".join([seg.text.strip() for seg in segments])
        return stt.SpeechEvent(type=stt.SpeechEventType.FINAL_TRANSCRIPT, 
                               alternatives=[stt.SpeechData(text=transcript, language="vi")])
```

**Custom TTS Plugin (`valtec_tts.py`):**
```python
class ValtecTTS(tts.TTS):
    """Wraps in-process Valtec ZeroShotTTS as LiveKit TTS plugin."""
    
    def __init__(self, model: ZeroShotTTS, voice_ref_path: str):
        super().__init__(capabilities=tts.TTSCapabilities(streaming=False))
        self._model = model
        self._voice_ref = voice_ref_path
    
    def synthesize(self, text: str) -> ChunkedStream:
        # Sanitize placeholders
        text = sanitize_placeholders(text)
        # Synthesize with Valtec (returns numpy array + sample rate)
        audio_np, sr = self._model.synthesize(text, reference_audio=self._voice_ref)
        # Convert to AudioFrame and yield as single chunk
        # LiveKit VoicePipelineAgent calls this per LLM-streamed sentence
        yield SynthesizedAudio(frame=AudioFrame(audio_np, sr), is_final=True)
```

**Vì sao sentence-level "streaming" vẫn nhanh:**
LiveKit VoicePipelineAgent stream LLM tokens → buffer thành sentence → gọi `synthesize()` cho mỗi câu. Valtec synthesize 1 câu ngắn (~5-10 từ) chỉ ~100-200ms. Câu đầu tiên phát ngay, các câu sau synthesize song song khi user đang nghe câu trước.

**Modal Agent Worker (`LiveKitAgentWorker` class):**
```python
@app.cls(
    image=image,  # same image + livekit-agents deps
    gpu="L4",
    keep_warm=1,   # always-on container
    secrets=[modal.Secret.from_name("gemini-api-key"), modal.Secret.from_name("livekit-keys")],
    volumes={...},  # same volumes for model weights
    timeout=86400,  # 24h max
)
class LiveKitAgentWorker:
    @modal.enter()
    def load_models(self):
        # Load Faster-Whisper + Valtec TTS (same as VoicePipeline)
        self.stt_model = WhisperModel("large-v3", device="cuda", compute_type="float16")
        self.tts_model = ZeroShotTTS(checkpoint_path=..., config_path=...)
        self.voice_ref_path = "/valtec_models/voice_clone/voice1.wav"
    
    @modal.method()
    def run(self):
        """Long-running: starts LiveKit agent worker."""
        import livekit.agents as agents
        from livekit.plugins import google, silero
        
        async def entrypoint(ctx: agents.JobContext):
            participant = await ctx.wait_for_participant()
            metadata = json.loads(participant.metadata)
            scenario = metadata['scenario']
            history = metadata['history']
            user_name = metadata.get('userName', 'bạn')
            
            # Build system prompt (replicate voice.agent.ts logic)
            system_prompt = build_system_prompt(scenario, user_name)
            
            # Chat context with history
            initial_ctx = agents.llm.ChatContext()
            initial_ctx.append(role="system", text=system_prompt)
            for turn in history:
                role = "assistant" if turn['speaker'] == 'AI' else "user"
                initial_ctx.append(role=role, text=turn['line'])
            
            # Create VoicePipelineAgent with in-process models
            agent = agents.VoicePipelineAgent(
                vad=silero.VAD.load(),
                stt=WhisperSTT(self.stt_model),           # in-process
                llm=google.LLM(model="gemini-2.0-flash"),  # API call
                tts=ValtecTTS(self.tts_model, self.voice_ref_path),  # in-process
                chat_ctx=initial_ctx,
            )
            agent.start(ctx.room, participant)
            
            # Send transcripts via data channel → frontend updates history
            @agent.on("user_speech_committed")
            def on_user(msg):
                ctx.room.local_participant.publish_data(
                    json.dumps({"type": "transcript", "speaker": "User", "line": msg.content}),
                    reliable=True
                )
            
            @agent.on("agent_speech_committed")
            def on_agent(msg):
                ctx.room.local_participant.publish_data(
                    json.dumps({"type": "transcript", "speaker": "AI", "line": msg.content}),
                    reliable=True
                )
            
            # Nói câu mở đầu
            opening = scenario.get('startingTurns', [{}])[0].get('line', 'Chào bạn!')
            await agent.say(sanitize_placeholders(opening))
        
        agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
```

**Reuse logic từ:** 
- `backend/src/agents/voice.agent.ts:23-35` (system prompt tiếng Việt)
- `modal_pipeline.py:109-114` (sanitize_placeholders)
- `modal_pipeline.py:69-106` (model loading pattern)

---

### Phase 3: Frontend LiveKit Integration

**Files cần sửa/tạo:**

| File | Action |
|------|--------|
| `frontend/src/hooks/useLiveKitRoom.ts` | **Create** — hook quản lý LiveKit room |
| `frontend/src/lib/featureFlags.ts` | **Create** — feature flag |
| `frontend/src/lib/apiClient.ts` | Thêm `createLivekitSession()` |
| `frontend/src/app/practice/conversation/page.tsx` | Conditional LiveKit/HTTP rendering |
| `frontend/src/context/ScenarioContext.tsx` | Thêm `livekitRoomName` (optional) |

**`useLiveKitRoom.ts`:**
```typescript
interface UseLiveKitRoomReturn {
    isConnected: boolean;
    isAgentSpeaking: boolean;   // remote audio track active
    isMicEnabled: boolean;      // local mic muted/unmuted
    connectionState: string;
    connect: (token: string, url: string) => Promise<void>;
    disconnect: () => void;
    toggleMic: () => void;      // mute/unmute (toggle on/off)
}
```
- Dùng `Room` từ `livekit-client`
- `connect()`: join room, publish local mic track (initially enabled)
- `toggleMic()`: mute/unmute mic track. Khi muted → VAD không detect → agent không nghe
- Listen `RoomEvent.DataReceived` → parse transcript JSON → callback to update history
- Agent TTS audio tự phát qua WebRTC audio track (no `new Audio()` needed)
- `disconnect()`: cleanup

**`conversation/page.tsx` changes (mic toggle UX):**
```tsx
// Mic button behavior:
// - Nút micro: toggleMic()
// - Khi isMicEnabled=true: mic icon (teal), always-on + VAD
// - Khi isMicEnabled=false: mic-off icon (gray), agent không nghe
// - isAgentSpeaking: hiện animated dots (agent đang nói)
```

Giữ nguyên UI: chat bubbles, hints button, redo button, "Kết thúc" link.

**Thay đổi so với hiện tại:**
- Bỏ `useAudioRecorder` + `processUserAudio()` + `playAudioUrl()` trong LiveKit mode
- History cập nhật từ data channel messages (thay vì HTTP response)
- `audioFileKeys` = `[]` trong LiveKit mode (evaluation vẫn work vì AnalystAgent chỉ dùng transcript)

---

### Phase 4: Evaluation Compatibility

**Phân tích:** AnalystAgent (`analyst.agent.ts:66-84`) **chỉ dùng `transcript` text** trong Gemini prompt. `sessionAudioPath` param tồn tại nhưng không truyền vào LLM call. Nên `audioFileKeys` rỗng không ảnh hưởng.

**Không cần sửa:**
- `backend/src/agents/analyst.agent.ts`
- `frontend/src/app/evaluation/conversation/page.tsx` (đã handle `audioFileKeys || []`)
- `backend/src/services/storage.service.ts`

**History flow trong LiveKit mode:**
1. Agent gửi data channel: `{"type":"transcript","speaker":"User","line":"..."}`
2. `useLiveKitRoom` receive → callback → `setHistory([...history, newTurn])`
3. User click "Kết thúc" → `disconnect()` → navigate to `/evaluation/conversation`
4. Evaluation page: `history.map(h => ...)` → `fullTranscript` → `POST /api/practice/analyze` → unchanged

---

### Phase 5: Feature Flag & HTTP Fallback

**`frontend/src/lib/featureFlags.ts`:**
```typescript
export const FEATURE_FLAGS = {
    useLiveKit: process.env.NEXT_PUBLIC_USE_LIVEKIT === 'true',
};
```

**`conversation/page.tsx`:** Conditional rendering giữ cả 2 mode:
- `FEATURE_FLAGS.useLiveKit` → LiveKit mode (useLiveKitRoom)
- `!FEATURE_FLAGS.useLiveKit` → HTTP mode (useAudioRecorder + processUserAudio)

**Giữ nguyên toàn bộ code HTTP mode:** `useAudioRecorder.ts`, `voice.agent.ts`, `VoicePipeline` class trên Modal

---

### Phase 6: Dev Experience

**Cập nhật `run-all.bat`:**
```bat
start "SpeakMate LiveKit Agent" cmd /k "modal run modal_pipeline.py::LiveKitAgentWorker.run"
```

**Hoặc dùng `modal serve` cho dev:**
```bat
start "SpeakMate Modal" cmd /k "modal serve modal_pipeline.py"
```

**Cập nhật `CLAUDE.md`:** Thêm LiveKit agent vào Dev Commands, Architecture.

---

## Complete File Inventory

### New files (5)
| File | Purpose |
|------|---------|
| `livekit_plugins/__init__.py` | Package init |
| `livekit_plugins/whisper_stt.py` | Custom LiveKit STT plugin (wraps Faster-Whisper) |
| `livekit_plugins/valtec_tts.py` | Custom LiveKit TTS plugin (wraps Valtec TTS) |
| `frontend/src/hooks/useLiveKitRoom.ts` | LiveKit room hook |
| `frontend/src/lib/featureFlags.ts` | Feature flag |

### Modified files (8)
| File | Change |
|------|--------|
| `modal_pipeline.py` | Thêm image deps + `LiveKitAgentWorker` class |
| `backend/src/config/env.ts` | Thêm 3 LiveKit config fields |
| `backend/src/services/livekit.service.ts` | **Create** — token generation |
| `backend/src/controllers/practice.controller.ts` | Thêm `createLivekitSession()` |
| `backend/src/routes/practice.routes.ts` | Thêm `POST /livekit-session` |
| `backend/src/validators/practice.validators.ts` | Thêm `livekitSessionSchema` |
| `frontend/src/lib/apiClient.ts` | Thêm `createLivekitSession()` |
| `frontend/src/app/practice/conversation/page.tsx` | Conditional LiveKit/HTTP mode |

### Untouched (evaluation + HTTP fallback)
- `backend/src/agents/analyst.agent.ts` — chỉ dùng transcript
- `backend/src/agents/voice.agent.ts` — HTTP fallback
- `backend/src/agents/brain.agent.ts` — không liên quan
- `frontend/src/hooks/useAudioRecorder.ts` — HTTP fallback
- `frontend/src/app/evaluation/**` — unchanged
- `modal_pipeline.py::VoicePipeline` class — HTTP fallback (giữ nguyên)

---

## Latency Budget

| Stage | HTTP (hiện tại) | LiveKit + Modal (target) |
|-------|-----------------|--------------------------|
| Audio capture | ~500ms (full blob) | Realtime (WebRTC streaming) |
| Transport → STT | ~300ms (HTTP to Modal) | ~50ms (WebRTC → in-process) |
| STT | ~800ms (Whisper batch) | ~500ms (Whisper, nhưng in-process, no network) |
| LLM | ~600ms (Gemini batch) | ~300ms (Gemini streaming, first token) |
| TTS (per sentence) | ~1500ms (Valtec full audio) | ~150ms (Valtec, 1 câu ngắn) |
| Transport → playback | ~200ms (HTTP + data URI) | ~50ms (WebRTC) |
| **Total to first audio** | **~3900ms** | **~1050ms** |

Lưu ý: Faster-Whisper vẫn batch (không stream), nên STT vẫn ~500ms. Nhưng tiết kiệm lớn từ: WebRTC transport, in-process calls (no HTTP), LLM streaming, sentence-level TTS.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Modal container scale-to-zero | Agent disconnect, user phải chờ cold start | `keep_warm=1` giữ 1 container luôn sẵn |
| Modal 24h timeout | Agent restart mỗi ngày | Set `timeout=86400`, Modal auto-restart |
| Participant metadata size | Long history vượt 65KB limit | Truncate giữ N turns cuối (scenario ~3KB, mỗi turn ~200 bytes → ~300 turns trước khi hit limit) |
| Faster-Whisper không stream | STT vẫn batch, ~500ms | Chấp nhận. Vẫn nhanh hơn hiện tại vì in-process |
| LiveKit Cloud free tier | 5000 min/tháng | ~500 sessions 10 phút. Upgrade khi cần |
| Custom plugin compatibility | LiveKit agent SDK API thay đổi | Pin version trong requirements.txt |

---

## Verification Plan

1. **Phase 1:** `curl -X POST localhost:3001/api/practice/livekit-session ...` → verify `{token, roomName, livekitUrl}`
2. **Phase 2:** `modal run modal_pipeline.py::LiveKitAgentWorker.run` → verify agent connects to LiveKit Cloud, logs "waiting for participant"
3. **Phase 3:** Mở conversation page với `NEXT_PUBLIC_USE_LIVEKIT=true`:
   - Room connects (browser console log)
   - Toggle mic: on → mic icon teal, off → mic-off gray
   - Agent joins (Modal logs: "participant connected")
   - Agent nói câu mở đầu (nghe audio qua WebRTC)
   - User nói → agent phản hồi realtime
   - Chat history cập nhật từ data channel
4. **Phase 4:** "Kết thúc" → evaluation page → AnalystAgent phân tích → hiển thị kết quả
5. **Fallback:** `NEXT_PUBLIC_USE_LIVEKIT=false` → HTTP mode hoạt động bình thường
