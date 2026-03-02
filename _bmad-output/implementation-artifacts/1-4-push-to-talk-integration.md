# Story 1.4: Push-to-Talk (PTT) Guest Mode Session with Mock/Real AI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Guest User,
I want to record my voice by holding a button and receive a text response from Gemini,
so that I can experience the core AI conversation loop.

## Acceptance Criteria

1. **Given** I am in Guest Mode
   **When** I hold the Mic button, speak, and release
   **Then** the audio is sent to the server and processed by Gemini Multimodal
   **And** I see the AI's response text streamed on the screen (Living Transcript)
2. **Given** the audio upload completes
   **When** the AI is processing
   **Then** the UI shows a "Thinking" state
3. **Given** I am a developer
   **When** I run the tests
   **Then** unit tests use mock Gemini responses to verify UI state updates correctly
4. **Given** a successful session
   **When** the AI replies
   **Then** the session data is stored in `LocalStorage`

## Tasks / Subtasks

- [x] Implement Audio Upload Action (AC: 1)
  - [x] Create `src/features/safe-mode/actions/upload-audio.ts` (Server Action)
  - [x] Use `Supabase` Admin client to upload to `audio-bucket`
  - [x] Ensure filename is unique (uuid) and path is secure
- [x] Implement Gemini AI Processing Action (AC: 1)
  - [x] Create `src/features/safe-mode/actions/process-audio.ts` (Implemented as API Route `src/app/api/safe-mode/chat/route.ts` for Streaming support)
  - [x] Integrate `google/generative-ai` SDK
  - [x] Configure Gemini 1.5 Flash/Pro with Multimodal prompt
  - [x] Input: Audio file URL/Path + Text Prompt ("You are Ni, a friendly English tutor...")
  - [x] Output: Stream text response using `vercel/ai` SDK
- [x] Create useSafeModeAI Hook (AC: 1, 2)
  - [x] Create `src/features/safe-mode/hooks/useSafeModeAI.ts`
  - [x] Use `useAIStream` pattern (or Vercel AI `useChat`/`useCompletion`)
  - [x] Handle states: `isUploading`, `isThinking`, `isStreaming`
  - [x] Integrate with `useAudioRecorder` to trigger upload on stop
- [x] Update AudioRecorder UI (AC: 1, 2)
  - [x] Display "Living Transcript" component to show AI response
  - [x] Show "Thinking..." animation when `isThinking` is true
- [x] Implement LocalStorage Persistence (AC: 4)
  - [x] Save chat history (User Audio URL + AI Text) to `localStorage`
- [x] Unit & Integration Tests (AC: 3)
  - [x] Mock `upload-audio.ts` and `process-audio.ts`
  - [x] Verify `useSafeModeAI` state transitions

## Dev Notes

- **Architecture Compliance:**
  - Server Actions used for Upload.
  - API Route used for Chat Streaming (standard Vercel AI SDK pattern).
  - Streaming via Vercel AI SDK (`ai` package).
  - Gemini Model: `gemini-1.5-flash` (faster for PTT).

- **Tech Stack:**
  - Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`)
  - Supabase Storage
  - LocalStorage (Client-side persistence for Guest)

- **Testing:**
  - Mocked Gemini API calls and Server Actions.
  - `vi.mock` for `ai/react` (v6 use `@ai-sdk/react`).

### Project Structure Notes

- Actions: `src/features/safe-mode/actions/`
- Hooks: `src/features/safe-mode/hooks/`
- UI: `src/features/safe-mode/components/practice-session.tsx`, `living-transcript.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]

## Dev Agent Record

### Agent Model Used

Gemini Pro 1.5

### Debug Log References

### Completion Notes List
- Implemented `uploadAudio` Server Action with Supabase Admin.
- Implemented `api/safe-mode/chat` Route Handler for Gemini streaming.
- Created `useSafeModeAI` hook connecting AudioRecorder to Chat.
- Built `LivingTranscript` and `PracticeSession` components.
- Added LocalStorage persistence for chat history.
- Added extensive tests for hooks, actions, and components.
- **Code Review Fixes:**
  - Fixed Security Vulnerability: Added strict regex validation for `audioPath` in `route.ts`.
  - Fixed Memory Efficiency: Added file size check (>10MB) in `route.ts` before buffer loading.
  - Improved Prompt: Added Vietnamese context to Gemini system prompt.
  - Verified `uploadAudio` uses `AppError` and tests pass.

### File List
- speakmate/src/env.js
- speakmate/.env
- speakmate/src/lib/supabase.ts
- speakmate/src/features/safe-mode/actions/upload-audio.ts
- speakmate/src/features/safe-mode/actions/upload-audio.test.ts
- speakmate/src/app/api/safe-mode/chat/route.ts
- speakmate/src/features/safe-mode/hooks/useSafeModeAI.ts
- speakmate/src/features/safe-mode/hooks/useSafeModeAI.test.ts
- speakmate/src/features/safe-mode/components/living-transcript.tsx
- speakmate/src/features/safe-mode/components/audio-recorder.tsx
- speakmate/src/features/safe-mode/components/practice-session.tsx
- speakmate/src/features/safe-mode/components/practice-session.test.tsx
- speakmate/src/app/practice/page.tsx
