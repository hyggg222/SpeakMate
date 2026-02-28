---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md', '_bmad-output/planning-artifacts/ux-design-specification.md']
---

# SpeakMate - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for SpeakMate, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Guest users can access a limited "Safe Mode" preview (no history). Data stored in LocalStorage only.
FR2: Social Login (Google) required for full mode access and progress saving (MVP-1).
FR3: Multimodal Context Builder (Upload PDF/Audio/Text to generate custom scenarios).
FR4: Push-to-Talk Voice Interaction: User holds button to record -> releases to send -> AI processes -> AI replies audio/text (MVP-0).
FR5: Safe Mode Redo: Delete the last turn and speak again.
FR6: Stage Mode Monologue: Continuous recording with visual timing cues. Note: Soft limit of 10 minutes per session.
FR7: Debate Mode A.R.E: AI uses structured logic to rebut user points.
FR8: Shadowing: Integrated "Listen to Suggestion" button in Safe Mode.
FR9: Post-session Fallacy Detector for Debate Mode. Includes a "Report Bad Analysis" button for continuous AI improvement.
FR10: Actionable Feedback Cards: MVP Raise (Praise), Level Up Fix (Correction), Next Goal (Guidance).
FR11: Fixed Rubric Scoring: AI evaluates based on Clarity, Structure, Confidence, Grammar, Engagement.
FR12: Secret Quests: System suggests real-world tasks based on session performance.
FR13: Usage Analytics: System tracks key events (session_start, session_complete, quest_completed) for product improvement.

### NonFunctional Requirements

NFR1: Push-to-Talk response time < 3s (Upload + Process + Reply).
NFR2: Initial page load (FCP) < 2.5s on mobile 4G.
NFR3: Infrastructure supports 50 Concurrent Users for voice processing.
NFR4: Data encrypted via TLS 1.3.
NFR5: Mobile support down to 320px width.
NFR6: Contrast and UI accessibility meet WCAG 2.1 Level AA.

### Additional Requirements

- **Starter Template:** Initialize project with `npm create t3-app@latest` (App Router, TypeScript, Tailwind, Drizzle, No Auth).
- **Tech Stack:** Next.js 14+ (App Router), Vercel AI SDK, Supabase (PostgreSQL), Clerk (Auth), Zustand (State), Shadcn/ui.
- **Audio Lifecycle:** Raw user audio stored in Supabase Storage with 1-hour TTL policy (Zero-PII).
- **AI Integration:** Gemini Multimodal for direct audio processing.
- **UX/UI:** Mobile-first responsive design, "Ni" Avatar integration, Living Transcript with streaming text.
- **Security:** Guest Mode data in LocalStorage, cleared on cache wipe.
- **UX Pattern:** "Ni" Scaffolding Hints (Pre-fetched).
- **UX Pattern:** Multi-state Mic Button (Idle, Recording, Processing).

### FR Coverage Map

FR1: Epic 1 - Guest Mode & LocalStorage.
FR2: Epic 3 - Social Login (Google/Clerk).
FR3: Epic 3 - Custom Scenarios (Multimodal Builder).
FR4: Epic 1 - Push-to-Talk (PTT) Interaction.
FR5: Epic 2 - Safe Mode Redo.
FR6: Epic 4 - Stage Mode (Presentation).
FR7: Epic 4 - Debate Mode (A.R.E Logic).
FR8: Epic 2 - Shadowing & Ni Hints.
FR9: Epic 4 - Fallacy Detector.
FR10: Epic 2 - Actionable Feedback Cards.
FR11: Epic 2 - Fixed Rubric Scoring.
FR12: Epic 5 - Secret Quests.
FR13: Epic 1 & 5 - Usage Analytics.

## Epic List

### Epic 1: Project Foundation & Core Voice Interaction (MVP-0)
### Epic 2: Safe Mode Experience & Feedback Loop
### Epic 3: User Authentication & Personalization (MVP-1)
### Epic 4: Advanced Practice Modes (Stage & Debate)
### Epic 5: The Boomerang Loop & Secret Quests

## Epic 1: Project Foundation & Core Voice Interaction (MVP-0)

### Story 1.1: Project Initialization with T3 Stack
As a Developer, I want to initialize the project using the customized T3 Stack, so that I have a type-safe, scalable foundation for SpeakMate.
**Acceptance Criteria:**
**Given** an empty project directory
**When** I run `npm create t3-app@latest` with App Router, Drizzle, Tailwind, and TypeScript
**Then** the project structure is created as per Architecture Decision Document
**And** the project builds successfully without errors

### Story 1.2: Basic UI Shell & Landing Page (Mobile-First)
As a Guest User, I want to see a clean, mobile-responsive landing page with an entry point to Safe Mode, so that I can easily start my practice session.
**Acceptance Criteria:**
**Given** a mobile device or browser
**When** I access the root URL
**Then** I see the SpeakMate branding and a "Bắt đầu ngay" (Guest Mode) button
**And** the layout is responsive down to 320px width

### Story 1.3: Audio Recording Infrastructure (Optimized)
As a Developer, I want to implement an optimized client-side audio recording utility using MediaRecorder, so that user voice can be captured efficiently for AI processing.
**Acceptance Criteria:**
**Given** user permission to access the microphone
**When** I hold the record button
**Then** the `MediaRecorder` API starts capturing audio using `audio/webm;codecs=opus` for optimal compression
**And** the audio is captured as a blob ready for upload

