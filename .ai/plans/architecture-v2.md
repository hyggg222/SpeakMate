# SpeakMate — Kế hoạch triển khai thực tế (Senior Engineer Review)

> Kế hoạch cụ thể. Chưa thực thi code.

---

## 0. Phản biện & cải thiện 5 điểm yếu kiến trúc

### 0.1 Connection pooling — Python KHÔNG dùng psycopg2

**Vấn đề:** 1,000 Modal workers → 1,000 TCP connections vào Postgres → pool cạn kiệt, Supabase sập.

**Fix ngắn hạn:** Python agent dùng **Supabase REST API (HTTP)** thay vì persistent TCP connection.

```python
# ĐÚNG: HTTP-based, không giữ connection
import httpx

async def persist_turn(session_id, speaker, line, turn_index):
    await httpx.AsyncClient().post(
        f"{SUPABASE_URL}/rest/v1/conversation_turns",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        json={"session_id": session_id, "speaker": speaker, "line": line, "turn_index": turn_index}
    )

# SAI: psycopg2/asyncpg — giữ TCP connection suốt vòng đời worker
```

**Fix dài hạn (khi scale >500 concurrent):** Đẩy transcript event vào **Upstash Redis** (serverless, HTTP-based). Backend Node.js có một consumer đọc Redis và batch-write vào Supabase.

```
Python agent → Upstash Redis (HTTP POST, <5ms)
Backend consumer → đọc Redis mỗi 500ms → batch INSERT Supabase
```

**Trade-off chấp nhận (ngắn hạn):** Supabase REST API thêm ~20–50ms latency so với TCP. Không ảnh hưởng real-time vì write là async (không block TTS).

---

### 0.2 Metadata bloat — chỉ truyền con trỏ, không truyền data

**Vấn đề:** LiveKit JWT token có giới hạn payload (vài KB). Nhúng toàn bộ scenario + history + systemPrompt sẽ vượt limit khi hội thoại dài hoặc RAG context lớn.

**Fix: Metadata chỉ chứa `session_id` + `version`**

```json
// TRƯỚC (sai): 5KB+ trong JWT payload
{
  "v": 2,
  "scenario": {...},          // có thể 2KB
  "history": [...],           // tăng theo thời gian
  "systemPrompt": "...",      // có thể 1KB+
  "userName": "Huy"
}

// SAU (đúng): <100 bytes trong JWT
{
  "v": 2,
  "session_id": "uuid-...",
  "userName": "Huy"
}
```

**Worker fetches context on startup (một lần, không phải mỗi turn):**

```python
async def _livekit_entrypoint(ctx):
    participant = await ctx.wait_for_participant()
    meta = json.loads(participant.metadata or "{}")
    session_id = meta["session_id"]

    # Fetch đầy đủ context từ backend (1 lần, không block real-time)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BACKEND_URL}/api/internal/sessions/{session_id}/context",
            headers={"Authorization": f"Bearer {INTERNAL_API_KEY}"}
        )
    context = resp.json()  # {scenario, history, systemPrompt, userName}
    agent = ManualBridgeAgent(ctx, ..., context=context)
```

**Backend thêm internal endpoint:**

```typescript
// GET /api/internal/sessions/:id/context — chỉ gọi từ Modal worker
router.get('/internal/sessions/:id/context', verifyInternalKey, async (req, res) => {
    const session = await db.getSession(req.params.id);
    res.json({
        scenario: session.scenario,
        history: await db.getTurns(req.params.id),
        systemPrompt: await promptService.build(session),
        userName: session.userName
    });
});
```

**Trade-off:** Worker cần thêm 1 HTTP round-trip khi khởi động (~100–200ms). Chấp nhận được vì đây là 1 lần, không ảnh hưởng latency hội thoại.

---

### 0.3 Turn sequence number — phát hiện data channel drop

**Vấn đề:** WebRTC data channel có thể rớt gói. Frontend không biết nó vừa miss message.

**Fix: Thêm `turn_index` vào mọi data channel message**

```python
# Python agent
await self.ctx.room.local_participant.publish_data(
    json.dumps({
        "type": "transcript",
        "speaker": "User"|"AI",
        "line": text,
        "turn_index": self.turn_counter,  # tăng dần, bắt đầu từ 0
        "session_id": self.session_id
    }).encode(), reliable=True
)
self.turn_counter += 1
```

```typescript
// useLiveKitRoom.ts — frontend phát hiện gap
let expectedTurnIndex = 0;

room.on(RoomEvent.DataReceived, (payload) => {
    const msg = JSON.parse(decode(payload));
    if (msg.type === 'transcript') {
        if (msg.turn_index > expectedTurnIndex) {
            // Phát hiện gap — fetch turns bị miss từ API
            fetchMissingTurns(msg.session_id, expectedTurnIndex, msg.turn_index);
        }
        onNewTurn(msg);
        expectedTurnIndex = msg.turn_index + 1;
    }
});

async function fetchMissingTurns(sessionId, from, to) {
    const missed = await apiClient.getTurns(sessionId, from, to);
    missed.forEach(t => onNewTurn(t));  // backfill UI
}
```

**Ghi chú:** LiveKit data channel mặc định dùng `reliable=True` (SCTP over DTLS, không phải UDP thuần). Trong hầu hết trường hợp không rớt gói. Nhưng sequence number vẫn là safety net quan trọng.

---

### 0.4 Cold start — đã có `num_idle_processes`, cần tune thêm

**Vấn đề:** Load Whisper + TTS vào VRAM tốn 10–30s. User nhìn loading overlay.

**Hiện trạng:** `modal_pipeline.py` đã có `num_idle_processes=1` và `initialize_process_timeout=120`. Đây là đúng hướng — luôn giữ 1 container warm.

**Cải thiện thêm:**

```python
# modal_pipeline.py
@app.cls(
    ...
    scaledown_window=600,        # giữ container alive 10 phút sau lần dùng cuối
)
class LiveKitAgentWorker:
    ...

agents.WorkerOptions(
    entrypoint_fnc=_livekit_entrypoint,
    prewarm_fnc=_livekit_prewarm,
    num_idle_processes=2,        # tăng lên 2 để handle concurrent joins
    initialize_process_timeout=120,
    job_memory_warning_mb=3000,
)
```

**Frontend UX:** Hiển thị progress steps thay vì spinner chung chung:
```
[●●○○] Đang kết nối LiveKit...      (0–2s)
[●●●○] AI đang tải model...          (2–30s, cold start)
[●●●●] Sẵn sàng!                     (sau agent_ready)
```

