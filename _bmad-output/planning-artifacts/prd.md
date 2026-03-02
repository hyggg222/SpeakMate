---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete', 'revision-build-ready']
inputDocuments: ['_bmad-output/analysis/brainstorming-session-2026-01-19.md', '_bmad-output/project-context.md']
classification:
  projectType: 'web_app'
  domain: 'edtech'
  complexity: 'high'
  projectContext: 'greenfield'
  discussionNotes: 'Complexity raised to HIGH due to Real-time AI Audio Analysis, Latency requirements (<1s), and Student Privacy (COPPA) compliance.'
documentCounts:
  briefCount: 1
  researchCount: 0
  brainstormingCount: 1
  projectDocsCount: 0
---

# Product Requirements Document (PRD) - SpeakMate

**Project:** SpeakMate
**Status:** BUILD-READY
**Version:** 1.2
**Date:** 2026-01-19

## Executive Summary
SpeakMate is an AI-first EdTech platform designed to help Vietnamese high school students and young learners build confidence in communication, presentation, and critical thinking. By leveraging voice interaction with Gemini-powered AI mentors, SpeakMate provides a safe yet challenging environment for students to practice social interactions (Safe Mode), formal presentations (Stage Mode), and logical debates (Debate Mode). The platform differentiates itself through its "Boomerang Loop"—encouraging users to apply skills in the real world before returning to the app for debriefing and continuous improvement.

## 1. Success Criteria

### User Success
- **"Aha!" Moment:** User completes a **3-turn conversation session** (3 User inputs + 3 AI replies) in *Safe Mode* without using "Undo" more than twice.
- **Confidence Boost:** User completes their first *Real-world Secret Quest* and reports a positive experience.
- **Measurable Progress:** Rubric scores (Clarity/Confidence) increase by an average of 1.5 points after 1 week of consistent practice.

### Business Success
- **MVP Adoption:** Reach 500 Weekly Active Users (WAU) within the first 2 months in the target market.
- **Retention:** Achieve **Day 1 Retention > 30%** (EdTech MVP standard).
- **Feedback Quality:** 80% of users rate *Actionable Feedback Cards* as "Helpful" or "Very Helpful".

### Technical Success
- **Latency:** Push-to-Talk processing time **< 3s** (User stop-to-AI start).
- **Audio Accuracy:** Word Error Rate (WER) **< 20%** for Vietnamese regional accents, prioritizing *Intent Recognition*.
- **Debate Logic:** AI Logic Engine achieves **> 80% accuracy** in identifying logical fallacies.
- **Safety:** 100% block rate for toxic content unsuitable for minors.

## 2. Product Scope

### MVP-0 (Core Value - "The Safe Place")
**Focus:** Prove the core value of "Psychological Safety" in communication with minimal technical risk.
- **Single Mode:** **Safe Mode** (Conversation Practice) only.
- **Core Features:** 
    - **Push-to-Talk Voice Interaction:** Record chunks of 10-30s -> Upload -> AI Reply.
    - Basic "Dual Attitude" Mentor (Friendly Persona only).
    - **Fixed Rubric Feedback:** Score on Clarity, Structure, Confidence, Grammar, Engagement.
    - **Actionable Feedback Cards:** MVP Raise (Praise), Level Up Fix (Correction), Next Goal (Guidance).
    - **Guest Mode Only:** No Login required. **Data Persistence:** LocalStorage only (cleared on cache wipe).
    - Web App (Mobile Responsive).

### MVP-1 (Viable Product - "The Growth Engine")
**Focus:** Complete the learning loop and add retention mechanisms.
- **Additional Modes:** **Stage Mode** (Presentation) & **Debate Mode** (Critical Thinking).
- **Advanced Features:** 
    - **User Account System:** Social Login (Google) + Cloud Database Tracking.
    - **Shadowing:** Integrated audio suggestions.
    - **Real-world Secret Quests:** The "Boomerang Loop".
    - **Analytics:** Full tracking of user behaviors.

### Phased Roadmap
- **Phase 2 (Growth):** 
    - **Real-time Voice:** Upgrade to WebSocket streaming for < 1s latency.
    - Learning Path personalization, Teacher Dashboard, Achievement System (Streaks/Badges).
- **Phase 3 (Expansion):** Video Agent (Non-verbal analysis), Native Mobile Apps, Peer-to-Peer practice.

## 3. User Journeys

### 3.1 The Struggler (Minh - Shy Student)
- **Pain:** Fear of public speaking and stammering.
- **Journey:** Minh practices his school presentation in **Stage Mode**. AI Mentor identifies excessive filler words ("à", "ờ"). Minh receives a Feedback Card focused solely on reducing filler words. He practices again and feels noticeably more fluent.

### 3.2 The Gamer (Hùng - Competitive Thinker)
- **Pain:** Poor logical structure in arguments.
- **Journey:** Hùng engages in **Debate Mode** regarding school rules. AI Opponent counters his logical fallacies. Hùng learns to use the A.R.E. (Assertion - Reasoning - Evidence) structure to "win" against the AI and shares his victory screen with friends.

### 3.3 The Introvert (Lan - Socially Anxious)
- **Pain:** Difficulty initiating and sustaining small talk.
- **Journey:** Lan practices a "Joining a Club" scenario in **Safe Mode**. AI Buddy nudges her to ask open-ended questions. Lan practices the same turn 3 times until natural. She receives a Secret Quest to ask a real classmate about their book.

