# SpeakMate: AI-Powered English Conversation Platform

SpeakMate is a full-stack AI-driven web application designed to help learners practice spoken English through low-pressure, realistic scenarios with multi-agent dynamic AI feedback.

---

## 🏗️ System Architecture

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

## 📁 Repository Structure

```text
SpeakMate/
├── ai/                       # Modal Cloud Python AI worker code & pipelines
├── backend/                  # Node.js/Express API control plane server
│   ├── src/
│   │   ├── agents/           # Domain agents (Brain, Voice, Analyst, Mentor, StoryBank)
│   │   ├── controllers/      # Route controllers & orchestration
│   │   ├── middleware/       # Auth, rate limiting & error handling
│   │   ├── routes/           # Express API endpoints
│   │   └── services/         # Storage, audio, & Gemini SDK integration
├── frontend/                 # Next.js web application
│   ├── src/
│   │   ├── app/              # App Router pages (/practice, /stories, /evaluation)
│   │   ├── components/       # UI components & practice room modules
│   │   ├── context/          # React contexts (Language, Auth)
│   │   └── hooks/            # Custom hooks (Audio recording, LiveKit, Gemini Direct)
├── packages/
│   └── contracts/            # Shared TypeScript contracts & schemas
├── docs/                     # Architecture & feature documentation
│   └── presentation/         # Pitch deck & presentation material
├── scripts/                  # Development & utility scripts
└── package.json              # Monorepo root workspace configuration
```

---

## 🚀 Quick Start & Development

### Prerequisites
- **Node.js**: v18 or later
- **npm**: v9 or later
- **FFmpeg**: Installed and available in PATH (required for server-side audio processing)

### Installation & Setup

1. **Install dependencies across monorepo**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   - Copy `.env.example` to `.env` inside `backend/`:
     ```bash
     cp backend/.env.example backend/.env
     ```
   - Copy `.env.local.example` (or set up required variables) in `frontend/`.

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

## 🛠️ Build & Verification

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

## 📄 License

Private & Proprietary - SpeakMate Team.