**Dài hạn:** Quantize PhoWhisper xuống int8 để giảm load time. Target <5s warm time.

---

### 0.5 Service key — tạo role riêng cho Data Plane

**Vấn đề:** Service role key có quyền admin bypass RLS. Nếu Python worker bị tấn công prompt injection, attacker có key này → xóa toàn bộ DB.

**Fix: Tạo Supabase role giới hạn cho Modal worker**

```sql
-- Supabase SQL: tạo role chỉ INSERT conversation_turns
CREATE ROLE modal_worker_role;

GRANT INSERT ON conversation_turns TO modal_worker_role;
GRANT SELECT ON conversation_turns TO modal_worker_role;  -- chỉ SELECT, không UPDATE/DELETE

-- RLS policy: worker chỉ thấy session của chính nó
ALTER TABLE conversation_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worker_own_session" ON conversation_turns
    FOR ALL TO modal_worker_role
    USING (session_id = current_setting('app.current_session_id', true));
```

```python
# Python agent: set session context trước khi write
headers = {
    "apikey": MODAL_WORKER_API_KEY,        # key của role giới hạn, không phải service key
    "Authorization": f"Bearer {MODAL_WORKER_API_KEY}",
    "X-App-Session-Id": self.session_id    # RLS dùng header này
}
```

**Modal secrets:** Tách riêng:
- `supabase-service-key` → chỉ backend Node.js (Control Plane)
- `supabase-worker-key` → chỉ Python Modal worker (Data Plane, quyền tối thiểu)

---

## 0b. Vòng phản biện 2 — 5 điểm yếu tiếp theo

### 0b.1 Python → Supabase: thay bằng Internal API call

**Vấn đề trước:** Python ghi thẳng Supabase → Data Plane biết về DB schema → mỗi lần đổi schema phải redeploy worker. Race condition nếu HTTP call fail: UI hiển thị turn nhưng F5 mất.

**Fix: Python POST tới backend Internal API**

```
[Python agent] POST /api/internal/turns
    {session_id, turn_index, speaker, line, audio_key?}
              ↓ (~10–20ms latency, không block TTS)
[Node.js backend] sanitize → INSERT Supabase → 200 OK
```

Luồng trong worker:
```python
async def _persist_turn(session_id, turn_index, speaker, line):
    """Fire-and-forget — không block critical path"""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                f"{BACKEND_URL}/api/internal/turns",
                json={"session_id": session_id, "turn_index": turn_index,
                      "speaker": speaker, "line": line},
                headers={"Authorization": f"Bearer {INTERNAL_API_KEY}"}
            )
    except Exception as e:
        print(f"[Bridge] persist_turn failed (non-fatal): {e}", flush=True)

# Trong _process_user_turn():
asyncio.create_task(_persist_turn(...))   # non-blocking
# Tiếp tục TTS ngay lập tức
```

**Race condition đã được giải quyết:** Nếu persist fail → turn mất trong DB, nhưng frontend vẫn hiển thị (data channel đã gửi). Đây là acceptable degradation: lịch sử hội thoại incomplete, nhưng session tiếp tục. Tốt hơn là block TTS chờ DB confirm.

**Data Plane giờ thực sự "mù" về DB** — chỉ biết: gọi một endpoint, nhận 200.

---

### 0b.2 Barge-in — user ngắt lời AI đang nói

**Vấn đề:** Nếu user nói trong khi AI đang phát TTS, VAD kích hoạt, nhưng pipeline không có cơ chế hủy task đang chạy.

**Fix: Cancellation token + interrupt signal**

```python
class ManualBridgeAgent:
    def __init__(self, ...):
        self._tts_task: asyncio.Task | None = None  # track task đang chạy

    async def _vad_event_loop(self):
        async for vad_event in self.vad_stream:
            if vad_event.type == VADEventType.START_OF_SPEECH:
                # Hủy TTS/LLM đang chạy nếu có
                if self._tts_task and not self._tts_task.done():
                    self._tts_task.cancel()
                    await self.ctx.room.local_participant.publish_data(
                        json.dumps({"type": "ai_interrupted"}).encode(),
                        reliable=True
                    )
                self.audio_buffer = []
                self.is_user_speaking = True

    async def _process_user_turn(self, frames):
        # Wrap toàn bộ LLM+TTS trong task có thể cancel
        self._tts_task = asyncio.create_task(self._run_llm_tts(frames))
        try:
            await self._tts_task
        except asyncio.CancelledError:
            print("[Bridge] Turn cancelled (barge-in)", flush=True)
```

```typescript
// Frontend: nhận ai_interrupted → tắt audio playback
if (msg.type === 'ai_interrupted') {
    currentAudioElement?.pause();
    setIsAgentSpeaking(false);
}
```

**Trade-off:** LLM call đã gửi tới Gemini không cancel được (HTTP request đã đi). Chỉ cancel được phần TTS synthesis + audio streaming. Tốn ~1 Gemini token call. Chấp nhận được.

---

### 0b.3 Context window — sliding window + background summarization

**Vấn đề:** Session 30 phút → history phình to → TTFT tăng tuyến tính → phá vỡ <350ms target.

**Fix: Chỉ giữ 6 turns gần nhất + summarized context**

```python
MAX_RECENT_TURNS = 6

def _build_messages(self) -> list[dict]:
    recent = self.history[-MAX_RECENT_TURNS:]  # 6 turns gần nhất
    messages = []

    # Inject summary nếu có (từ lần summarize trước)
    if self.context_summary:
        messages.append({
            "role": "user",
            "parts": [{"text": f"[Tóm tắt hội thoại trước]: {self.context_summary}"}]
        })
        messages.append({"role": "model", "parts": [{"text": "Hiểu rồi."}]})

    for h in recent:
        messages.append({
            "role": "model" if h["speaker"] == "AI" else "user",
            "parts": [{"text": h["line"]}]
        })
    return messages
```

**Background summarization (khi history > 12 turns):**

```python
async def _maybe_summarize(self):
    if len(self.history) % 12 == 0 and len(self.history) > 0:
        asyncio.create_task(self._background_summarize())

async def _background_summarize(self):
    """Chạy song song, không block real-time loop"""
    old_turns = self.history[:-MAX_RECENT_TURNS]
    summary_prompt = "Tóm tắt ngắn gọn (2 câu) cuộc hội thoại sau:\n" + \
        "\n".join(f"{t['speaker']}: {t['line']}" for t in old_turns)
    def _call():
        r = self.genai_client.models.generate_content(
            model="gemini-2.0-flash", contents=[{"role":"user","parts":[{"text":summary_prompt}]}]
        )
        return r.text
    self.context_summary = await asyncio.to_thread(_call)
```

