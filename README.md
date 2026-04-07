# SpeakMate: AI-Powered English Practice

SpeakMate is a full-stack web application designed to help Vietnamese students practice spoken English through interactive, low-pressure AI conversations. 

## 🏗️ Architecture

The project is built on a modern, professional TypeScript stack:
- **Frontend**: Next.js, Tailwind CSS v4, Framer Motion
- **Backend**: Node.js, Express, TypeScript
- **AI Integration**: `@google/genai` (Gemini 2.0 Flash)
- **Storage**: Supabase (Audio blobs with 1-hour Zero-PII TTL)

### Core AI Agents (`backend/src/agents/`)
The system follows a modular agent-based architecture with strong separation of concerns:
1. **BrainAgent**: Context Creator. Processes user requirements into a structured JSON scenario (persona, goals, starting turns) and provides dynamic scaffolding hints ("Ni ơi, cứu!").
2. **VoiceAgent**: Interactive Conversationalist. Handles low-latency audio/text interactions using Gemini's multi-modal capabilities.
3. **AnalystAgent**: Performance Evaluator. Conducts a deep analysis of the completed session transcript against a standard rubric to provide actionable feedback and scoring.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- FFmpeg (must be installed and available in your system PATH for audio transcoding)

### Environment Variables
Duplicate the `.env.example` in the `backend/` directory to `.env` and fill in your keys. Make sure you NEVER commit your `.env` file!

### Running the Application (Windows)
We provide batch scripts to manage local development:
1. Run `.\run-all.bat` from the root directory to start everything.
2. The frontend development server will be available at `http://localhost:3000`.
3. The backend API server runs on `http://localhost:3001`.

*Note: To safely clear ports and stop the servers, run `.\stop-all.bat`.*

## 📂 Project Structure
```text
SpeakMate/
├── backend/                  # Node.js/Express server
│   ├── src/
│   │   ├── agents/           # Core AI logic (Brain, Voice, Analyst)
│   │   ├── controllers/      # API Request Handlers (Practice flow orchestration)
│   │   ├── routes/           # Express Routers
│   │   ├── services/         # External integrations (Storage, Audio processing)
│   │   └── config/           # Environment validation
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Next.js App Router (Pages & Layouts)
│   │   ├── components/       # Reusable React components (UI, Dashboard)
│   │   ├── lib/              # API clients and utilities
│   │   └── hooks/            # Custom React hooks (e.g., Audio capture logic)
├── docs/                     # Technical documentation & architecture specs
└── README.md                 # Project documentation
```

## 🛡️ Best Practices Applied
- **SOLID & DRY**: Logic isolated by responsibility (Agents vs Services vs Controllers).
- **Documentation**: All core backend classes feature JSDoc/Google-style docstrings. Internal Vietnamese logic comments have been translated to professional English.
- **Error Handling**: Implemented robust `try-catch` structures with descriptive contextual logging across all orchestration layers.
