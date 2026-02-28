---
project_name: 'SpeakMate'
user_name: 'huy'
date: '2026-01-31'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
optimized_for_llm: true
---

# Project Context: SpeakMate

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Core Framework:**
- **Frontend/Fullstack:** Next.js 14+ (App Router)
- **Language:** TypeScript 5.x (Strict Mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand (Modular Stores)

**AI & Speech:**
- **AI Model:** Google Gemini 1.5 Pro/Flash (via Google Generative AI SDK)
- **Streaming:** Vercel AI SDK (Server-Sent Events)
- **Audio Input:** Native MediaRecorder API (No client-side conversion)
- **Audio Processing:** Gemini Multimodal (Direct Audio Input)

**Backend & Data:**
- **Database:** Supabase (PostgreSQL)
- **ORM:** Drizzle ORM (Type-safe)
- **Auth:** Clerk (Next.js Middleware Integration)
- **Storage:** Supabase Storage (Bucket Lifecycle Rules: 1h TTL)

---

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)
- **Strict Typing:** No `any`. Define strict interfaces for AI responses and data models.
- **Async/Await:** All Server Actions and external calls must be async.
- **Error Handling:** Use custom `AppError` class. Return standardized `{ data, error, success }` objects from Server Actions.

### Framework-Specific Rules (Next.js & AI)
- **Server Actions:** Use `safeAction` wrapper for all mutations. NEVER expose raw database or AI errors to the client.
- **Feature-based Structure:** Code MUST be organized in `src/features/[feature-name]`. Do not pollute the global `components` folder.
- **AI Streaming:** Use `useAIStream` hook (custom wrapper around Vercel AI SDK) to handle UI states and optimistic updates.
- **Client Components:** Use `'use client'` sparingly. Keep business logic on the Server side (RSC) where possible.

### Testing Rules
- **Unit Testing:** Vitest for utility logic (scoring, prompt formatting, state logic).
- **E2E Testing:** Playwright for critical user journeys (e.g., Safe Mode conversation loop).
- **Mocking:** ALWAYS mock Gemini API calls in test suites to prevent unexpected costs.

### Code Quality & Style Rules
- **Naming Conventions:**
  - Database/SQL: `snake_case` (tables and columns).
  - Variables/Functions: `camelCase`.
  - React Components: `PascalCase`.
  - Utility Files: `kebab-case`.
- **Structure:** Feature-based organization is mandatory for maintainability.

### Development Workflow Rules
- **Privacy First:** NEVER log raw audio data or PII in production.
- **Environment:** Use `.env.local` for secrets; commit `.env.example`.
- **Git Flow:** Use feature branches (e.g., `feat/audio-recorder`).

### Critical Don't-Miss Rules
- **Audio Leakage:** Ensure a fallback Cronjob scans Supabase Storage Buckets directly for files older than 1h that missed the TTL policy.
- **Mobile Safari:** Perform spike tests for `MediaRecorder` output formats (`audio/mp4` vs `audio/webm`) to ensure Gemini compatibility.
- **State Isolation:** Reset Zustand stores when unmounting Feature-specific components to prevent state pollution between different practice modes.
- **Latency Masking:** Always use Optimistic UI or "Thinking" animations immediately after the user releases the Mic button.