**Kết quả:** Token count ổn định ở ~6 turns + ~100 token summary, bất kể session dài bao nhiêu.

---

### 0b.4 FinOps — chi phí idle processes

**Vấn đề:** `num_idle_processes=2` + `scaledown_window=600s` với GPU L4 (~$0.50/hr) = tiền cháy ngay cả khi không có user.

**Tính toán chi phí:**
```
L4 GPU: ~$0.50/hr = $0.000139/s
2 idle processes × 600s scaledown = 1,200 GPU-giây/session
Chi phí mỗi "lần warm-up": 1200 × $0.000139 ≈ $0.17

Nếu 10 user/ngày: 10 × $0.17 = $1.7/ngày chỉ cho idle
Nếu 100 user/ngày: gần như luôn có active session → idle cost thấp
```

**Fix: Giảm idle nhưng tận dụng pre-warm đã có:**

```python
# modal_pipeline.py
WorkerOptions(
    num_idle_processes=1,        # giảm xuống 1 (không phải 2)
    initialize_process_timeout=120,
)

# scaledown_window giảm xuống 300s (5 phút) thay vì 600s
@app.cls(scaledown_window=300, ...)
```

**Tận dụng pre-flight request đã có:** Frontend hiện tại đã pre-create LiveKit session trên confirm page (từ Antigravity session). Đây chính xác là "pre-flight request" — khi user đang đọc kịch bản, Modal worker đã warm-up. Không cần thêm logic.

**Tiered warm-up không cần thiết ở giai đoạn này:** Phức tạp, và pre-flight request đã giải quyết vấn đề UX. Revisit khi MAU > 500.

---

### 0b.5 Audio upload — asyncio.create_task, không block critical path

**Vấn đề:** Upload WAV file user audio lên Supabase Storage nếu nằm trong critical path → delay TTS response.

**Fix: Luôn luôn dùng background task**

```python
async def _process_user_turn(self, frames):
    # ... STT, LLM, data channel publish...

    # Upload audio — KHÔNG PHẢI critical path
    raw_audio = np.concatenate([np.frombuffer(f.data, np.int16) for f in frames])
    asyncio.create_task(
        self._upload_audio_background(raw_audio, self.session_id, self.turn_counter)
    )

    # TTS bắt đầu NGAY, không chờ upload
    async def _upload_audio_background(self, audio, session_id, turn_index):
        try:
            wav_bytes = _to_wav_bytes(audio)
            key = f"{session_id}/turn_{turn_index}_user.wav"
            # POST tới backend internal API để upload lên Supabase Storage
            await httpx.AsyncClient().post(
                f"{BACKEND_URL}/api/internal/audio",
                content=wav_bytes,
                headers={"X-Audio-Key": key, "Authorization": f"Bearer {INTERNAL_API_KEY}"}
            )
        except Exception as e:
            print(f"[Bridge] audio upload failed (non-fatal): {e}", flush=True)
```

**Không upload TTS audio:** Audio AI nói có thể tái tạo từ text + TTS model. Không cần lưu. Chỉ lưu user audio để AnalystAgent chấm phát âm.

---

## 0c. Vòng phản biện 3 — 5 lỗ hổng kiến trúc & vận hành

### 0c.1 State Drift — Optimistic UI với pending/confirmed

**Vấn đề:** Data channel gửi thành công nhưng DB persist fail → UI hiện hội thoại trơn tru, nhưng refresh mất turn, AnalystAgent chấm sai.

**Fix: Dual-confirm flow**

```
Python agent xử lý xong 1 turn:
  ① Data channel: {type:"transcript", turn_index, speaker, line, status:"pending"}
  ② asyncio.create_task(POST /api/internal/turns)
  ③ Backend ghi DB thành công → trả về {turn_id}
  ④ Data channel: {type:"turn_confirmed", turn_index, turn_id}
```

```typescript
// Frontend: transcript hiển thị mờ (pending) cho đến khi confirmed
if (msg.type === 'transcript') {
    addTurn({ ...msg, confirmed: false });  // chữ opacity-50
}
if (msg.type === 'turn_confirmed') {
    confirmTurn(msg.turn_index);            // opacity-100
}
```

**Nếu confirmed không đến sau 5s:** Frontend hiển thị icon cảnh báo nhỏ cạnh turn đó. User biết turn này có thể mất khi refresh.

**Trade-off chấp nhận:** Thêm 1 message qua data channel cho mỗi turn (~100 bytes). Không ảnh hưởng latency. Phức tạp hơn fire-and-forget nhưng ngăn được phantom state.

---

### 0c.2 Barge-in — flag interrupted + truncated context

**Vấn đề:** User ngắt lời AI → DB lưu câu AI đầy đủ → LLM/AnalystAgent tưởng user đã nghe hết → chấm điểm sai, context sai.

**Fix: Schema thêm `interrupted` field + truncated text**

```sql
ALTER TABLE conversation_turns ADD COLUMN interrupted BOOLEAN DEFAULT false;
ALTER TABLE conversation_turns ADD COLUMN delivered_chars INTEGER;  -- bao nhiêu ký tự user thực sự nghe
```

```python
async def _run_llm_tts(self, frames):
    # ... STT → LLM → ai_text ...
    chars_delivered = 0

    # Persist full text (pending)
    persist_task = asyncio.create_task(
        self._persist_turn(speaker="AI", line=ai_text, turn_index=self.turn_counter)
    )

    # TTS streaming — track bao nhiêu chars đã phát
    for chunk in audio_chunks:
        if self._cancelled:
            break
        await self.audio_source.capture_frame(chunk)
        chars_delivered += chunk_text_length

    if self._cancelled:
        # Barge-in xảy ra — update DB
        asyncio.create_task(self._update_turn_interrupted(
            turn_index=self.turn_counter,
            delivered_chars=chars_delivered
        ))
```

**LLM context window thấy:**
```python
# Khi build messages, nếu turn bị interrupted → cắt text
for h in self.history:
    text = h["line"]
    if h.get("interrupted") and h.get("delivered_chars"):
        text = text[:h["delivered_chars"]] + " [bị ngắt]"
    messages.append({"role": ..., "parts": [{"text": text}]})
```

