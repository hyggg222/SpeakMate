# Story 1.1: Project Initialization with T3 Stack

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to initialize the project using the customized T3 Stack,
so that I have a type-safe, scalable foundation for SpeakMate.

## Acceptance Criteria

1. **Given** an empty project directory
   **When** I run `npm create t3-app@latest` with App Router, Drizzle, Tailwind, and TypeScript
   **Then** the project structure is created as per Architecture Decision Document
   **And** the project builds successfully without errors

## Tasks / Subtasks

- [x] Initialize T3 Stack Project (AC: 1)
  - [x] Run `npm create t3-app@latest` in the current directory (`speakmate`)
  - [x] Select options: App Router, TypeScript, Tailwind, Drizzle, No Auth (we will add Clerk later)
  - [x] Verify project structure matches Architecture Decision Document
- [x] Configure Environment Variables (AC: 1)
  - [x] Create `.env` file based on `.env.example`
  - [x] Add placeholders for CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, DATABASE_URL, GEMINI_API_KEY
- [x] Install Additional Dependencies (AC: 1)
  - [x] Install `shadcn-ui` CLI: `npx shadcn-ui@latest init`
  - [x] Install `lucide-react` for icons
- [x] Setup Directory Structure (AC: 1)
  - [x] Create `src/features` directory for feature-based architecture
  - [x] Create `src/components/shared` directory
  - [x] Create `src/lib` directory
- [x] Verify Build (AC: 1)
  - [x] Run `npm run build` to ensure no errors
  - [x] Run `npm run dev` and check landing page

## Dev Notes

- **Architecture Compliance:**
  - Strictly follow `architecture.md` for project structure.
  - Use `src/app` for App Router.
  - Use `src/features` for feature modules (Safe Mode, etc.).
  - Database provider is Supabase (PostgreSQL) via Drizzle.

- **Tech Stack:**
  - Framework: Next.js 14+ (App Router)
  - Language: TypeScript 5.x
  - Styling: Tailwind CSS + shadcn/ui
  - ORM: Drizzle
  - Auth: Clerk (Prepare for integration)

- **Testing:**
  - Ensure `vitest` is set up (standard in T3).

### Project Structure Notes

- Alignment with unified project structure: `src/features` pattern is critical.
- Ensure `tsconfig.json` paths are configured correctly (e.g., `@/*` alias).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]

## Dev Agent Record

### Agent Model Used

Gemini Pro 1.5

### Debug Log References

### Completion Notes List
- Initialized T3 stack with App Router, Drizzle, Tailwind, TypeScript.
- Configured Environment Variables in `.env`, `.env.example` and `src/env.js`.
- Installed `lucide-react` and initialized `shadcn-ui`.
- Created architecture directories: `src/features`, `src/components/shared`.
- Verified build success with `npm run build`.
- **Code Review Fixes:**
  - Installed `eslint`, `vitest`, `jest-dom`.
  - Configured `vitest.config.ts` and `src/test/setup.ts`.
  - Verified tests pass.

### File List
- speakmate/package.json
- speakmate/src/env.js
- speakmate/.env
- speakmate/.env.example
- speakmate/components.json
- speakmate/src/lib/utils.ts
- speakmate/src/styles/globals.css
- speakmate/src/features/
- speakmate/src/components/shared/
- speakmate/vitest.config.ts
- speakmate/src/test/setup.ts
- speakmate/src/test/sample.test.ts
