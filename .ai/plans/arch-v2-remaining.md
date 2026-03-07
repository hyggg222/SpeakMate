# Kế hoạch hoàn thành Architecture v2 — SpeakMate

## Context

Arch v2 đã hoàn thành: shared contracts, Internal API, turn persistence, tách ai/ folder. Còn lại 5 nhóm task chưa làm, theo thứ tự ưu tiên:

1. **Rate limit** `/livekit-session` — chặn GPU abuse
2. **Prompt externalization** — xoá duplicate 3 chỗ, tập trung vào `data/prompts/`
3. **Sliding window context** — ngăn token explosion sau 30 phút
4. **Barge-in** — user ngắt lời AI, cancel TTS task
5. **Optimistic UI** — `turn_confirmed` + `ai_interrupted` signal ở frontend

---

## Task 1 — Rate Limit `/livekit-session`

**Vấn đề:** Bot spam endpoint → spin GPU liên tục → tiền cháy. `express-rate-limit` chưa install.

**Files cần sửa:**
- `backend/package.json` — thêm dependency
- `backend/src/routes/practice.routes.ts` — thêm middleware

**Hướng dẫn:**

```bash
cd backend && npm install express-rate-limit
```

**`backend/src/routes/practice.routes.ts`** — thêm rate limiter trước route `/livekit-session`:

```typescript
import rateLimit from 'express-rate-limit';

const livekitLimiter = rateLimit({
    windowMs: 60_000,   // 1 phút
    max: 5,             // 5 token/phút/IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Quá nhiều request. Vui lòng thử lại sau 1 phút.' }
});

router.post('/livekit-session',
    livekitLimiter,       // ← thêm vào đây
    authOptional,
    validate(livekitSessionSchema),
    (req, res) => practiceController.createLivekitSession(req, res)
);
```

**Verification:**
```bash
# Gọi 6 lần liên tiếp → lần thứ 6 phải trả 429
for i in {1..6}; do curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/practice/livekit-session -H "Content-Type: application/json" -d '{}'; done
# Expected: 200 200 200 200 200 429
```

---

## Task 2 — Prompt Externalization

**Vấn đề:** Conversation system prompt bị duplicate ở 3 chỗ:
- `voice.agent.ts:25` (getSystemPrompt)
- `prompt.service.ts:15` (buildConversationPrompt)
- `ai/agents/bridge_agent.py:127` (_build_system_prompt)

Brain/Analyst prompts cũng inline trong agent files.

**Mục tiêu:** Tập trung toàn bộ prompt text vào `data/prompts/`, PromptService đọc file, các agent chỉ gọi PromptService.

### 2.1 Tạo prompt template files

**`data/prompts/conversation.txt`:**
```
Bạn là đối tác hội thoại trong một kịch bản luyện tập giao tiếp.
Nhân vật của bạn: {{persona}}
Mục tiêu: {{goals}}
Tên người dùng: {{userName}}

Tuân thủ nghiêm ngặt nhân vật. Không thoát vai.
Trả lời cực kỳ ngắn gọn (tối đa 2 câu, dưới 20 từ).
Hết sức tự nhiên như đang nói chuyện trực tiếp. Tránh giải thích dông dài.
TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [] hoặc placeholder. Luôn dùng tên cụ thể "{{userName}}" hoặc "bạn".

Bối cảnh kịch bản: {{startingTurns}}
```

**`data/prompts/scenario.txt`:**
```
You are an AI scenario designer for a Vietnamese language practice app.
Design a realistic, engaging conversation practice scenario based on the user's goal.

Output ONLY a valid JSON object with NO markdown, NO explanation, NO extra text.
Schema:
{
  "title": "string",
  "description": "string",
  "interviewerPersona": "string",
  "goals": ["string"],
  "startingTurns": [{"speaker": "AI", "line": "string"}],
  "evalRules": {"categories": [{"name": "string", "weight": number, "description": "string"}]}
}

CRITICAL RULES:
1. startingTurns must have 2-3 opening lines from AI to start the conversation naturally.
2. NEVER use bracketed placeholders like [tên của bạn], [your name], [tên], [topic], [địa điểm]. Use concrete names and "bạn" instead.
```

**`data/prompts/evaluation.txt`:**
```
You are a supportive, friendly communication mentor (Safe Mode). Analyze the user's performance based on the full transcript.

Output ONLY valid JSON with this exact structure:
{
  "overallScore": number (0-100),
  "overallFeedback": "string (Vietnamese, 2-3 sentences)",
  "radarData": [{"category": "string", "score": number}],
  "strengths": ["string"],
  "improvements": ["string"],
  "turnHighlights": [{"turn": number, "feedback": "string", "type": "strength"|"improvement"}]
}

Evaluate radarData categories strictly from the rubric provided.
Always respond in Vietnamese for all string properties inside the JSON.
```

