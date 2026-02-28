# Story 1.3: Audio Recording Infrastructure (Optimized)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to implement an optimized client-side audio recording utility using MediaRecorder,
so that user voice can be captured efficiently for AI processing.

## Acceptance Criteria

1. **Given** user permission to access the microphone
   **When** I hold the record button
   **Then** the `MediaRecorder` API starts capturing audio using `audio/webm;codecs=opus` for optimal compression
   **And** the audio is captured as a blob ready for upload
   **And** unit tests verify the recording states (start, stop, data available)

## Tasks / Subtasks

- [x] Implement Audio Recorder Hook (AC: 1)
  - [x] Create `src/features/safe-mode/hooks/useAudioRecorder.ts`
  - [x] Implement `startRecording`, `stopRecording` functions
  - [x] Handle microphone permission request
  - [x] Configure `MediaRecorder` with `mimeType: "audio/webm;codecs=opus"`
  - [x] Manage states: `isRecording`, `isPaused`, `recordingTime`
- [x] Implement Audio Blob Processing (AC: 1)
  - [x] Capture `ondataavailable` events
  - [x] Combine chunks into a single `Blob` on stop
  - [x] Provide `getAudioBlob` or return Blob in `stopRecording` callback
- [x] Implement Audio Recorder Component (UI Integration) (AC: 1)
  - [x] Create `src/features/safe-mode/components/audio-recorder.tsx`
  - [x] Use `useAudioRecorder` hook
  - [x] Add a simple "Record" button (UI polish in next story)
  - [x] Visual indicator for recording state (Red dot/Text)
- [x] Unit Testing for Hook (AC: 1)
  - [x] Create `src/features/safe-mode/hooks/useAudioRecorder.test.ts`
  - [x] Mock `MediaRecorder` API (since it's not in JSDOM)
  - [x] Verify state transitions and method calls

## Dev Notes

- **Architecture Compliance:**
  - Feature-based structure: `src/features/safe-mode`.
  - No client-side heavy conversion (ffmpeg.wasm) - use native `MediaRecorder`.
  - **Constraint:** `audio/webm;codecs=opus` is preferred for Gemini. Fallback to `audio/mp4` for Safari if needed (check browser support).

- **Tech Stack:**
  - React Hooks (`useRef`, `useState`, `useCallback`)
  - Native Web APIs (`navigator.mediaDevices.getUserMedia`)

- **Testing:**
  - Need to mock `navigator.mediaDevices` and `window.MediaRecorder`.
  - Vitest environment is `jsdom`.

### Project Structure Notes

- Hook location: `src/features/safe-mode/hooks/useAudioRecorder.ts`
- Component location: `src/features/safe-mode/components/audio-recorder.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]

## Dev Agent Record

### Agent Model Used

Gemini Pro 1.5

### Debug Log References

### Completion Notes List
- Created `useAudioRecorder` hook with support for WebM Opus.
- Implemented state management for recording (time, status, blob).
- Developed `AudioRecorder` UI component with start/stop/pause controls.
- Added comprehensive unit tests with mocks for browser media APIs.
- Verified build and tests pass.
- **Code Review Fixes:**
  - Implemented `AppError` for standardized error handling.
  - Improved `mimeType` fallback strategy.
  - Added cleanup logic to prevent memory leaks.
  - Updated tests to verify blob output.

### File List
- src/features/safe-mode/hooks/useAudioRecorder.ts
- src/features/safe-mode/hooks/useAudioRecorder.test.ts
- src/features/safe-mode/components/audio-recorder.tsx
- src/lib/errors.ts (New)
