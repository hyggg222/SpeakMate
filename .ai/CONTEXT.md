## What is SpeakMate

AI-powered English practice app for Vietnamese students. Users describe a goal, the AI generates a practice scenario, then they have a voice conversation with an AI partner and receive a scored evaluation afterward.

## Dev Commands

| Service | Dev | Build |
|---------|-----|-------|
| Backend (3001) | `cd backend && npm run dev` | `npm run build` |
| Frontend (3000) | `cd frontend && npm run dev` | `npm run build` |
| LiveKit Agent | `modal run modal_pipeline.py::LiveKitAgentWorker.run` | `modal deploy modal_pipeline.py` |
| All (Windows) | `.\run-all.bat` / `.\stop-all.bat` | — |

For LiveKit mode, all 3 services must run simultaneously. Set `NEXT_PUBLIC_USE_LIVEKIT=true` in `frontend/.env.local`.

No test framework is installed — don't assume Jest/Vitest exists.

No linter is configured.

## Env

**Backend** (`backend/.env`, copy from `.env.example`):
`PORT`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TTS_SERVICE_URL`, `STT_SERVICE_URL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `MODAL_INTERACT_URL`, `MODAL_TRANSCRIBE_URL`

LiveKit credentials (hardcoded defaults in `config/env.ts`, overridable via env): `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

**Frontend** (`.env.local`):
`NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_USE_LIVEKIT` (set `true` to enable WebRTC mode)

**Modal** (secrets on `optimindss3` workspace):
`gemini-api-key` (`GEMINI_API_KEY`), `livekit-keys` (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`)

## Architecture

**Stack:** Next.js 16 App Router (React 19) + Express 5 + Supabase (auth + DB + storage) + Gemini 2.0 Flash (all LLM calls) + Modal (cloud STT/TTS pipeline) + LiveKit (WebRTC real-time voice)

### Three-agent pipeline (`backend/src/agents/`)

All agents are instantiated **only** in `PracticeController` — never elsewhere.

1. **BrainAgent** — scenario generation, hints, adjustments, suggestions. Uses Gemini API directly (`@google/genai`). Output is `FullScenarioContext` JSON (`{ scenario, evalRules }`).
2. **VoiceAgent** — per-turn audio interaction. Sends audio to Modal cloud pipeline (STT + LLM + TTS in one round-trip). Uses `LlmService` (Gemini) for text-only mode.
3. **AnalystAgent** — post-session scoring against a rubric. Uses Gemini API. Returns JSON evaluation report (score, radar data, strengths, improvements, turn highlights).

### Request flow

```
Frontend (apiClient) → Express → authOptional middleware → Zod validate middleware → PracticeController
```

**Audio path:** Browser MediaRecorder → FormData (Multer memory storage) → AudioService transcodes MP4→WAV if Safari → VoiceAgent sends base64 to Modal pipeline → response includes transcript + AI text + TTS audio URL. Background: StorageService uploads user audio to Supabase (1-hr TTL bucket `temp-audio-sessions`).

