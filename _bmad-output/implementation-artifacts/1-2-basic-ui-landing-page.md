# Story 1.2: Basic UI Shell & Landing Page (Mobile-First)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Guest User,
I want to see a clean, mobile-responsive landing page with an entry point to Safe Mode,
so that I can easily start my practice session.

## Acceptance Criteria

1. **Given** a mobile device or browser
   **When** I access the root URL
   **Then** I see the SpeakMate branding and a "Bắt đầu ngay" (Guest Mode) button
   **And** the layout is responsive down to 320px width
2. **Given** the visual foundation in UX specs
   **When** I view the landing page
   **Then** it uses Navy Blue (#1E3A8A) as primary and Airy/Minimalist styling
   **And** it uses Quicksand for headings and Inter for body text

## Tasks / Subtasks

- [x] Setup Font System (AC: 2)
  - [x] Install Quicksand and Inter fonts via `next/font/google`
  - [x] Configure Tailwind theme to use these fonts as default
- [x] Implement Root Layout UI Shell (AC: 1, 2)
  - [x] Create `src/components/shared/navbar.tsx` with branding
  - [x] Create `src/components/shared/footer.tsx`
  - [x] Update `src/app/layout.tsx` to include Navbar and Footer
- [x] Build Landing Page Content (AC: 1, 2)
  - [x] Implement Hero section in `src/app/page.tsx`
  - [x] Add "Bắt đầu ngay" CTA button using `shadcn/ui` Button component
  - [x] Apply "Airy" spacing and "Navy Blue" primary colors
- [x] Mobile-First Optimization (AC: 1)
  - [x] Ensure layout stacks correctly on mobile (< 768px)
  - [x] Verify large touch targets for the CTA button
- [x] Verify UI with Unit/Visual Tests (AC: 1)
  - [x] Create simple test to check for "Bắt đầu ngay" button existence
  - [x] Run `npm run build` to ensure no UI regressions

## Dev Notes

- **Architecture Compliance:**
  - Followed Feature-based pattern for project structure.
  - Used standard components in `src/components/shared`.
  - Updated `globals.css` with UX spec hex colors.

- **Tech Stack:**
  - Next.js 15+ App Router
  - Tailwind CSS 4.0
  - shadcn/ui
  - Vitest + RTL for UI verification

- **UX Specs:**
  - Implemented "Airy (Thoáng đãng)" vibe.
  - Implemented `rounded-2xl` for buttons.

### Project Structure Notes

- Navbar and Footer created in `src/components/shared`.
- Landing page logic in `src/app/page.tsx`.
- Component tests in `src/test/landing.test.tsx`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation]

## Dev Agent Record

### Agent Model Used

Gemini Pro 1.5

### Debug Log References

### Completion Notes List
- Set up Google Fonts (Inter, Quicksand) and integrated with Tailwind v4.
- Implemented responsive Root Layout with Navbar and Footer.
- Built Hero section with brand colors and CTA.
- Created Vitest component tests verifying presence of key UI elements.
- Verified build and tests pass.
- **Code Review Fixes:**
  - Improved SEO and OpenGraph metadata.
  - Fixed accessibility issues (aria-labels, Link components).
  - Improved code maintainability for background decorations.

### File List
- speakmate/src/app/layout.tsx (Modified)
- speakmate/src/app/page.tsx (Modified)
- speakmate/src/styles/globals.css (Modified)
- speakmate/src/components/shared/navbar.tsx (Modified)
- speakmate/src/components/shared/footer.tsx (Modified)
- speakmate/src/components/ui/button.tsx (New - via shadcn)
- speakmate/src/test/landing.test.tsx (Modified)