## 4. Domain & Project-Type Requirements

### EdTech & Privacy Constraints
- **Target Audience:** Explicitly **13+ users** to manage consent simply.
- **Zero-PII Policy:** 
    - **Temporary Storage + TTL:** Raw user audio is stored in a temporary bucket with a strict **1-hour TTL policy** (implemented via Storage Bucket Lifecycle Rules).
    - **Transcript Sanitization:** Automatically detect and redact PII (names, addresses, phone numbers) from text transcripts before long-term storage.
- **AI Safety:** Strict safety guardrails on Gemini API to filter toxic input and output.

### Web Application Specifics
- **Compatibility:** Optimized for latest **Chrome and Safari (Mobile)**.
- **Design:** **Mobile-First Responsive Design** with large touch targets for voice controls.
- **Connectivity:** Robust handling of upload retries for Push-to-Talk files.

## 5. Innovation & Novel Patterns

### Competitive/Alternative Analysis
- **vs. Elsa Speak:** SpeakMate focuses on **Communication Logic & Confidence** (Macro-skills), whereas Elsa focuses on **Pronunciation Precision** (Micro-skills). We don't grade phonemes; we grade thoughts.
- **vs. Duolingo:** SpeakMate is **Open-ended Interaction**, whereas Duolingo is **Gamified Translation** (Multiple choice/Fill in blank). We are for output practice, not input memorization.
- **vs. ChatGPT Voice:** SpeakMate provides **Structured Pedagogy** (Rubrics, Modes, Quests), whereas ChatGPT is a **General Assistant** requiring user prompting skills.

### Detected Innovation Areas
- **AI Opponent (Debate Mode):** Integrating critical thinking (fallacy detection) into language practice.
- **The Boomerang Loop:** Strategic "Anti-Retention" that values real-world interaction over total app screen time.
- **Actionable Feedback:** Replacing static reports with tiered, immediate "Fix-it" challenges.

## 6. Functional Requirements

### 6.1 Authentication & Interaction
- **FR1:** Guest users can access a limited "Safe Mode" preview (no history). Data stored in LocalStorage only.
- **FR2:** Social Login (Google) required for full mode access and progress saving (MVP-1).
- **FR3:** Multimodal Context Builder (Upload PDF/Audio/Text to generate custom scenarios).
- **FR4:** **Push-to-Talk Voice Interaction:** User holds button to record -> releases to send -> AI processes -> AI replies audio/text (MVP-0).

### 6.2 Practice Modes
- **FR5:** **Safe Mode Redo:** Delete the last turn and speak again.
- **FR6:** **Stage Mode Monologue:** Continuous recording with visual timing cues. **Note:** Soft limit of 10 minutes per session.
- **FR7:** **Debate Mode A.R.E:** AI uses structured logic to rebut user points.
- **FR8:** **Shadowing:** Integrated "Listen to Suggestion" button in Safe Mode.

### 6.3 Analysis & Progress
- **FR9:** Post-session **Fallacy Detector** for Debate Mode. Includes a "Report Bad Analysis" button for continuous AI improvement.
- **FR10:** **Actionable Feedback Cards:**
    - **MVP Raise (Praise):** Highlight the best part of the speech.
    - **Level Up Fix (Correction):** Identify one critical error to fix immediately.
    - **Next Goal (Guidance):** Specific objective for the next session.
- **FR11:** **Fixed Rubric Scoring:** AI evaluates based on **Clarity, Structure, Confidence, Grammar, Engagement**.
- **FR12:** **Secret Quests:** System suggests real-world tasks based on session performance.
- **FR13:** **Usage Analytics:** System tracks key events (session_start, session_complete, quest_completed) for product improvement.

## 7. Non-Functional Requirements

### Performance & Scalability
- **NFR1:** Push-to-Talk response time **< 3s** (Upload + Process + Reply).
- **NFR2:** Initial page load (FCP) **< 2.5s** on mobile 4G.
- **NFR3:** Infrastructure supports **50 Concurrent Users** for voice processing.

### Security & Accessibility
- **NFR4:** Data encrypted via TLS 1.3.
- **NFR5:** Mobile support down to **320px** width.
- **NFR6:** Contrast and UI accessibility meet **WCAG 2.1 Level AA**.

## 8. Risks & Mitigation

### Technical Risks
- **Latency Perception:** Even with Push-to-Talk, waiting 3s+ for a reply breaks flow. 
    - *Mitigation:* Show a "Thinking..." animation or play a filler sound ("Hmm, let me see...") immediately to mask latency.
- **Audio Upload Failures:** Poor network causing upload drops.
    - *Mitigation:* Implement client-side retry logic and chunked uploads for larger files (Stage Mode).

### Product Risks
- **Boredom:** Users may find Push-to-Talk less engaging than real conversation.
    - *Mitigation:* Focus heavily on the *quality* of the AI's response (personality, humor) to make the wait worth it.
- **Feedback Overload:** Users overwhelmed by 5 rubric scores.
    - *Mitigation:* Only show the detailed 5-rubric breakdown in the "Details" tab; keep the main view focused on the 3 Feedback Cards.