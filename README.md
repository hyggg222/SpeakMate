# SpeakMate: AI-Powered English Conversation Platform

[![Live Demo](https://img.shields.io/badge/Demo-speak--mate-brightgreen?style=flat-square)](https://speak-mate-frontend-4q8c.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

SpeakMate is a full-stack AI-driven web application designed to help learners practice spoken English through low-pressure, realistic scenarios with multi-agent dynamic AI feedback.

Live Demo: [https://speak-mate-frontend-4q8c.vercel.app](https://speak-mate-frontend-4q8c.vercel.app)

---
## Screenshots
First login
<img width="1917" height="1078" alt="image" src="https://github.com/user-attachments/assets/5680f0a6-3dc1-41f1-8863-1b1bfd0623e2" />

Main Page
<img width="1917" height="1078" alt="image" src="https://github.com/user-attachments/assets/2ef1ef22-162c-4d01-bcab-ad239d0d671d" />

Scenario Build
<img width="1917" height="1078" alt="image" src="https://github.com/user-attachments/assets/9562b033-35f2-4ba1-a89a-9d1a8ae5897c" />

---

## Key Features

- **Scenario-Based Roleplay**: Practice spoken English with dynamic AI personas across tailored scenarios (job interviews, tech discussions, debates).
- **Multi-Dimensional Assessment**: Receive automated evaluation across fluency, content depth, and delivery with evidence-based feedback.
- **Story Bank**: Curate and structure personal experiences into STAR-format narratives to retrieve and practice during speaking sessions.
- **Mentor Ni Chat**: Interact with an on-demand AI coach for reflection, strategy guidance, and personalized real-world communication challenges.
- **Sub-Second Voice Turnaround**: Converse naturally with ~1s voice latency powered by WebRTC streaming and serverless GPU pipelines.

---

## Awards and Recognitions

- **Top 3** — **AI Young Guru 2026** (Organized by FPT University)
  - Placed in the top 3 nationwide out of more than 15,000 participating teams (over 26,000 contestants representing 1,800 educational institutions across 34 provinces).
- **Runner-up** — **Vietnam AI Contest** (Organized by VietNamNet and VLAB Innovation)
  - Awarded Runner-up in the nationwide competition featuring thousands of student candidates and hundreds of competing teams from across Vietnam.

---

## System Architecture

SpeakMate is structured as a scalable monorepo comprising:

- **Frontend**: Next.js (App Router), React 19, Tailwind CSS, Framer Motion, LiveKit Web SDK / Gemini Direct audio worklets.
- **Backend Service (Control Plane)**: Node.js, Express, TypeScript, Zod, Supabase (PostgreSQL + Auth + Storage).
- **AI Engine (Data Plane)**: Modal Cloud Python worker pipeline (PhoWhisper STT, NeuTTS, Gemini 2.0/2.5 Flash LLM).
- **Shared Contracts**: `@speakmate/contracts` package sharing Zod schemas and TypeScript interfaces across frontend and backend.

```text
               ┌──────────────────────────────────────────────┐
               │              SpeakMate Frontend              │
               │            (Next.js App Router)              │
               └──────────────────────┬───────────────────────┘
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
            ┌─────────────────────────┐  ┌──────────────────┐
            │ Backend Service (Express│  │ Gemini Direct /  │
            │      Control Plane)     │  │ LiveKit WebSockets│
            └────────────┬────────────┘  └─────────┬────────┘
                         │                         │
                         ▼                         ▼
            ┌─────────────────────────┐  ┌──────────────────┐
            │   Supabase DB & Storage │  │  Modal Cloud AI  │
            └─────────────────────────┘  └──────────────────┘
```

---

## Repository Structure

```text
SpeakMate/
├── ai/                       # Modal Cloud Python AI worker code and pipelines
├── backend/                  # Node.js/Express API control plane server
│   ├── src/
│   │   ├── agents/           # Domain agents (Brain, Voice, Analyst, Mentor, StoryBank)
│   │   ├── controllers/      # Route controllers and orchestration
│   │   ├── middleware/       # Auth, rate limiting, and error handling
│   │   ├── routes/           # Express API endpoints
│   │   └── services/         # Storage, audio, and Gemini SDK integration
├── frontend/                 # Next.js web application
│   ├── src/
│   │   ├── app/              # App Router pages (/practice, /stories, /evaluation)
│   │   ├── components/       # UI components and practice room modules
│   │   ├── context/          # React contexts (Language, Auth)
│   │   └── hooks/            # Custom hooks (Audio recording, LiveKit, Gemini Direct)
├── packages/
│   └── contracts/            # Shared TypeScript contracts and schemas
├── docs/                     # Architecture, presentation, and product specifications
├── scripts/                  # Development and utility scripts
└── package.json              # Monorepo root workspace configuration
```

---

## Quick Start and Development

### Prerequisites
- **Node.js**: v18 or later
- **npm**: v9 or later
- **FFmpeg**: Installed and available in PATH (required for server-side audio processing)

### Installation and Setup

1. **Install dependencies across monorepo**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   - Backend configuration:
     ```bash
     cp backend/.env.example backend/.env
     ```
   - Frontend configuration:
     ```bash
     cp frontend/.env.example frontend/.env.local
     ```
   - (Optional) Refer to root `.env.example` for monorepo-wide reference.

3. **Build Shared Packages**:
   ```bash
   npm run build --workspace=@speakmate/contracts
   ```

4. **Start Development Servers**:
   - Run both frontend and backend concurrently:
     ```bash
     npm run dev
     ```
   - Or start individually:
     - Frontend: `npm run dev --workspace=frontend` (Runs on `http://localhost:3000`)
     - Backend: `npm run dev --workspace=backend` (Runs on `http://localhost:3001`)

---

## Build and Verification

To verify full build integrity:

```bash
# Build contracts
npm run build --workspace=@speakmate/contracts

# Build backend
npm run build --workspace=backend

# Build frontend
npm run build --workspace=frontend
```

---

## License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.