### 2.2 Cập nhật `backend/src/services/prompt.service.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';

export class PromptService {
    private readonly promptsDir = path.join(process.cwd(), '..', 'data', 'prompts');

    private readTemplate(name: string): string {
        return fs.readFileSync(path.join(this.promptsDir, `${name}.txt`), 'utf-8');
    }

    buildConversationPrompt(scenario: any, userName: string = 'bạn'): string {
        const persona = scenario?.interviewerPersona || 'Người hướng dẫn';
        const goals = (scenario?.goals || []).join(', ');
        const startingTurns = JSON.stringify(scenario?.startingTurns || []);
        return this.readTemplate('conversation')
            .replace(/\{\{persona\}\}/g, persona)
            .replace(/\{\{goals\}\}/g, goals)
            .replace(/\{\{userName\}\}/g, userName)
            .replace(/\{\{startingTurns\}\}/g, startingTurns);
    }

    getScenarioSystemPrompt(): string {
        return this.readTemplate('scenario');
    }

    getEvaluationSystemPrompt(): string {
        return this.readTemplate('evaluation');
    }
}
```

### 2.3 Cập nhật agents

**`backend/src/agents/brain.agent.ts`:**
- Xoá method `getSystemPrompt()` (lines 43-72)
- Import + instantiate PromptService trong constructor
- Đổi `this.getSystemPrompt()` → `this.promptService.getScenarioSystemPrompt()`

**`backend/src/agents/analyst.agent.ts`:**
- Xoá method `getSystemPrompt()` (lines 36-56)
- Import + instantiate PromptService trong constructor
- Đổi `this.getSystemPrompt()` → `this.promptService.getEvaluationSystemPrompt()`

**`backend/src/agents/voice.agent.ts`:**
- Xoá method `getSystemPrompt()` (lines 23-36)
- Import PromptService, dùng `promptService.buildConversationPrompt(scenario, userName)`

**`ai/agents/bridge_agent.py` — `_build_system_prompt()`:**
- Giữ nguyên làm fallback (chỉ dùng khi backend không trả prompt) — thêm warning log

**Verification:**
```bash
cd backend && npm run build  # 0 errors
curl -X POST http://localhost:3001/api/practice/scenario \
  -H "Content-Type: application/json" \
  -d '{"userGoal":"Luyện phỏng vấn xin việc"}' | jq '.data.scenario.title'
# Expected: tên kịch bản hợp lệ, không có placeholder []
```

---

## Task 3 — Sliding Window Context

**Vấn đề:** `self.history` trong ManualBridgeAgent tăng không giới hạn → TTFT tăng tuyến tính.

**File cần sửa:** `ai/agents/bridge_agent.py`

**Sau Task 3: deploy Modal.**

### 3.1 Thêm constants + state mới trong `__init__`

```python
MAX_RECENT_TURNS = 6  # top of file, as module constant

# Trong __init__:
self.context_summary = ""
```

### 3.2 Thêm `_build_messages()` helper

```python
def _build_messages(self) -> list[dict]:
    recent = self.history[-MAX_RECENT_TURNS:]
    messages = []
    if self.context_summary:
        messages.append({"role": "user", "parts": [{"text": f"[Tóm tắt hội thoại trước]: {self.context_summary}"}]})
        messages.append({"role": "model", "parts": [{"text": "Hiểu rồi."}]})
    for h in recent:
        messages.append({"role": "model" if h["speaker"] == "AI" else "user", "parts": [{"text": h["line"]}]})
    return messages
```

### 3.3 Thêm background summarization

```python
async def _maybe_summarize(self):
    if len(self.history) % 12 == 0 and len(self.history) >= 12:
        asyncio.create_task(self._background_summarize())

async def _background_summarize(self):
    old_turns = self.history[:-MAX_RECENT_TURNS]
    if not old_turns:
        return
    summary_prompt = "Tóm tắt ngắn gọn (2 câu) cuộc hội thoại sau:\n" + \
        "\n".join(f"{t['speaker']}: {t['line']}" for t in old_turns)
    def _call():
        r = self.genai_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[{"role": "user", "parts": [{"text": summary_prompt}]}]
        )
        return r.text
    try:
        self.context_summary = await asyncio.to_thread(_call)
        print(f"[Bridge] Context summarized: {self.context_summary[:80]}...", flush=True)
    except Exception as e:
        print(f"[Bridge] Summarize failed (non-fatal): {e}", flush=True)
```

### 3.4 Cập nhật `_process_user_turn()` phần LLM

```python
# THAY THẾ đoạn build messages cũ:
messages = self._build_messages()
messages.append({"role": "user", "parts": [{"text": transcript}]})