**AnalystAgent cũng thấy flag → biết user không nghe hết → không trừ điểm vì "không phản hồi lời khuyên".**

---

### 0c.3 Observability — Distributed tracing cơ bản

**Vấn đề:** Lỗi xảy ra → không biết tịt ở đâu (LiveKit? Modal? Supabase?). Chỉ có `print()`.

**Fix: `turn_id` = `{session_id}_{turn_index}` gắn vào mọi log**

```python
# Python agent — mỗi log đều có turn_id
turn_id = f"{self.session_id}_{self.turn_counter}"
print(f"[{turn_id}] STT: '{transcript}'", flush=True)
print(f"[{turn_id}] LLM: '{ai_text[:50]}'", flush=True)
print(f"[{turn_id}] TTS: streamed {n} samples", flush=True)
print(f"[{turn_id}] persist: {'ok' | 'FAILED: {error}'}", flush=True)
```

```typescript
// Backend — log cùng turn_id khi nhận internal API call
app.post('/api/internal/turns', (req, res) => {
    const turnId = `${req.body.session_id}_${req.body.turn_index}`;
    logger.info(`[${turnId}] persisting turn...`);
    // ...
});
```

```typescript
// Frontend — log cùng format khi nhận data channel
console.log(`[${msg.session_id}_${msg.turn_index}] received: ${msg.type}`);
```

**Giai đoạn đầu:** Ghi vào Modal logs + backend console. Grep bằng `turn_id`.
**Khi scale:** Đẩy vào Axiom hoặc Datadog (cả 2 có free tier đủ dùng team nhỏ).

**Bảng `system_logs` trong Supabase:** Không làm. Log ghi vào DB chính là vòng lặp nguy hiểm — nếu Supabase là nguyên nhân lỗi, log cũng mất theo.

---

### 0c.4 Resource Exhaustion Attack — rate limit trước khi wake GPU

**Vấn đề:** Bot/crawler spam endpoint tạo LiveKit token → spin up GPU containers liên tục → tiền bốc hơi.

**Fix: Rate limit + auth gate TRƯỚC khi gọi Modal**

```typescript
// backend/src/routes/practice.routes.ts
import rateLimit from 'express-rate-limit';

const livekitTokenLimiter = rateLimit({
    windowMs: 60_000,          // 1 phút
    max: 3,                    // tối đa 3 token/phút/IP
    standardHeaders: true,
    message: { error: 'Quá nhiều request. Vui lòng thử lại sau.' }
});

router.post('/livekit-session',
    livekitTokenLimiter,       // Rate limit TRƯỚC auth
    authOptional,              // Auth check
    validate(livekitSessionSchema),
    practiceController.createLivekitSession
);
```

**Escalation tiers:**
1. **Hiện tại (free):** `express-rate-limit` per IP, 3 req/min
2. **Khi có auth:** Chỉ cấp token cho authenticated users (`authRequired` thay vì `authOptional`)
3. **Khi bị tấn công:** Cloudflare Turnstile (captcha) trước form submit

**Không dùng `authOptional` cho endpoint tạo LiveKit token trong production.** Token này kích hoạt GPU — phải `authRequired`.

---

### 0c.5 Context window deadlock — không nhét gì vào JWT ngoài session_id

**Vấn đề:** systemPrompt + RAG context + scenario lớn → vượt JWT limit (~4KB) → crash luồng kết nối. Khi chuyển local LLM (context window nhỏ hơn Gemini) → context ăn hết window.

**Fix: JWT chỉ chứa con trỏ, triệt để**

```json
// LiveKit token metadata — tối thiểu tuyệt đối
{
  "v": 2,
  "session_id": "uuid-abc123"
}
```

**Không có:** scenario, history, systemPrompt, userName. Tất cả lấy qua Internal API.

```python
# Worker boot — 1 HTTP call duy nhất
async def _livekit_entrypoint(ctx):
    participant = await ctx.wait_for_participant()
    session_id = json.loads(participant.metadata)["session_id"]

    async with httpx.AsyncClient() as c:
        ctx_resp = await c.get(
            f"{BACKEND_URL}/api/internal/sessions/{session_id}/context",
            headers={"Authorization": f"Bearer {INTERNAL_KEY}"}
        )
    context = ctx_resp.json()
    # context = {scenario, userName, systemPrompt, history, evalRubric}
```

**Backend endpoint xử lý context assembly:**
```typescript
// GET /api/internal/sessions/:id/context
async handler(req, res) {
    const session = await db.getSession(req.params.id);
    const turns = await db.getTurns(req.params.id);
    const prompt = await promptService.build(session.scenario, session.mode);

    res.json({
        scenario: session.scenario,
        userName: session.user_name || 'bạn',
        systemPrompt: prompt,       // có thể 10KB+ — không sao vì HTTP body
        history: turns,
        evalRubric: session.eval_rubric
    });
}
```

**Khi chuyển local LLM:** Backend `promptService.build()` tự điều chỉnh prompt length theo `llm_provider`. Gemini 2.0 Flash: 1M tokens, thoải mái. Ollama 7B: phải cắt xuống < 4K tokens. Logic cắt nằm ở backend, **không phải ở Python worker**.

---

## 1. Vấn đề "lost transcript" — thiết kế lại luồng persist

### Vấn đề gốc

Hiện tại: Python agent gửi transcript qua LiveKit data channel → frontend nhận → lưu trong React state. **Nếu frontend crash/đóng tab → toàn bộ hội thoại mất.**

### Giải pháp: Python agent ghi thẳng vào Supabase

Thay vì dựa vào frontend để persist, Python agent (đang chạy trên Modal với service key) tự ghi mỗi turn vào bảng `conversation_turns` ngay khi xử lý xong:

```
Python agent xử lý turn:
  1. STT → transcript
  2. LLM → ai_text
  3. Ghi vào Supabase: INSERT INTO conversation_turns (session_id, speaker, line, ...)
  4. Gửi data channel → frontend (để hiển thị real-time)
  5. TTS → audio
```

Frontend chỉ là **display layer** — nó hiển thị transcript từ data channel. Nếu reconnect, nó fetch lại từ backend API.

**Trade-off chấp nhận:** Python layer biết về Supabase. Điều này vi phạm "stateless data plane" thuần túy — nhưng với team 2–5 người, đây là đánh đổi hợp lý hơn là xây webhook middleware phức tạp.

**Không dùng LiveKit webhook cho data channel:** LiveKit webhooks chỉ fire cho room/participant events, không phải data messages. Xây webhook ingestion riêng cho từng turn sẽ thêm một điểm failure mới.

