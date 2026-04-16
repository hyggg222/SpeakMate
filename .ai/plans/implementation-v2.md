# Kế hoạch triển khai Architecture v2 — SpeakMate

## Context

Thiết kế kiến trúc v2 đã hoàn tất (`.ai/plans/architecture-v2.md`). PhoWhisper STT đã deploy thành công. Giờ triển khai từng bước migration — bắt đầu từ nền tảng (shared contracts), sau đó tách logic dần.

**Trạng thái hiện tại:**
- Types: `data.contracts.ts` (backend) và `api.contracts.ts` (frontend) — **100% giống nhau**, copy thủ công
- Prompts: trùng lặp ở 3 nơi (modal_pipeline.py x2, voice.agent.ts x1)
- Monorepo: **chưa có** — không có root `package.json`, không có npm workspaces
- LiveKit metadata: nhét toàn bộ `{scenario, history, userName}` vào JWT token
- modal_pipeline.py: 29KB monolithic, chưa tách module

**Mục tiêu:** Migration tăng dần, mỗi bước deploy + verify trước khi tiếp.

---

## Bước 1 — npm workspaces + shared contracts (nền tảng)

### 1.1 Tạo root `package.json` với workspaces

**Tạo file:** `d:/SpeakMate/package.json`
```json
{
  "name": "speakmate",
  "private": true,
  "workspaces": ["packages/*", "frontend", "backend"]
}
```

### 1.2 Tạo `packages/contracts/`

```
packages/contracts/
├── src/
│   ├── practice.ts    ← copy từ backend/src/contracts/data.contracts.ts + export
│   ├── livekit.ts     ← MỚI: Zod schema cho ParticipantMetadata
│   └── index.ts       ← re-export tất cả
├── package.json       ← name: "@speakmate/contracts"
└── tsconfig.json
```

**`packages/contracts/src/practice.ts`:** Copy content từ `backend/src/contracts/data.contracts.ts` (4 interfaces: DialogueTurn, InterviewScenario, EvaluationRubric, FullScenarioContext).

**`packages/contracts/src/livekit.ts`:** MỚI
```typescript
import { z } from 'zod';

export const ParticipantMetadataSchema = z.object({
  v: z.number().default(2),
  session_id: z.string().uuid(),
});
export type ParticipantMetadata = z.infer<typeof ParticipantMetadataSchema>;
```

### 1.3 Cập nhật backend + frontend import

- `backend/package.json`: thêm dependency `"@speakmate/contracts": "*"`
- `frontend/package.json`: thêm dependency `"@speakmate/contracts": "*"`
- `backend/src/contracts/data.contracts.ts`: thay content bằng `export * from '@speakmate/contracts'`
- `frontend/src/types/api.contracts.ts`: thay content bằng `export * from '@speakmate/contracts'`

### 1.4 Chạy install + build

```bash
cd d:/SpeakMate && npm install
cd packages/contracts && npx tsc
cd backend && npm run build
cd frontend && npm run build
```

### Verification Bước 1
```bash
# Build cả 3 thành công
cd d:/SpeakMate && npm run --workspaces build  # hoặc lần lượt
# Frontend dev vẫn chạy
cd frontend && npm run dev  # http://localhost:3000 load OK
# Backend dev vẫn chạy
cd backend && npm run dev   # http://localhost:3001 respond OK
```

---

## Bước 2 — Internal API endpoints + metadata slim-down

### 2.1 Backend: thêm internal routes + middleware

**Tạo file:** `backend/src/middleware/internal.middleware.ts`
```typescript
// Verify INTERNAL_API_KEY từ request header
export function verifyInternalKey(req, res, next) {
    const key = req.headers['authorization']?.replace('Bearer ', '');
    if (key !== process.env.INTERNAL_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
    next();
}
```

**Tạo file:** `backend/src/routes/internal.routes.ts`
- `GET /api/internal/sessions/:id/context` — trả `{scenario, history, systemPrompt, userName}`
- `POST /api/internal/turns` — nhận `{session_id, turn_index, speaker, line}` → ghi DB

**Cập nhật:** `backend/src/app.ts` — mount internal routes

**Cập nhật:** `backend/.env` — thêm `INTERNAL_API_KEY=<random-secret>`

### 2.2 Backend: tạo prompt.service.ts

**Tạo file:** `backend/src/services/prompt.service.ts`
- Extract prompt từ `voice.agent.ts:23-36` thành method `buildConversationPrompt(scenario, userName)`
- Method đọc template từ file `.ai/prompts/conversation.txt` hoặc fallback inline

### 2.3 LiveKit metadata slim-down