# Sau khi append history (cuối _process_user_turn):
self.history.append({"speaker": "User", "line": transcript})
self.history.append({"speaker": "AI",   "line": ai_text})
await self._maybe_summarize()   # ← thêm dòng này
```

---

## Task 4 — Barge-in

**Vấn đề:** User nói khi AI đang phát TTS → VAD kích hoạt nhưng TTS tiếp tục → bad UX.

**Sau Task 4: chạy DB migration + deploy Modal.**

### 4.1 DB Migration

**Tạo `backend/supabase/migrations/002_barge_in.sql`:**
```sql
ALTER TABLE public.conversation_turns
    ADD COLUMN IF NOT EXISTS interrupted     BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS delivered_chars INTEGER;
```
Chạy trên Supabase Dashboard → SQL Editor.

### 4.2 `backend/src/services/database.service.ts` — thêm method

```typescript
async markTurnInterrupted(sessionId: string, turnNumber: number, deliveredChars: number): Promise<void> {
    const { error } = await supabase
        .from('conversation_turns')
        .update({ interrupted: true, delivered_chars: deliveredChars })
        .eq('session_id', sessionId)
        .eq('turn_number', turnNumber);
    if (error) throw error;
}
```

### 4.3 `backend/src/routes/internal.routes.ts` — thêm PATCH route

```typescript
router.patch('/turns/:turnNumber/interrupted', verifyInternalKey, async (req: Request, res: Response) => {
    const { session_id, delivered_chars } = req.body;
    const turnNumber = parseInt(req.params.turnNumber);
    try {
        await db.markTurnInterrupted(session_id, turnNumber, delivered_chars || 0);
        res.json({ ok: true });
    } catch (err) {
        console.error('[internal] markTurnInterrupted failed:', err);
        res.status(500).json({ error: 'Failed' });
    }
});
```

### 4.4 `ai/agents/bridge_agent.py` — barge-in logic

**Thêm state trong `__init__`:**
```python
self._current_tts_task: asyncio.Task | None = None
self._tts_cancelled = False
self._current_ai_turn_idx: int = -1
self._chars_delivered: int = 0
```

**Trong `_vad_event_loop()`, START_OF_SPEECH:**
```python
if vad_event.type == agents.vad.VADEventType.START_OF_SPEECH:
    if self._current_tts_task and not self._current_tts_task.done():
        self._tts_cancelled = True
        self._current_tts_task.cancel()
        asyncio.create_task(self._signal_ai_interrupted())
    self.is_user_speaking = True
    self.audio_buffer = []
