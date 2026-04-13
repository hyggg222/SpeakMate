# SpeakMate: LiveKit Integration — Final Status

Last updated: 2026-04-12

## Overview

Converted the voice conversation system from HTTP round-trip (4-6s latency) to WebRTC real-time streaming via LiveKit Agent Framework (target < 1s). Both modes coexist via feature flag `NEXT_PUBLIC_USE_LIVEKIT`.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  MODAL CLOUD (GPU L4)  —  optimindss3 workspace        │
│                                                         │
│  LiveKitAgentWorker (Python, long-running)              │
│  ├── Faster-Whisper v3-Large (in-process STT)           │
│  ├── Gemini 2.0 Flash (API call via livekit-plugins)    │
│  ├── Valtec ZeroShotTTS (in-process TTS, voice clone)   │
│  └── WebSocket ←→ LiveKit Cloud SFU                     │
│                                                         │
│  VoicePipeline (HTTP fallback, same GPU)                │
│  ├── POST /interact  (STT → LLM → TTS, single call)    │
│  ├── POST /transcribe                                   │
│  └── POST /generate                                     │
└───────────────────────┬─────────────────────────────────┘
                        │ WebRTC media relay
┌───────────────────────┴─────────────────────────────────┐
│  LIVEKIT CLOUD (SFU)                                    │
│  wss://speakmate-yu7nfde8.livekit.cloud                 │
│  Free tier: 5000 connection-min/month                   │
└───────────────────────┬─────────────────────────────────┘
                        │ WebRTC (UDP)
┌───────────────────────┴─────────────────────────────────┐
│  EXPRESS BACKEND (Node.js :3001)                        │
│  POST /api/practice/livekit-session                     │
│  → Generates JWT (room + identity + metadata)           │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP
┌───────────────────────┴─────────────────────────────────┐
│  NEXT.JS FRONTEND (:3000)                               │
│  useLiveKitRoom hook: mic publish + audio subscribe     │
│  DataReceived channel: transcript for history UI        │
└─────────────────────────────────────────────────────────┘
```

## Startup Checklist

Three terminals:

```bash
# Terminal 1: LiveKit Agent (Modal Cloud GPU)
modal run modal_pipeline.py::LiveKitAgentWorker.run
# Expected: "process initialized" (~30s) → "registered worker"

# Terminal 2: Backend API
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
# Requires NEXT_PUBLIC_USE_LIVEKIT=true in .env.local
```

## Modal Cloud Setup (workspace: optimindss3)

### Secrets
| Name | Keys |
|------|------|
| `gemini-api-key` | `GEMINI_API_KEY` |
| `livekit-keys` | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |

### Volumes
| Name | Mount | Contents |
|------|-------|----------|
| `hf_cache` | `/hf_cache` | Whisper model cache (auto-downloaded) |
| `valtec_models` | `/valtec_models` | `/zeroshot-hf/G_175000.pth`, `/zeroshot-hf/config.json` (auto-downloaded from HF), `/voice_clone/voice1.wav` (uploaded manually) |

### Endpoints (deployed)
| Class | URL |
|-------|-----|
| VoicePipeline.interact | `https://optimindss3--speakmate-pipeline-v2-voicepipeline-interact.modal.run` |
| VoicePipeline.transcribe | `https://optimindss3--speakmate-pipeline-v2-voicepipeline-transcribe.modal.run` |
| VoicePipeline.generate | `https://optimindss3--speakmate-pipeline-v2-voicepipeline-generate.modal.run` |
| LiveKitAgentWorker | No HTTP endpoint — connects via WebSocket to LiveKit Cloud SFU |

### Image Dependencies
- Python 3.11, CUDA 13.0 (Modal built-in)
- `torch`, `torchaudio`, `faster-whisper`, `google-genai`, `huggingface_hub`
- `livekit-agents`, `livekit-plugins-google`, `livekit-plugins-silero`
- `nvidia-cublas-cu12` (for ctranslate2/faster-whisper libcublas.so.12)
- `valtec-tts` git clone + custom `livekit_plugins/` package
- `LD_LIBRARY_PATH`: nvidia/cu13 (torch JIT nvrtc) + nvidia/cublas (ctranslate2)