### Schema event flow

```
[Python agent]
  _process_user_turn() hoàn tất
      ↓
  supabase.table("conversation_turns").insert({
      session_id,
      turn_index,
      speaker: "User"|"AI",
      line: transcript|ai_text,
      audio_key: (nếu có),
      created_at: now()
  })
      ↓
  data_channel.publish({type:"transcript", speaker, line})
      ↓
  TTS → audio stream
```

---

## 2. Contract synchronization — Zod → Python

### Vấn đề

Backend dùng Zod (TypeScript), Python dùng dict/dataclass. Hai bên có thể drift mà không có compile-time error.

### Giải pháp thực tế: JSON Schema làm trung gian

```
packages/contracts/src/livekit.ts
  → Zod schema cho ParticipantMetadata
  → zod-to-json-schema → contracts/dist/livekit.schema.json

ai/modal/ (Python)
  → đọc livekit.schema.json lúc startup
  → validate metadata với jsonschema library
  → hoặc: dùng datamodel-code-generator tạo Pydantic model trong CI
```

**CI pipeline (GitHub Actions):**
```yaml
- name: Generate JSON schemas from Zod
  run: cd packages/contracts && npm run build:schemas

- name: Validate Python models against schemas
  run: python ai/scripts/validate_contracts.py

- name: Fail if schemas diverged
  run: git diff --exit-code ai/contracts/generated/
```

**Không dùng gRPC/Protobuf:** Quá phức tạp cho team nhỏ. JSON Schema + codegen đủ dùng và dễ đọc.

**Trade-off:** Cần maintain CI script. Nhưng đây là đánh đổi tốt — catch contract drift lúc PR thay vì lúc production.

---

## 3. Worker crash & context recovery

### Các kịch bản crash

| Kịch bản | Hành vi mong muốn |
|---|---|
| Worker crash trước khi user nói | Agent reconnect, tạo lại pipeline |
| Worker crash giữa turn | Turn đó mất (chấp nhận được — user nói lại) |
| Worker crash sau khi đã ghi Supabase | Không mất dữ liệu |
| Frontend disconnect (không phải worker) | Worker vẫn chạy, chờ reconnect |

### Recovery flow

```
[Frontend detect: LiveKit participant left (agent)]
    ↓
Show overlay: "Đang kết nối lại AI..."
    ↓
Backend: Modal worker tự restart (LiveKit agent framework retry)
New worker instance:
    1. Nhận job từ LiveKit room
    2. Đọc session_id từ participant metadata
    3. Fetch conversation history từ Supabase: 
       SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY turn_index
    4. Resume hội thoại với đúng history
    ↓
Agent gửi data_channel: {type: "agent_ready"}
Frontend: tắt overlay, tiếp tục
```

**Key insight:** Supabase là source of truth. Worker là stateless ngoại trừ in-memory VRAM cache (models). Context recovery = đọc lại từ DB.

**Graceful degradation:** Nếu sau 60s vẫn không có worker mới → frontend hiển thị "Phiên bị gián đoạn, vui lòng bắt đầu lại" thay vì chờ vô hạn.

---

## 4. Deployment & versioning strategy

### Vấn đề thực sự

Ba thành phần deploy độc lập:
- Frontend (Vercel/Next.js) — deploy ngay, không rollback dễ
- Backend (Node.js) — có thể rolling deploy
- Modal worker — deploy một lần cho tất cả sessions

**Rủi ro:** New frontend + old worker = format metadata không khớp.

### Giải pháp: Versioned metadata schema

```typescript
// packages/contracts/src/livekit.ts
interface ParticipantMetadata {
  v: number;           // schema version — REQUIRED, backend luôn set
  scenario: {...};
  history: DialogueTurn[];
  systemPrompt: string;
  userName: string;
}
```

**Python worker xử lý version:**
```python
meta = json.loads(participant.metadata or "{}")
version = meta.get("v", 1)  # default 1 nếu không có

if version == 1:
    # handle old format (no systemPrompt field)
    system_prompt = HARDCODED_DEFAULT_PROMPT
elif version == 2:
    system_prompt = meta.get("systemPrompt", HARDCODED_DEFAULT_PROMPT)
else:
    print(f"[Bridge] Unknown metadata version {version}, attempting best effort")
    system_prompt = meta.get("systemPrompt", HARDCODED_DEFAULT_PROMPT)
```

### Rolling deploy sequence (không break active sessions)

```
Bước 1: Deploy Modal worker mới (support v1 + v2)
         Active v1 sessions: vẫn hoạt động (worker hiểu v1)
         Không deploy frontend/backend vội

Bước 2: Deploy backend mới (phát token v2)
         New sessions: dùng v2 metadata
         Old sessions đang chạy: đã có worker, không ảnh hưởng

Bước 3: Deploy frontend mới
         Sau khi backend + worker đã stable (>1h monitoring)

Bước 4: Sau 24h, có thể xoá support v1 khỏi worker nếu muốn
```

**API versioning cho backend routes:**
- Giữ nguyên `/api/practice/...` (v1) hoạt động
- Thêm tính năng mới vào query params hoặc request body, không đổi route
- Chỉ tạo `/api/v2/...` khi có breaking change thực sự

**Không dùng feature flags phức tạp:** Với team nhỏ, version field trong metadata + backward-compat code đủ dùng.

---

## 5. Local LLM readiness — làm gì ngay bây giờ

### Thay đổi tối thiểu cần làm ngay

Không cần xây full abstraction layer. Chỉ cần **1 thay đổi nhỏ**:

```python
# ai/llm/gemini.py — HIỆN TẠI
def _llm_call():
    r = self.genai_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=messages,
        config={"system_instruction": system_prompt}
    )
    return r.text

# ai/llm/base.py — THÊM VÀO (đơn giản, không over-engineer)
from typing import Protocol

class LLMClient(Protocol):
    def generate(self, messages: list[dict], system: str) -> str: ...
```

```python
# ManualBridgeAgent nhận llm_client thay vì genai_client
class ManualBridgeAgent:
    def __init__(self, ctx, vad, stt, tts, llm: LLMClient, ...):
        self.llm = llm
```

**Thêm `llm_provider` vào metadata (optional):**
```json
{"v": 2, "llm_provider": "gemini", ...}
```

Worker kiểm tra `llm_provider`:
- `"gemini"` (default) → `GeminiClient`
- `"ollama"` → `OllamaClient` (implement sau)