**Cập nhật:** `backend/src/services/livekit.service.ts`
```typescript
// TRƯỚC: metadata = { scenario, history, userName }
// SAU:
const metadata = JSON.stringify({
    v: 2,
    session_id: sessionId,  // backend tạo session trước, lấy ID
});
```

**Lưu ý:** Bước này yêu cầu backend tạo `practice_sessions` row TRƯỚC khi tạo LiveKit token. Hiện tại flow tạo session ở đâu? Cần check `practice.controller.ts`.

### 2.4 Modal pipeline: fetch context thay vì đọc metadata

**Cập nhật:** `modal_pipeline.py` — `_livekit_entrypoint()`:
```python
# TRƯỚC: đọc scenario/history/userName từ metadata
# SAU:
meta = json.loads(participant.metadata or "{}")
session_id = meta.get("session_id")
# Fetch từ backend Internal API
async with httpx.AsyncClient() as c:
    resp = await c.get(f"{BACKEND_URL}/api/internal/sessions/{session_id}/context", ...)
context = resp.json()
```

**Cập nhật:** `ManualBridgeAgent.__init__()` — nhận `context` dict thay vì đọc metadata trong `start()`

**Thêm pip_install:** `httpx` vào Modal image

**Thêm Modal secret:** `backend-internal-key` (`INTERNAL_API_KEY`, `BACKEND_URL`)

### Verification Bước 2
```bash
# 1. Backend start + test internal endpoints
cd backend && npm run dev
curl -H "Authorization: Bearer $INTERNAL_KEY" http://localhost:3001/api/internal/sessions/TEST/context
# Expected: 200 + JSON

# 2. Deploy modal + test room
modal deploy modal_pipeline.py
modal run modal_pipeline.py::LiveKitAgentWorker.run
# Expected logs: [Bridge] Fetching context for session_id=...
# Vào phòng trên web → nói → transcript hiện

# 3. Frontend vẫn hoạt động bình thường
```

---

## Bước 3 — Turn persistence qua Internal API

### 3.1 Backend: implement `POST /api/internal/turns`

Trong `internal.routes.ts` đã tạo ở bước 2, implement logic:
- Nhận `{session_id, turn_index, speaker, line}`
- Ghi vào `conversation_turns` table
- Trả `{turn_id}` (hoặc 200 OK)

### 3.2 Modal pipeline: persist turn + optimistic UI

**Cập nhật:** `ManualBridgeAgent._process_user_turn()`:
1. Sau STT+LLM → data channel publish `{type:"transcript", turn_index, status:"pending"}`
2. `asyncio.create_task(_persist_turn(...))` — POST tới backend
3. Khi persist thành công → data channel publish `{type:"turn_confirmed", turn_index}`

### 3.3 Frontend: handle pending/confirmed

**Cập nhật:** `useLiveKitRoom.ts` — handle `turn_confirmed` message
**Cập nhật:** `FloatingTranscripts.tsx` — hiển thị pending turn với opacity thấp

### 3.4 Thêm `turn_index` counter vào ManualBridgeAgent

`self.turn_counter = 0`, tăng sau mỗi turn.

### Verification Bước 3
```bash
# 1. Vào phòng, nói 2-3 câu
# 2. Check DB:
#    SELECT * FROM conversation_turns WHERE session_id = '...' ORDER BY turn_index;
# 3. Refresh trang → transcript vẫn còn (fetch từ DB)
# 4. Frontend: transcript hiện pending (mờ) → confirmed (rõ)
```

---

## Bước 4 — Tách modal_pipeline.py thành modules

### 4.1 Tạo cấu trúc `ai/`

```
ai/
├── __init__.py
├── stt/
│   ├── __init__.py
│   └── whisper.py          ← extract WhisperModel loading + transcribe logic
├── tts/
│   ├── __init__.py
│   └── valtec.py           ← extract ZeroShotTTS loading + synthesize logic
├── llm/
│   ├── __init__.py
│   ├── base.py             ← Protocol class
│   └── gemini.py           ← extract Gemini client + generate logic
├── vad/
│   ├── __init__.py
│   └── silero.py           ← extract VAD loading
├── agents/
│   ├── __init__.py
│   └── bridge_agent.py     ← extract ManualBridgeAgent class
├── livekit_plugins/         ← move từ root
│   ├── __init__.py
│   ├── whisper_stt.py
│   └── valtec_tts.py
└── modal/
    ├── __init__.py
    ├── app.py               ← modal.App + image + volumes + secrets
    ├── http_pipeline.py     ← VoicePipeline class
    └── livekit_worker.py    ← LiveKitAgentWorker + prewarm + entrypoint
```