## Files Added/Modified for LiveKit

### New files
| File | Purpose |
|------|---------|
| `livekit_plugins/__init__.py` | Package init |
| `livekit_plugins/whisper_stt.py` | Custom LiveKit STT plugin wrapping Faster-Whisper |
| `livekit_plugins/valtec_tts.py` | Custom LiveKit TTS plugin wrapping Valtec ZeroShotTTS |
| `frontend/src/hooks/useLiveKitRoom.ts` | React hook: Room connect/disconnect, mic toggle, data channel |
| `frontend/src/lib/featureFlags.ts` | `FEATURE_FLAGS.useLiveKit` toggle |
| `backend/src/services/livekit.service.ts` | `LiveKitService.generateToken()` — JWT with room + metadata |

### Modified files
| File | Change |
|------|--------|
| `modal_pipeline.py` | Added `LiveKitAgentWorker` class, `_download_zeroshot_model()`, `_livekit_entrypoint()`, `_livekit_prewarm()` |
| `backend/src/config/env.ts` | Added `livekitUrl`, `livekitApiKey`, `livekitApiSecret`; defaults point to `optimindss3` |
| `backend/src/controllers/practice.controller.ts` | Added `createLivekitSession()` method |
| `backend/src/routes/practice.routes.ts` | Added `POST /livekit-session` route |
| `backend/src/validators/practice.validators.ts` | Added `livekitSessionSchema` |
| `frontend/src/lib/apiClient.ts` | Added `createLivekitSession()` |
| `frontend/src/app/practice/conversation/page.tsx` | Conditional LiveKit/HTTP rendering |

### Untouched (evaluation + HTTP fallback)
- `backend/src/agents/analyst.agent.ts` — uses text transcript only, no audio dependency
- `backend/src/agents/voice.agent.ts` — HTTP fallback mode
- `frontend/src/hooks/useAudioRecorder.ts` — HTTP fallback mode
- `frontend/src/app/evaluation/**` — unchanged, history from data channel works the same

## Bugs Fixed During Integration

### 1. SynthesizerZeroShot Shape Mismatch (Critical)
**Problem:** Custom `G.pth` on Modal volume was trained with older Valtec TTS code. Current code's `GeneratorAdaIN.conv_pre` concatenates `initial_channel + gin_channels` but checkpoint was trained without concatenation. 12 tensor size mismatches.

**Fix:** Replaced explicit volume paths with HuggingFace auto-download. `_download_zeroshot_model()` downloads `G_175000.pth` + `config.json` from `valtecAI-team/valtec-zeroshot-voice-cloning` Space, flattened into `/valtec_models/zeroshot-hf/`. These match the current code.

### 2. CUDA nvrtc Library Not Found
**Problem:** `libnvrtc-builtins.so.13.0` not found during torch JIT compilation after removing nvidia pip packages.

**Fix:** Set `LD_LIBRARY_PATH` to include `/usr/local/lib/python3.11/site-packages/nvidia/cu13/lib`.

### 3. libcublas.so.12 Not Found
**Problem:** `ctranslate2` (used by faster-whisper) requires `libcublas.so.12`. Modal's base image has CUDA 13 but ctranslate2 links against CUDA 12.

**Fix:** Added back `nvidia-cublas-cu12` pip package and added its lib path to `LD_LIBRARY_PATH`.

### 4. livekit_plugins Module Not Found
**Problem:** `livekit_plugins/` directory exists locally but wasn't in the Modal container.

**Fix:** Added `.add_local_dir("livekit_plugins", "/root/livekit_plugins", copy=True)` to image and `/root` to `PYTHONPATH`.

### 5. Can't Pickle Entrypoint Function
**Problem:** LiveKit agents v1.5 uses forkserver multiprocessing. Nested `entrypoint` function inside `run()` can't be pickled.