**Không cần làm ngay:** Factory pattern, dependency injection framework, config YAML. Khi Ollama thực sự cần, chỉ thêm 1 file `ai/llm/ollama.py` implement Protocol là xong.

---

## 6. Data flow guarantees — transcript không bao giờ mất

### Source of truth

```
Supabase conversation_turns table
  = nguồn sự thật duy nhất cho transcript

LiveKit data channel
  = display-only, best-effort, không đảm bảo
```

### Eventual consistency model

```
[Python agent ghi Supabase] → durably stored
      ↓ (async, không block TTS)
[Data channel publish] → frontend display
      ↓ (nếu frontend miss message)
[Frontend reconnect] → fetch from /api/practice/sessions/:id/turns
      ↓
Frontend re-renders history từ DB
```

**Điều kiện transcript bị mất (sau khi implement):**
- Python agent crash SAU khi gọi STT/LLM nhưng TRƯỚC khi ghi Supabase → mất 1 turn. **Chấp nhận được.** User nói lại câu đó.
- Supabase downtime → tất cả crash. Ngoài tầm kiểm soát với team nhỏ.

**Không implement:** message queue (Redis/Kafka), WAL, distributed transactions. Overkill hoàn toàn cho use case này.

---

## 7. RAG — không block real-time loop

**Nguyên tắc:** RAG chỉ chạy TRƯỚC session, không bao giờ trong vòng lặp real-time.

```
[Setup session]
BrainAgent (Node.js):
    1. Nhận user goal
    2. RAG: tìm scenario templates liên quan từ vector DB (optional)
    3. Gemini generate scenario dựa trên retrieved context
    4. Inject kết quả vào systemPrompt
    5. systemPrompt được nhúng vào LiveKit token

[Real-time loop — Python]
    Không gọi RAG
    Chỉ dùng systemPrompt đã có sẵn trong metadata
```

**Nếu sau này cần per-turn RAG** (ví dụ: tra từ vựng real-time):
- Chạy async song song với LLM call, không block
- Timeout 200ms, nếu không xong thì bỏ qua

---

## 8. Tóm tắt trade-offs

| Quyết định | Lý do chọn | Downside chấp nhận |
|---|---|---|
| Python ghi thẳng Supabase | Đơn giản, không cần webhook middleware | Python layer biết về DB (vi phạm separation) |
| JSON Schema làm contract bridge | Nhẹ, không cần protobuf | Cần maintain CI script |
| Version field trong metadata | Zero-downtime deploy không cần feature flag service | Cần maintain backward-compat code ~24h |
| Protocol (không Factory) cho LLM | Đủ để swap model, không over-engineer | Cần refactor nếu cần DI phức tạp sau này |
| Pre-session RAG only | Giữ real-time loop <350ms | Không có per-turn context lookup |
| Mất 1 turn nếu worker crash giữa chừng | Không cần 2-phase commit | User phải nói lại (UX chấp nhận được) |

---

## A. Kiến trúc tổng thể — Control Plane vs Data Plane

Vấn đề cốt lõi hiện tại: **Dual-Brain** — logic hội thoại bị chia giữa Node.js (BrainAgent, VoiceAgent) và Python (ManualBridgeAgent trong Modal). Hai não phải đồng bộ state qua mạng, sinh ra độ trễ và nguy cơ mất đồng bộ.

**Giải pháp: tách thành 2 mặt phẳng với ranh giới rõ ràng**

```
┌─────────────────────────────────────────────────────┐
│  CONTROL PLANE (Node.js / Express)                  │
│                                                     │
│  • Auth, session management                         │
│  • Tạo kịch bản (BrainAgent → Gemini)              │
│  • Đánh giá sau phiên (AnalystAgent → Gemini)      │
│  • Ghi DB (turns, evaluations, stats)               │
│  • Tạo LiveKit token + nhúng metadata               │
│  • Serve prompt templates qua API                   │
│  • Orchestration: biết "cần làm gì"                │
└───────────────────┬─────────────────────────────────┘
                    │ LiveKit token (scenario + prompts)
                    ▼
┌─────────────────────────────────────────────────────┐
│  DATA PLANE (Python / Modal + LiveKit)              │
│                                                     │
│  • Vòng lặp real-time: VAD → STT → LLM → TTS       │
│  • Stateless per-session: đọc context từ metadata   │
│  • KHÔNG biết DB, KHÔNG biết business logic         │
│  • Chỉ biết: "nhận audio → trả audio + transcript" │
│  • Gửi transcript về frontend qua data channel      │
└─────────────────────────────────────────────────────┘
```

**Quy tắc cứng:**
- Mọi persistence → Control Plane
- Mọi real-time inference → Data Plane
- Python agent không gọi DB, không gọi backend API
- Node.js không chạy STT/TTS

---

## B. Luồng dữ liệu đầy đủ

```
[1] User mô tả mục tiêu
      Frontend → POST /api/practice/scenario
      Backend: BrainAgent.generateScenario() → Gemini
      Backend: lưu session vào DB
      Backend: fetch prompt template từ DB/config
      Backend: tạo LiveKit token, nhúng {scenario, history, systemPrompt, userName}
      Response: {token, livekitUrl, scenario}

[2] Frontend kết nối LiveKit room
      useLiveKitRoom.connect(token, url)
      Modal LiveKitAgentWorker nhận job
      _livekit_prewarm: load Whisper + TTS vào VRAM (1 lần)
      _livekit_entrypoint: đọc participant.metadata → parse context

[3] Agent sẵn sàng
      Agent gửi data channel: {type: "agent_ready"}
      Frontend: tắt loading overlay, bật mic

[4] Người dùng nói (real-time loop)
      Mic → LiveKit → Silero VAD → buffer frames
      END_OF_SPEECH → _process_user_turn(frames)
        STT: Whisper → transcript
        LLM: Gemini (dùng systemPrompt từ metadata)
        TTS: Valtec → audio frames
      Data channel → {type:"transcript", speaker:"User"|"AI", line}
      Audio → LiveKit track → speaker user

[5] Frontend nhận transcript
      useLiveKitRoom: DataReceived → onNewTurn callback
      ScenarioContext: thêm vào history

[6] Kết thúc phiên
      Frontend → POST /api/practice/analyze (history, audioFileKeys)
      Backend: AnalystAgent.evaluateSession() → Gemini
      Backend: lưu evaluation vào DB
      Response: {score, radar, strengths, improvements}
```

---

