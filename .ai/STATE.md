---
last_updated: "2026-04-12T09:34:13"
current_agent: "Init"
---
# Project State
> Khởi tạo bởi hệ thống tự động hoá AI-SSoT

## Current Sprint
Sprint 2: LiveKit Real-Time Voice Integration

## Active Tasks
- [x] Modal pipeline với Valtec TTS (deployed optimindss3)
- [x] LiveKit agent: Silero VAD + Whisper + Gemini + Valtec
- [x] STT/LLM/TTS quality fixes (double VAD, system prompt, audio normalization)
- [x] Frontend LiveKit room reconnection stability
- [ ] Evaluation flow after LiveKit session

## Active Deployment
- Modal: ptimindss5 / speakmate-pipeline-v2
- LiveKit: speakmate-yu7nfde8.livekit.cloud

## Known Issues
- Safari MP4 transcoding artifacts
- Modal cold start ~30s

## Session Handoff Notes
<!-- Khi kết thúc session, ghi note cho agent tiếp theo ở đây -->
- [2026-04-12] Khởi tạo cấu trúc dự án SSoT theo Phase 0 MLOps proposal. Set up directory junction cho Claude logs thành công.
- [2026-04-12] (Antigravity): Fixed LiveKit connecting twice due to React StrictMode in `page.tsx`. Made Modal agent speak the first line from scenario instead of hardcoded text. Removed gradient UI effects due to lag.
- [2026-04-12] (Claude Code): Fixed 3 LiveKit agent bugs on Modal: (1) sys.exit(0) from typer/livekit-agents crashing container — monkey-patched sys.exit to no-op for code 0; (2) CUDA LD_LIBRARY_PATH cu12→cu13; (3) voice1.wav volume mount stale — redeployed. Also fixed STT double VAD, LLM system prompt self-identification, TTS float32→int16 overflow. Migrated to optimindss3 workspace. Agent running stably (~5GB RAM, no crashes).
- [2026-04-13] (Claude Code): Completed ManualBridgeAgent full pipeline (VAD→STT→LLM→TTS) confirmed working end-to-end. Critical bug fixed: livekit-python ≥0.12 wraps audio frames in AudioFrameEvent(.frame) instead of yielding AudioFrame directly — `async for event in audio_stream: frame = event.frame if hasattr(event, 'frame') else event`. Also fixed: rtc.AudioStream(track, sample_rate=16000, num_channels=1) for correct Silero VAD input format. Pipeline confirmed: sr=16000, VAD detects speech, Whisper transcribes Vietnamese, Gemini responds, Valtec TTS streams @ 24000Hz.
- [2026-04-13] (Claude Code): Completed ManualBridgeAgent Phase 2+3 in modal_pipeline.py. (1) Rewrote class to accept stt_model/tts_model/voice_ref/genai_client; (2) start() now does TTS warm-up to discover sample rate → creates AudioSource dynamically, then parses participant metadata for scenario/history/userName; (3) Implemented _process_user_turn() with full STT(librosa resample 48k→16k + Whisper)→LLM(Gemini)→data channel→TTS(Valtec stream 20ms frames) pipeline; (4) Removed dead duplicate closure block from _livekit_entrypoint (had broken `participant` NameError). Data channel format {type,speaker,line} matches useLiveKitRoom.ts. NEEDS DEPLOY: modal deploy modal_pipeline.py on optimindss3.
- [2026-04-13] (Claude Code): Frontend conversation room redesign complete. Created 4 new components under frontend/src/components/practice/: RobotAvatar.tsx (breathing/glow Framer Motion, speaking badge), WebcamPreview.tsx (getUserMedia PiP top-left, auto-hides if no camera), FloatingTranscripts.tsx (AnimatePresence popLayout push-up text, CSS mask-image gradient fade, dims 0.2 opacity when user speaking), WaveformVisualizer.tsx (35 bars teal→purple gradient, 100ms interval, AnimatePresence). Redesigned page.tsx: full-screen dark bg, absolute header, centered RobotAvatar, waveform below avatar, floating transcripts above bottom bar, bottom controls with redo/mic/end. All original logic (LiveKit, HTTP fallback, hints, redo) preserved intact.