**Fix:** Refactored to module-level `_livekit_entrypoint()` and `_livekit_prewarm()`. Models loaded in subprocess via `proc.userdata` dict.

### 6. Subprocess Initialization Timeout
**Problem:** Default 10s timeout too short for loading Whisper (4GB) + Valtec TTS (500MB). Spawning 2 idle processes exceeded L4 GPU memory (4.5GB each).

**Fix:** `num_idle_processes=1` and `initialize_process_timeout=120`.

## Quality Fixes (2026-04-12)

### 7. STT — Double VAD Causing Incorrect Transcription
**Problem:** Audio was VAD-filtered twice: Silero VAD in VoicePipelineAgent segmented speech into 1-5s chunks, then `vad_filter=True` in Whisper applied a second VAD pass. This double-filtering cut word boundaries, especially for Vietnamese tonal speech.

Additionally, `whisper_stt.py` had a fragile 3-way buffer conversion with a wrong 16kHz sample rate fallback (LiveKit sends 48kHz) and incorrect normalization divisor (32768 instead of 32767).

**Fix:** Rewrote `whisper_stt.py` — direct `buffer.data` int16 read with correct `buffer.sample_rate`, `/ 32767.0` normalization, `vad_filter=False` since Silero already handles VAD.

### 8. LLM — Self-Identifying as User's Name
**Problem:** LiveKit system prompt used `"Tên người dùng: {user_name}"` which Gemini misinterpreted as "Your name is {user_name}" instead of "The user's name is {user_name}". The prompt also ignored `interviewerPersona` from the scenario, had no roleplay anchoring rules, and lacked starting turns context.

**Fix:** Rewrote both LiveKit and HTTP system prompts to match `voice.agent.ts` quality:
- Uses `interviewerPersona` from scenario metadata
- Unambiguous phrasing: `"Người bạn đang nói chuyện tên là: {user_name}"`
- Roleplay anchoring: "Tuân thủ nghiêm ngặt nhân vật. Không thoát vai."
- Includes `startingTurns` context and placeholder prohibition

### 9. TTS — Audio Distortion from Integer Overflow
**Problem:** `valtec_tts.py` converted float32→int16 without bounds checking: `(audio_np * 32767).astype(np.int16)`. If Valtec TTS output exceeded [-1.0, 1.0], multiplication produced values beyond int16 range → integer overflow → distorted/clipped audio.

**Fix:** Added `np.clip(-1.0, 1.0)` and peak normalization to 0.95 before int16 conversion. This prevents overflow and leaves headroom.

## Modal Workspace History

| Workspace | Status | Note |
|-----------|--------|------|
| `hyggg222` | Inactive | Original personal workspace |
| `optimindss1` | Billing limit reached | First team workspace |
| `optimindss2` | Billing limit reached | Second workspace |
| `optimindss3` | **Active** | Current deployment |

## How LiveKit Mode Works (Data Flow)

1. User opens `/practice/conversation` with `NEXT_PUBLIC_USE_LIVEKIT=true`
2. Frontend calls `POST /api/practice/livekit-session` with scenario + history
3. Backend generates JWT with metadata `{ scenario, history, userName }` and returns `{ token, roomName, livekitUrl }`
4. Frontend `useLiveKitRoom.connect(token, url)` → joins LiveKit room, publishes mic
5. LiveKit Cloud dispatches job to `LiveKitAgentWorker` on Modal
6. Agent subprocess reads `participant.metadata` → builds system prompt + chat context
7. Real-time loop: User audio (WebRTC) → Silero VAD → Faster-Whisper STT → Gemini LLM → Valtec TTS → audio back (WebRTC)
8. Transcript messages sent via data channel → frontend updates chat history
9. User clicks "Ket thuc" → `disconnect()` → navigate to `/evaluation/conversation`
10. Evaluation uses same `history` array → `AnalystAgent` scores via Gemini (unchanged)