## C. Cấu trúc thư mục

```
speakmate/                             (monorepo root)
│
├── packages/
│   └── contracts/                     # Nguồn sự thật duy nhất cho types
│       ├── src/
│       │   ├── practice.ts            # FullScenarioContext, DialogueTurn, EvalRubric
│       │   ├── livekit.ts             # ParticipantMetadata schema (Zod)
│       │   └── index.ts               # re-export
│       └── package.json               # "@speakmate/contracts"
│
├── apps/
│   │
│   ├── frontend/                      # Next.js 16 — UI + WebRTC client
│   │   └── src/
│   │       ├── app/                   # Pages (routes)
│   │       ├── components/
│   │       │   ├── ui/                # shadcn primitives
│   │       │   └── practice/         # RobotAvatar, FloatingTranscripts, Waveform
│   │       ├── hooks/
│   │       │   ├── useLiveKitRoom.ts  # WebRTC + data channel
│   │       │   └── useAudioRecorder.ts
│   │       ├── context/
│   │       │   └── ScenarioContext.tsx
│   │       ├── lib/
│   │       │   ├── apiClient.ts
│   │       │   └── supabase/
│   │       └── types/                 # import từ @speakmate/contracts
│   │
│   └── backend/                       # Express 5 — Control Plane
│       └── src/
│           ├── agents/                # Chỉ 2 agents: Brain + Analyst (LLM-heavy)
│           │   ├── brain.agent.ts     # Tạo kịch bản, gợi ý, điều chỉnh
│           │   └── analyst.agent.ts   # Đánh giá sau phiên
│           │   # VoiceAgent KHÔNG còn ở đây — đã chuyển sang Python Data Plane
│           ├── services/
│           │   ├── livekit.service.ts # Tạo token + nhúng đầy đủ metadata
│           │   ├── prompt.service.ts  # NEW: đọc/serve prompt templates
│           │   ├── database.service.ts
│           │   ├── storage.service.ts
│           │   └── audio.service.ts
│           ├── controllers/
│           │   └── practice.controller.ts
│           ├── routes/
│           ├── middleware/
│           ├── contracts/             # import từ @speakmate/contracts
│           └── config/
│
├── ai/                                # Data Plane — Python, stateless
│   │
│   ├── stt/
│   │   ├── base.py                    # Protocol/ABC: transcribe(audio) → str
│   │   └── whisper.py                 # WhisperSTT(model_name, **kwargs)
│   │
│   ├── tts/
│   │   ├── base.py                    # Protocol/ABC: synthesize(text) → (np.array, int)
│   │   ├── valtec_zeroshot.py         # ZeroShotTTS(checkpoint, voice_ref)
│   │   └── valtec_builtin.py          # BuiltinTTS(speaker)
│   │
│   ├── llm/
│   │   ├── base.py                    # Protocol/ABC: generate(messages, system) → str
│   │   └── gemini.py                  # GeminiClient(api_key)
│   │
│   ├── vad/
│   │   └── silero.py                  # load_vad() → silero.VAD
│   │
│   ├── agents/
│   │   └── bridge_agent.py            # ManualBridgeAgent — nhận context từ metadata
│   │                                  # KHÔNG hardcode prompt, đọc từ ctx.metadata
│   │
│   ├── livekit_plugins/               # Giữ nguyên (dùng cho VoicePipelineAgent nếu cần)
│   │   ├── whisper_stt.py
│   │   └── valtec_tts.py
│   │
│   └── modal/                         # Deployment wrappers — chỉ wire, không logic
│       ├── app.py                     # modal.App + secrets + volumes
│       ├── image.py                   # Container image definition
│       ├── http_pipeline.py           # VoicePipeline (HTTP mode, legacy fallback)
│       └── livekit_worker.py          # LiveKitAgentWorker + prewarm + entrypoint
│
├── tests/
│   ├── ai/
│   │   ├── test_vad_stt.py            # Script test local (có playback audio)
│   │   └── test_full_pipeline.py
│   ├── backend/
│   └── integration/
│       └── test_livekit_direct.py
│
├── scripts/
│   ├── start.bat / start.ps1
│   ├── stop.bat / stop.ps1
│   ├── upload_models.py
│   └── deploy_modal.py                # Wrapper fix utf-8
│
├── docs/
│   ├── architecture.md
│   └── deployment.md
│
├── data/
│   ├── voice_samples/                 # voice1.wav (gitignored nếu lớn)
│   └── prompts/                       # Prompt templates (.txt) — source of truth
│       ├── conversation.txt
│       ├── evaluation.txt
│       └── scenario.txt
│
├── CLAUDE.md
├── .env.example
├── package.json                       # Workspace root (npm workspaces)
└── .gitignore
```

---

## D. Trách nhiệm từng module

| Module | Ngôn ngữ | Sở hữu | KHÔNG sở hữu |
|---|---|---|---|
| `packages/contracts` | TypeScript (Zod) | Schema types dùng chung | Business logic |
| `apps/frontend` | TypeScript/React | UI, WebRTC client, hiển thị transcript | Gọi AI trực tiếp |
| `apps/backend/agents/brain` | TypeScript | Tạo kịch bản, gợi ý → Gemini | Real-time voice |
| `apps/backend/agents/analyst` | TypeScript | Đánh giá phiên → Gemini | Real-time voice |
| `apps/backend/services/livekit` | TypeScript | Tạo token + nhúng **đầy đủ** metadata | STT/TTS |
| `apps/backend/services/prompt` | TypeScript | Đọc/serve prompt templates | Inference |
| `ai/stt/whisper` | Python | Transcription (không biết LiveKit) | Deployment |
| `ai/tts/valtec_*` | Python | Synthesis (không biết LiveKit) | Deployment |
| `ai/agents/bridge_agent` | Python | Vòng lặp VAD→STT→LLM→TTS, đọc context từ metadata | DB, business logic |
| `ai/modal/livekit_worker` | Python | Prewarm + wiring agents | Logic hội thoại |

---

## E. Kế hoạch migration (tăng dần, không big-bang)

### Bước 1 — Shared contracts (1–2 ngày)
- Tạo `packages/contracts/` với Zod schemas
- `ParticipantMetadata` schema: `{scenario, history, systemPrompt, userName}`
- Frontend và backend import từ package này
- Xoá duplicate type definitions

### Bước 2 — Prompt service (1 ngày)
- Chuyển prompt text ra `data/prompts/*.txt`
- Tạo `prompt.service.ts` trong backend đọc file hoặc DB
- Backend nhúng `systemPrompt` vào LiveKit token metadata
- Python agent đọc `systemPrompt` từ metadata thay vì hardcode