### Story 1.4: Push-to-Talk (PTT) Guest Mode Session with Mock/Real AI
As a Guest User, I want to record my voice by holding a button and receive a text response from Gemini, so that I can experience the core AI conversation loop.
**Acceptance Criteria:**
**Given** I am in Guest Mode
**When** I hold the Mic button, speak, and release
**Then** the audio is sent to the server and processed by Gemini Multimodal
**And** I see the AI's response text streamed on the screen (Living Transcript)
**And** unit tests use mock Gemini responses to verify UI state updates correctly

### Story 1.5: Zero-PII Audio Lifecycle (Storage Policy)
As a Security Officer, I want audio files to be stored with a strict automatic deletion policy in Supabase, so that student privacy is protected according to the Zero-PII policy.
**Acceptance Criteria:**
**Given** a successful audio upload to Supabase Storage
**When** the file is saved
**Then** it is placed in a bucket with a pre-configured 1-hour TTL policy

## Epic 2: Safe Mode Experience & Feedback Loop

### Story 2.1: Ni Avatar & Multi-state Mic UI
As a Guest User, I want to see the Ni Avatar and a visualizer on the Mic button, so that I feel accompanied and know when the system is listening or thinking.
**Acceptance Criteria:**
**Given** I am in the Practice Room
**When** I am recording, the Mic button shows a pulse animation
**And** when AI is processing, Ni shows a "thinking" animation

### Story 2.2: Scaffolding Hints (Ni ơi, cứu!)
As a Shy User, I want Ni to provide pre-fetched keywords/hints when I am stuck, so that I can continue the conversation without feeling anxious.
**Acceptance Criteria:**
**Given** I have been silent for > 5 seconds during my turn
**When** I tap the Ni Avatar or the "Cứu!" button
**Then** I see 3 suggested keywords or phrases related to the current topic

### Story 2.3: Safe Mode Redo (The Forgiving Interface)
As a Learner, I want to delete my last spoken turn and try again, so that I can perfect my expression without pressure.
**Acceptance Criteria:**
**Given** I have just finished a turn but haven't received AI feedback yet
**When** I click the "Nói lại" (Redo) button
**Then** my last transcript and audio are removed from the current session

### Story 2.4: Actionable Feedback Cards & Rubric Scoring
As a User, I want to receive a summary of my performance with Praise, Correction, and Goals, so that I know exactly how to improve in the next session.
**Acceptance Criteria:**
**Given** I have completed a conversation session (3+ turns)
**When** the session ends
**Then** Gemini analyzes the transcript based on the Fixed Rubric
**And** I see 3 Feedback Cards: MVP Raise, Level Up Fix, and Next Goal

### Story 2.5: Shadowing (Listen to Suggestion)
As a Learner, I want to listen to a high-quality audio example of an AI-suggested response, so that I can practice my intonation and pronunciation.
**Acceptance Criteria:**
**Given** a response has been generated by AI
**When** I click the "Nghe gợi ý" button
**Then** the system plays the audio version of a suggested response

## Epic 3: User Authentication & Personalization (MVP-1)

### Story 3.1: Social Authentication with Clerk
As a User, I want to sign in using my Google account, so that my practice history and progress are saved.
**Acceptance Criteria:**
**Given** the landing page. When I click "Đăng nhập với Google". Then I am redirected to Clerk.

### Story 3.2: User Dashboard & Progress Tracking
As a Registered User, I want to see my past sessions and rubric scores, so that I can visualize my improvement.
**Acceptance Criteria:**
**Given** I am logged in. When I access the Dashboard. Then I see my recent sessions and score charts.

### Story 3.3: Multimodal Context Builder (Custom Scenarios)
As a Pro User, I want to upload a PDF to create a custom practice scenario, so that I can practice for specific events.
**Acceptance Criteria:**
**Given** the "Tạo bối cảnh riêng" screen. When I upload a PDF. Then Gemini generates a tailored scenario.

## Epic 4: Advanced Practice Modes (Stage & Debate)

### Story 4.1: Stage Mode (Presentation Practice)
As a Student, I want to practice a continuous monologue with a timer, so that I can prepare for formal presentations.
**Acceptance Criteria:**
**Given** I select "Stage Mode". When I record. Then I see a timer and pacing cues.

### Story 4.2: Debate Mode (A.R.E Structure)
As a Competitive Learner, I want to engage in a debate where the AI challenges my logic, so that I can improve my critical thinking.
**Acceptance Criteria:**
**Given** I select "Debate Mode". When I argue. Then the AI rebuts using the A.R.E framework.

### Story 4.3: Fallacy Detector & Post-Debate Analysis
As a Debater, I want the system to identify logical fallacies in my arguments, so that I can learn to avoid them.
**Acceptance Criteria:**
**Given** a completed Debate session. When I view analysis. Then fallacies are highlighted.

## Epic 5: The Boomerang Loop & Secret Quests

### Story 5.1: Secret Quest Generator (The Boomerang)
As a User, I want to receive a real-world "Secret Quest" based on my performance, so that I can apply my skills in life.
**Acceptance Criteria:**
**Given** a session ends. When analysis is done. Then the system suggests a real-world task.

### Story 5.2: Quest Verification & Motivation System
As a User, I want to mark quests as completed and earn rewards, so that I stay motivated.
**Acceptance Criteria:**
**Given** an active quest. When I click "Completed". Then I earn XP and badges.

### Story 5.3: Usage Analytics & Product Improvement
As a Product Manager, I want to track user engagement events, so that I can improve the product.
**Acceptance Criteria:**
**Given** an interaction. When `session_complete` occurs. Then the event is logged to the database.