```

**Thêm 2 methods mới:**
```python
async def _signal_ai_interrupted(self):
    try:
        await self.ctx.room.local_participant.publish_data(
            json.dumps({"type": "ai_interrupted"}).encode(), reliable=True
        )
        if self._current_ai_turn_idx >= 0:
            turn_number = (self._current_ai_turn_idx // 2) + 1
            asyncio.create_task(self._mark_turn_interrupted(turn_number, self._chars_delivered))
    except Exception as e:
        print(f"[Bridge] signal interrupted error: {e}", flush=True)

async def _mark_turn_interrupted(self, turn_number: int, delivered_chars: int):
    backend_url = os.environ.get("BACKEND_URL", "").rstrip("/")
    internal_key = os.environ.get("INTERNAL_API_KEY", "")
    if not backend_url or not self.session_id:
        return
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.patch(
                f"{backend_url}/api/internal/turns/{turn_number}/interrupted",
                headers={"Authorization": f"Bearer {internal_key}"},
                json={"session_id": self.session_id, "delivered_chars": delivered_chars},
            )
    except Exception as e:
        print(f"[Persist] mark interrupted error: {e}", flush=True)
```

**Tách TTS streaming thành `_stream_tts()` và wrap trong cancellable task:**

Trong `_process_user_turn()`, thay thế đoạn TTS stream cuối:
```python
# Set tracking state
self._current_ai_turn_idx = ai_turn_idx
self._chars_delivered = 0
self._tts_cancelled = False

# TTS synthesis (blocking, không cancel được)
audio_np, sr = await asyncio.to_thread(_synthesize)
audio_f32_tts = np.array(audio_np, dtype=np.float32)
peak = np.abs(audio_f32_tts).max()
if peak > 0:
    audio_f32_tts = np.clip(audio_f32_tts / peak * 0.95, -1.0, 1.0)
audio_i16 = (audio_f32_tts * 32767).astype(np.int16)

# Streaming (cancellable)
self._current_tts_task = asyncio.create_task(
    self._stream_tts(ai_text, sr, audio_i16)
)
try:
    await self._current_tts_task
except asyncio.CancelledError:
    print(f"[Bridge] TTS cancelled after {self._chars_delivered} chars", flush=True)
finally:
    self._current_tts_task = None
```

**Thêm `_stream_tts()` method:**
```python
async def _stream_tts(self, ai_text: str, sr: int, audio_i16):
    from livekit import rtc
    import numpy as np
    spf = int(sr * 0.02)
    total_frames = max(len(audio_i16) / spf, 1)
    chars_per_frame = len(ai_text) / total_frames
    for i in range(0, len(audio_i16), spf):
        chunk = audio_i16[i:i + spf]
        if len(chunk) < spf:
            chunk = np.pad(chunk, (0, spf - len(chunk)))
        await self.audio_source.capture_frame(rtc.AudioFrame(
            data=chunk.tobytes(), sample_rate=sr,
            num_channels=1, samples_per_channel=spf
        ))
        self._chars_delivered = int((i / spf) * chars_per_frame)
    print(f"[TTS] Streamed {len(audio_i16)} samples @ {sr}Hz", flush=True)
```

### 4.5 `frontend/src/hooks/useLiveKitRoom.ts` — handle ai_interrupted

```typescript
if (msg.type === 'ai_interrupted') {
    setIsAgentSpeaking(false);
}
```

**Verification:**
```
1. Vào phòng → đợi AI nói → ngắt lời ngay giữa câu
2. Modal logs: [Bridge] TTS cancelled after X chars
3. AI dừng nói ngay lập tức
4. Supabase: row có interrupted=true, delivered_chars>0
```

---

## Task 5 — Optimistic UI (turn_confirmed)

**Vấn đề:** Turn hiển thị ngay (data channel) nhưng chưa chắc đã lưu DB → refresh mất turn.

### 5.1 `ai/agents/bridge_agent.py` — gửi turn_confirmed sau persist

Trong `_persist_turn()`, sau khi nhận 200:
```python
if resp.status_code == 200:
    print(f"[Persist] turn {turn_index} ({speaker}) saved", flush=True)
    try:
        await self.ctx.room.local_participant.publish_data(
            json.dumps({"type": "turn_confirmed", "turn_index": turn_index}).encode(),
            reliable=True
        )
    except Exception:
        pass
```

### 5.2 `frontend/src/hooks/useLiveKitRoom.ts`

```typescript
// Thêm vào TurnData interface:
export interface TurnData {
    speaker: string;
    line: string;
    turn_index?: number;
    confirmed?: boolean;
}

// DataReceived handler — thêm turn_index + confirmed:
if (msg.type === 'transcript') {
    onNewTurnRef.current({
        speaker: msg.speaker, line: msg.line,
        turn_index: msg.turn_index, confirmed: false
    });
}
if (msg.type === 'turn_confirmed') {
    onTurnConfirmedRef.current?.(msg.turn_index);
}
```

Thêm `onTurnConfirmed` callback vào hook return và parameter.

### 5.3 `frontend/src/app/practice/conversation/page.tsx`

- Lưu `confirmed` field trong history items
- Pass `onTurnConfirmed` callback vào useLiveKitRoom để update confirmed state

### 5.4 `frontend/src/components/practice/FloatingTranscripts.tsx`

- Thêm prop `confirmed?: boolean` vào transcript item type
- Pending turns: `opacity-60 italic`
- Confirmed turns: `opacity-100`

---

## Thứ tự thực hiện & deploy

| Task | Thời gian ước tính | Deploy Modal? |
|------|-------------------|---------------|
| 1 — Rate limit | 10 phút | Không |
| 2 — Prompts | 30 phút | Không |
| 3 — Sliding window | 20 phút | **Có** |
| 4 — Barge-in | 45 phút | **Có** + DB migration |
| 5 — Optimistic UI | 30 phút | Không |

Sau mỗi task: `PYTHONIOENCODING=utf-8 python .ai/notify.py "Task hoan thanh!"`
Deploy Modal: `PYTHONIOENCODING=utf-8 modal deploy modal_pipeline.py`

---

## Files cần sửa/tạo

| File | Task |
|------|------|
| `backend/package.json` | 1 |
| `backend/src/routes/practice.routes.ts` | 1 |
| `data/prompts/conversation.txt` | 2 |
| `data/prompts/scenario.txt` | 2 |
| `data/prompts/evaluation.txt` | 2 |
| `backend/src/services/prompt.service.ts` | 2 |
| `backend/src/agents/brain.agent.ts` | 2 |
| `backend/src/agents/analyst.agent.ts` | 2 |
| `backend/src/agents/voice.agent.ts` | 2 |
| `ai/agents/bridge_agent.py` | 3 + 4 |
| `backend/supabase/migrations/002_barge_in.sql` | 4 |
| `backend/src/services/database.service.ts` | 4 |
| `backend/src/routes/internal.routes.ts` | 4 |
| `frontend/src/hooks/useLiveKitRoom.ts` | 4 + 5 |
| `frontend/src/app/practice/conversation/page.tsx` | 5 |
| `frontend/src/components/practice/FloatingTranscripts.tsx` | 5 |