### 4.2 Quy tắc tách

- `ai/modal/app.py` là entry point cho `modal deploy` và `modal run`
- `ai/modal/livekit_worker.py` import từ `ai/agents/bridge_agent.py`
- `ai/agents/bridge_agent.py` import từ `ai/stt/`, `ai/tts/`, `ai/llm/`
- Modal `image` definition thêm `.add_local_dir("ai", "/root/ai")` thay vì chỉ `livekit_plugins`
- `PYTHONPATH` cập nhật để include `/root/ai`

### 4.3 Giữ modal_pipeline.py tạm thời

Giữ file cũ cho đến khi `ai/modal/app.py` deploy + test thành công. Sau đó xoá.

### Verification Bước 4
```bash
# Deploy từ cấu trúc mới
modal deploy ai/modal/app.py

# Test: modal run + vào phòng
modal run ai/modal/app.py::LiveKitAgentWorker.run
# Logs phải giống hệt bước 3

# Sau khi confirm: xoá modal_pipeline.py cũ
```

---

## Bước 5 — Barge-in, sliding window, observability

### 5.1 Barge-in (trong `ai/agents/bridge_agent.py`)
- Thêm `self._tts_task` tracking
- VAD START_OF_SPEECH → cancel TTS task nếu đang chạy
- Data channel: `{type: "ai_interrupted"}`
- DB: schema thêm `interrupted`, `delivered_chars` columns

### 5.2 Sliding window context
- Thêm `_build_messages()` method: 6 turns gần nhất + summary
- Background summarization khi history > 12 turns

### 5.3 Observability
- `turn_id = f"{session_id}_{turn_index}"` gắn vào mọi print()
- Backend log cùng format khi nhận internal API calls

### Verification Bước 5
```bash
# Test barge-in: nói xen khi AI đang phát → AI ngưng
# Test sliding window: session dài > 12 turns → check token count stable
# Test observability: grep turn_id trong Modal logs
```

---

## Bước 6 — Dọn dẹp + rate limit

### 6.1 Di chuyển files
- `test_*.py` ở root → `tests/ai/`
- `test_*.js` → `tests/integration/`
- `upload_*.py`, `fix_*.py` → `scripts/`
- `sample_voice/` → `data/voice_samples/`

### 6.2 Rate limit cho LiveKit token endpoint
- `npm install express-rate-limit` trong backend
- Thêm limiter vào `/api/practice/livekit-session` route

### 6.3 Cập nhật .gitignore
- Thêm: `*.gguf`, `*.exe`, `vad_segments/`, `models/`, `venv/`

### 6.4 Xoá file không cần
- `modal_pipeline.py` (đã thay bằng `ai/modal/`)
- `backend-stt/`, `backend-tts/` (nếu không dùng)

### Verification Bước 6
```bash
# Smoke test toàn bộ:
cd backend && npm run dev
cd frontend && npm run dev
modal run ai/modal/app.py::LiveKitAgentWorker.run
# Browser: tạo kịch bản → vào phòng → nói → kết thúc → xem evaluation → history
```

---

## Files chính cần tạo/sửa (tổng hợp)

| File | Hành động | Bước |
|---|---|---|
| `package.json` (root) | Tạo mới | 1 |
| `packages/contracts/` | Tạo mới | 1 |
| `backend/src/contracts/data.contracts.ts` | Sửa → re-export | 1 |
| `frontend/src/types/api.contracts.ts` | Sửa → re-export | 1 |
| `backend/src/middleware/internal.middleware.ts` | Tạo mới | 2 |
| `backend/src/routes/internal.routes.ts` | Tạo mới | 2 |
| `backend/src/services/prompt.service.ts` | Tạo mới | 2 |
| `backend/src/services/livekit.service.ts` | Sửa metadata | 2 |
| `modal_pipeline.py` | Sửa entrypoint (tạm) | 2 |
| `useLiveKitRoom.ts` | Sửa data channel handler | 3 |
| `ai/` folder | Tạo mới (toàn bộ) | 4 |
| `ai/agents/bridge_agent.py` | Thêm barge-in + sliding window | 5 |
| `.gitignore` | Sửa | 6 |

---

## Ghi chú trước khi bắt đầu

- PhoWhisper đã deploy thành công → ghi vào STATE.md
- Mỗi bước kết thúc = commit checkpoint + deploy + verify
- Nếu bước nào fail → rollback commit đó, KHÔNG tiến bước tiếp
- Ưu tiên: Bước 1-2-3 (nền tảng) > Bước 4 (refactor) > Bước 5-6 (polish)