### Bước 3 — Tách `modal_pipeline.py` (2–3 ngày)
- Tạo `ai/` folder
- Tách thành `ai/stt/`, `ai/tts/`, `ai/llm/`, `ai/agents/`, `ai/modal/`
- Modal files chỉ import từ `ai/` modules
- Test deploy — hành vi không đổi

### Bước 4 — Loại bỏ VoiceAgent khỏi Node.js (1 ngày)
- `voice.agent.ts` hiện chỉ dùng cho HTTP mode (non-LiveKit)
- Giữ lại nếu vẫn cần HTTP fallback, hoặc xoá nếu LiveKit là default
- Dọn sạch code path không dùng

### Bước 5 — Dọn root (1 ngày)
- Di chuyển `test_*.py` → `tests/ai/`
- Di chuyển scripts → `scripts/`
- Di chuyển `sample_voice/` → `data/voice_samples/`
- `.gitignore` thêm: model files, venv, vad_segments

---

---

## F. Quy tắc kiểm tra sau mỗi bước (Verification Checklist)

**Sau mỗi bước migration, PHẢI chạy verification trước khi tiếp bước tiếp theo.**

### Bước 1 — Shared contracts
```bash
# Verify: package build thành công
cd packages/contracts && npm run build

# Verify: frontend import được
cd apps/frontend && npm run build

# Verify: backend import được
cd apps/backend && npm run build

# Verify: JSON schema generated
ls packages/contracts/dist/*.schema.json
```
**Đạt:** Build cả 3 thành công, schema file tồn tại.

### Bước 2 — Prompt service + Internal API
```bash
# Start backend
cd apps/backend && npm run dev

# Test internal endpoint (curl)
curl -H "Authorization: Bearer $INTERNAL_KEY" \
  http://localhost:3001/api/internal/sessions/TEST_ID/context

# Expected: 200 + JSON {scenario, systemPrompt, history, userName}
```
**Đạt:** Endpoint trả 200, systemPrompt đọc từ file/DB.

### Bước 3 — Tách modal_pipeline.py
```bash
# Deploy
modal deploy ai/modal/app.py

# Run agent
modal run ai/modal/app.py::LiveKitAgentWorker.run

# Test: vào phòng trên web
# Expected logs:
#   [LiveKit] Loading models...
#   [Bridge] Fetching context for session_id=...
#   [Bridge] Ready. User: ...
#   [Bridge] agent_ready sent.
#   [VAD] Speech start
#   [STT] '...'
#   [LLM] '...'
#   [TTS] Streamed ... samples

# Test turn persistence:
# Nói 1 câu → check DB:
# SELECT * FROM conversation_turns WHERE session_id = 'xxx' ORDER BY turn_index;
# Expected: có turn với confirmed data
```
**Đạt:** Agent chạy, transcript chính xác, turn ghi vào DB, frontend hiển thị.

### Bước 4 — Loại bỏ VoiceAgent Node.js
```bash
# Backend still starts without VoiceAgent
cd apps/backend && npm run dev

# HTTP fallback mode (nếu giữ):
curl -X POST http://localhost:3001/api/practice/interact \
  -F "audio=@test.wav" -F "scenario_str=..."
# Expected: 200 hoặc 404 nếu đã xoá route

# LiveKit mode: test full session trên web
# Expected: không khác biệt so với bước 3
```
**Đạt:** Backend chạy, LiveKit mode hoạt động.

### Bước 5 — Dọn root
```bash
# Verify: git status sạch (không file rác)
git status

# Verify: tất cả test scripts chạy được từ vị trí mới
python tests/ai/test_vad_stt.py --no-playback

# Verify: deploy scripts hoạt động
python scripts/deploy_modal.py
```
**Đạt:** Repo gọn, scripts chạy, deploy thành công.

### Smoke test toàn bộ hệ thống (chạy sau bước cuối)
```
1. Start backend: cd apps/backend && npm run dev
2. Start frontend: cd apps/frontend && npm run dev
3. Start Modal agent: modal run ai/modal/app.py::LiveKitAgentWorker.run
4. Mở browser: http://localhost:3000
5. Đăng nhập → Tạo kịch bản → Vào phòng luyện tập
6. Nói 3-4 câu → Kiểm tra transcript hiển thị
7. Kết thúc → Xem evaluation page
8. Vào History → Xem lại session vừa xong
9. Refresh trang ở bước 6 → transcript không bị mất
```

---

## G. Thư mục `.ai/` — ngữ cảnh cho AI Agent & dev

Thư mục `.ai/` tại root dự án dành riêng cho:
- Ngữ cảnh và trạng thái cho AI agents đang làm việc trên codebase
- Tài liệu kiến trúc nội bộ (không phải docs cho end user)
- Session handoff notes giữa các agents/dev

```
.ai/
├── STATE.md              # Trạng thái hiện tại: ai đang làm gì, tới đâu
├── CONTEXT.md            # Kiến trúc, luật, conventions — compile thành CLAUDE.md
├── sync.js               # Script compile CONTEXT.md → root/CLAUDE.md
├── notify.py             # Script thông báo khi task hoàn thành
│
├── plans/                # Các kế hoạch kiến trúc & migration
│   └── architecture-v2.md
│
├── prompts/              # System prompt templates cho AI agents
│   ├── conversation.txt
│   ├── evaluation.txt
│   └── scenario.txt
│
└── logs/                 # Chỉ local, gitignored
    └── session_debug.log
```

**Quy tắc cho AI agents:**
- Đọc `STATE.md` đầu session để biết agent trước làm tới đâu
- Ghi handoff note vào `STATE.md` cuối session
- Kế hoạch dài hạn lưu trong `plans/`
- Prompt templates quản lý tại `.ai/prompts/` (backend đọc từ đây)

**Quy tắc cho dev:**
- Không sửa `CLAUDE.md` trực tiếp — sửa `.ai/CONTEXT.md` rồi chạy `node .ai/sync.js`
- Dùng `STATE.md` để giao tiếp async với AI agents khác

---

## Những gì KHÔNG thay đổi
- Modal + LiveKit stack giữ nguyên
- Supabase auth + DB giữ nguyên
- API routes và contract hiện tại tương thích ngược
- Không cần Kubernetes, không cần service mesh
- Team nhỏ: mỗi bước có thể deploy độc lập, rollback dễ