### API routes (`/api/practice/...`)

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/livekit-session` | LiveKitService.generateToken | optional |
| POST | `/scenario` | BrainAgent.generateScenario | optional |
| POST | `/interact` | VoiceAgent (multipart audio) | optional |
| POST | `/analyze` | AnalystAgent.evaluateSession | optional |
| POST | `/hints` | BrainAgent.generateHints | optional |
| POST | `/scenario/adjust` | BrainAgent.adjustScenario | optional |
| POST | `/scenario/suggestions` | BrainAgent.generateSuggestions | optional |
| GET | `/sessions` | DatabaseService.getUserSessions | **required** |
| GET | `/sessions/:id` | DatabaseService (session+turns+eval) | **required** |
| GET | `/stats` | DatabaseService.getUserStats | **required** |

### LiveKit real-time voice pipeline

Enabled via feature flag `NEXT_PUBLIC_USE_LIVEKIT=true`. Replaces HTTP round-trip with WebRTC streaming for < 1s latency.

- **Frontend:** `useLiveKitRoom` hook (`hooks/useLiveKitRoom.ts`) — Room connect, mic toggle (always-on + VAD), data channel for transcripts (handles `agent_ready` signal).
- **Backend:** `LiveKitService` (`services/livekit.service.ts`) — JWT token generation with scenario/history metadata; endpoint `POST /livekit-session`.
- **Pre-loading Strategy:** To eliminate cold-start latency, the session is pre-created on the `/setup/confirm` page. The token is stored in `ScenarioContext`.
- **Modal:** `LiveKitAgentWorker` in `modal_pipeline.py` — long-running process connecting to LiveKit Cloud SFU.
  - `_livekit_prewarm()` loads Faster-Whisper + Valtec TTS in subprocess via `proc.userdata`.
  - `_livekit_entrypoint()` reads participant metadata, builds `ManualBridgeAgent`.
  - `ManualBridgeAgent` performs TTS warmup, publishes track, and signals `agent_ready` via data channel when fully initialized.
- **Custom plugins:** `livekit_plugins/whisper_stt.py` (wraps Faster-Whisper), `livekit_plugins/valtec_tts.py` (wraps Valtec ZeroShotTTS)
- **HTTP fallback:** `VoicePipeline` class + `useAudioRecorder` hook still work when flag is off

### Backend services (`backend/src/services/`)

- **LlmService** — thin wrapper around `@google/genai` for Gemini chat calls (used by VoiceAgent text mode)
- **LiveKitService** — generates LiveKit JWT tokens with room grants and participant metadata
- **StorageService** — Supabase storage: upload audio, generate signed URLs (1-hr expiry)
- **DatabaseService** — Supabase DB: sessions, turns, evaluations, user stats. Uses service key (bypasses RLS)
- **AudioService** — FFmpeg in-memory transcode (MP4→PCM WAV for Safari)
- **SttService** — HTTP client to Modal cloud STT endpoint

### Frontend structure

- **State:** `ScenarioContext` (`context/ScenarioContext.tsx`) holds `scenario`, `history`, `audioFileKeys`; consumed via `useScenario()` hook
- **API:** `apiClient` (`lib/apiClient.ts`) — all backend calls, auto-attaches Supabase JWT if logged in
- **Auth:** Supabase Auth via `@supabase/ssr`. Browser client in `lib/supabase/client.ts`, server client in `lib/supabase/server.ts`. Login/signup pages + callback route
- **UI:** shadcn/ui (Radix + Tailwind v4), Framer Motion, Recharts for evaluation radar charts

### Key frontend pages

- `/setup` → goal input, scenario generation/adjustment
- `/practice/conversation` → live voice session
- `/evaluation/*` → post-session results (overall, detailed, conversation review)
- `/history` → past sessions (auth required)

### Type contracts

Backend: `backend/src/contracts/data.contracts.ts`
Frontend: `frontend/src/types/api.contracts.ts`
These must stay in sync. Key types: `FullScenarioContext`, `InterviewScenario`, `EvaluationRubric`, `DialogueTurn`.

### Validation

All POST routes use Zod schemas (`backend/src/validators/practice.validators.ts`) via `validate()` middleware. The `interactAudio` route validates text fields only — Multer handles the file.

### Auth

Two Express middlewares in `backend/src/middleware/auth.middleware.ts`:
- `authOptional` — attaches `req.user` if valid JWT present, passes through for guests
- `authRequired` — returns 401 if no valid token

`req.user` is typed via `backend/src/types/express.d.ts` as `{ id: string; email: string }`.

### Database schema

Supabase tables (migration: `backend/supabase/migrations/001_initial_schema.sql`):
- `profiles` — mirrors `auth.users`, auto-created by trigger
- `practice_sessions` — mode (safe/stage/debate), scenario JSONB, status
- `conversation_turns` — per-turn transcripts and audio keys
- `evaluations` — scored report per session (1:1 with session via UNIQUE)

RLS is enabled on all tables; backend uses service key to bypass it.

## Path aliases

- Backend: `@/*` → `src/*` (tsconfig paths, resolved by `tsx`)
- Frontend: `@/*` → `./src/*` (Next.js default)

## Guardrails

- **Agents only from PracticeController** — never instantiate BrainAgent/VoiceAgent/AnalystAgent elsewhere
- **No disk I/O for audio** — Multer uses memory storage; keep it that way (zero-PII design)
- **Keep type contracts in sync** — `data.contracts.ts` (backend) and `api.contracts.ts` (frontend)
- **All LLM output gets placeholder-sanitized** — each agent has `sanitizePlaceholders()` to strip `[tên của bạn]`-style brackets. Maintain this pattern.

## Modal Cloud Pipeline (`modal_pipeline.py`)

Two classes on the same Modal app (`speakmate-pipeline-v2`), both on GPU L4:

1. **VoicePipeline** — HTTP endpoints for legacy round-trip mode (`/interact`, `/transcribe`, `/generate`)
2. **LiveKitAgentWorker** — long-running WebRTC agent connecting to LiveKit Cloud SFU

TTS model: Valtec ZeroShotTTS auto-downloaded from HuggingFace (`valtecAI-team/valtec-zeroshot-voice-cloning`), cached on `/valtec_models` volume. Voice clone reference: `/valtec_models/voice_clone/voice1.wav`.

STT model: Faster-Whisper large-v3 (Vietnamese), cached on `/hf_cache` volume.

The agent uses forkserver multiprocessing — entrypoint and prewarm must be module-level functions (not closures). Models are loaded in subprocess via `proc.userdata`, not in the parent `@modal.enter()`.

## Gotchas

- `backend/src/app.ts` forces IPv4 globally via `undici` dispatcher and `dns.setDefaultResultOrder('ipv4first')` — required for Gemini SDK on Windows; don't remove
- `npm run dev` also sets `--dns-result-order=ipv4first` via `cross-env`
- F5-TTS / local STT services are optional; VoiceAgent now routes through Modal cloud pipeline by default
- Safari sends `audio/mp4` — AudioService transcodes to PCM WAV before sending to pipeline
- The Supabase `temp-audio-sessions` bucket has a 1-hour TTL policy; audio is ephemeral by design
- DatabaseService gracefully handles missing tables (PGRST205/204) for pre-migration environments
- Modal image needs `nvidia-cublas-cu12` for ctranslate2 (Whisper) and `LD_LIBRARY_PATH` pointing to both nvidia/cu13 (torch JIT) and nvidia/cublas dirs
- LiveKit agent subprocess needs ~30s and ~4.5GB to initialize (Whisper + Valtec TTS); `num_idle_processes=1` and `initialize_process_timeout=120` are set to prevent OOM/timeout
- `livekit_plugins/` is copied into the Modal image via `.add_local_dir()` — changes require redeploy

## Quy tắc bắt buộc cho tất cả AI Agent

1. **Test thủ công sau mỗi task:** Khi hoàn tất bất kỳ task nào có thay đổi kiến trúc hoặc code, PHẢI cung cấp hướng dẫn test thủ công cho user, bao gồm:
   - Lệnh cụ thể cần chạy (terminal commands)
   - Kết quả mong đợi (expected output)
   - Cách xác nhận thành công / thất bại

2. **Đọc STATE.md đầu session:** Để biết agent trước làm tới đâu, tránh làm lại hoặc xung đột.

3. **Ghi handoff vào STATE.md cuối session:** Tóm tắt những gì vừa làm, cảnh báo lỗi nếu có, để agent tiếp theo nắm bắt.

4. **Thông báo hoàn thành:** Sau mỗi task, chạy `python .ai/notify.py "Task hoan thanh!"` (⚠️ NGOẠI TRỪ AI GEMINI: Gemini không cần thực hiện lệnh này).
