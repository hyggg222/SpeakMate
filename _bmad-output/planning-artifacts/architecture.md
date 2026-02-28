---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments: 
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'docs/product-brief.md'
  - '_bmad-output/project-context.md'
workflowType: 'architecture'
project_name: 'SpeakMate'
user_name: 'huy'
date: '2026-01-31'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Hệ thống cung cấp trải nghiệm luyện tập giao tiếp đa phương thức. Trọng tâm là việc ghi âm giọng nói (Push-to-Talk), chuyển đổi thành văn bản, phân tích qua Gemini Pro/Flash và trả về phản hồi kèm âm thanh/văn bản. Các chế độ Safe, Stage, và Debate yêu cầu các logic phân tích AI khác nhau (từ gợi ý hội thoại đến phát hiện lỗi ngụy biện).

**Non-Functional Requirements:**
- **Performance:** Phản hồi PTT < 3s. Tối ưu hóa FCP < 2.5s trên mobile 4G.
- **Privacy/Security:** Chính sách Zero-PII, xóa audio sau 1 giờ. Tuân thủ tiêu chuẩn an toàn AI của Gemini.
- **Accessibility:** Đạt chuẩn WCAG 2.1 Level AA.

**Scale & Complexity:**
- Primary domain: Web Application (Mobile-responsive)
- Complexity level: High
- Estimated architectural components: ~12-15 components chính (Mic, Transcript, Feedback, AI Coach, Analytics, v.v.)

### Technical Constraints & Dependencies
- Sử dụng Next.js 14+ (App Router) và Vercel AI SDK để streaming.
- Phụ thuộc chặt chẽ vào Google Gemini API.
- Yêu cầu xử lý audio ổn định trên Chrome và Safari (Mobile).

### Cross-Cutting Concerns Identified
- **Audio Lifecycle:** Từ lúc thu âm đến lúc xóa bỏ hoàn toàn để đảm bảo riêng tư.
- **Prompt Management:** Đảm bảo tính nhất quán của Mentor AI trên các chế độ khác nhau.
- **State Management:** Đồng bộ hóa giữa trạng thái ghi âm, streaming text và animation của nhân vật Ni.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack Web Application (Next.js) dựa trên phân tích yêu cầu dự án.

### Starter Options Considered

1.  **T3 Stack (`create-t3-app`):** Cung cấp Type-safety tuyệt đối, cấu trúc project cực kỳ chuẩn mực cho Next.js full-stack.
2.  **Next.js SaaS Starter (Vercel):** Tích hợp sẵn nhiều tính năng thương mại nhưng có thể dư thừa.
3.  **Shadcn/ui Next Template:** Tối giản, chỉ tập trung vào UI.

### Selected Starter: T3 Stack (Customized)

**Rationale for Selection:**
Phù hợp với độ phức tạp cao của SpeakMate. Đảm bảo tính nhất quán về kiểu dữ liệu (Type-safety) từ database đến giao diện, giúp giảm thiểu lỗi khi làm việc với AI agents. Cấu trúc linh hoạt cho phép tích hợp sâu Clerk và Vercel AI SDK.

**Initialization Command:**

```bash
npm create t3-app@latest
```
*(Lưu ý: Chọn App Router, TypeScript, Tailwind, Drizzle. Chọn Auth: None để cài đặt Clerk theo quy tắc dự án).*

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript 5.x với cấu hình strict mode, chạy trên Node.js runtime.

**Styling Solution:**
Tailwind CSS kết hợp với shadcn/ui cho hệ thống component.

**Build Tooling:**
Next.js Compiler (SWC) và Turbopack (cho phát triển).

**Testing Framework:**
Vitest được khuyến nghị cho unit tests.

**Code Organization:**
Feature-based structure hoặc `src/server`, `src/app` pattern chuẩn.

**Development Experience:**
Hỗ trợ Hot Module Replacement (HMR), Linting với ESLint, và Formatting với Prettier.

**Note:** Khởi tạo dự án bằng lệnh này sẽ là story triển khai đầu tiên.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Audio Processing Strategy (Gemini Multimodal vs Whisper)
- Audio Storage & Lifecycle (Supabase Storage + TTL)
- AI Streaming Protocol (SSE via Vercel AI SDK)

**Important Decisions (Shape Architecture):**
- Database Provider (Supabase PostgreSQL)
- Prompt Management Strategy (Git-versioned code)

**Deferred Decisions (Post-MVP):**
- Real-time WebSocket Audio Streaming (Phase 2)
- Video Analysis (Phase 3)

### Data Architecture

**Database Provider:**
- **Decision:** Supabase (PostgreSQL).
- **Rationale:** Tích hợp sẵn Storage, Auth và Database trong một hệ sinh thái, giảm độ phức tạp khi quản lý Audio Lifecycle.
- **ORM:** Drizzle ORM (Type-safe, Lightweight).

**Audio Storage:**
- **Decision:** Supabase Storage.
- **Policy:** Bucket Lifecycle Rule set to 1 hour (TTL).
- **Backup:** Cronjob dự phòng quét và xóa file cũ để đảm bảo cam kết Zero-PII.

### Authentication & Security

**Authentication:**
- **Decision:** Clerk.
- **Rationale:** DX tốt hơn NextAuth, hỗ trợ sẵn các UI component (SignIn, UserProfile) giúp tập trung vào logic sản phẩm. Dễ dàng tích hợp với Supabase qua JWT template.

### API & Communication Patterns

**AI Processing:**
- **Decision:** Gemini Multimodal (Direct Audio Input).
- **Rationale:** Giảm độ trễ (latency) do loại bỏ bước trung gian STT. Tận dụng khả năng phân tích ngữ điệu (tone/emotion) của Gemini 1.5 Pro/Flash.
- **Fallback:** Client gửi raw blob, Server xử lý chuẩn hóa định dạng nếu cần thiết để tránh lỗi tương thích iOS.

**Streaming:**
- **Decision:** Server-Sent Events (SSE) via Vercel AI SDK.
- **Rationale:** Chuẩn mực cho Next.js AI apps, hỗ trợ tốt UX "Living Transcript".

### Frontend Architecture

**State Management:**
- **Decision:** Zustand.
- **Rationale:** Nhẹ hơn Redux, phù hợp để quản lý các trạng thái audio/recorder phức tạp mà không gây re-render không cần thiết.

**Client-Side Audio:**
- **Decision:** Native `MediaRecorder` API.
- **Constraint:** Không convert nặng ở client để tiết kiệm pin/CPU mobile.

### Infrastructure & Deployment

**Hosting:**
- **Decision:** Vercel.
- **Rationale:** Tối ưu nhất cho Next.js App Router và Edge Functions (cần thiết cho AI streaming độ trễ thấp).

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming Conventions:**
- Table names: `snake_case` (ví dụ: `users`, `audio_sessions`).
- Column names: `snake_case` (ví dụ: `created_at`, `user_id`).
- Primary Keys: `id` (UUID hoặc Serial).

**Code Naming Conventions:**
- React Components: `PascalCase` (ví dụ: `AudioRecorder.tsx`).
- Variables & Functions: `camelCase` (ví dụ: `isRecording`, `startSession`).
- Constants: `UPPER_SNAKE_CASE` (ví dụ: `MAX_AUDIO_DURATION`).
- Files (Utilities/Config): `kebab-case` (ví dụ: `audio-utils.ts`).

### Structure Patterns

**Project Organization:**
- **Feature-based:** Tổ chức code theo tính năng thay vì layer.
- Thư mục chính: `src/features/[feature-name]/`.
- Mỗi feature chứa: `components/`, `hooks/`, `utils/`, và `[feature-name].store.ts` (Zustand).

**State Management:**
- Sử dụng **Modular Zustand Stores**. Mỗi tính năng có Store riêng để tránh phình to Global Store và tối ưu re-render.

### Format Patterns

**API Response Formats:**
- Thống nhất định dạng trả về: `{ data: T, error: string | null, success: boolean }`.
- Error code: Sử dụng hằng số chuẩn để Client có thể xử lý đa ngôn ngữ (i18n).

**Data Exchange Formats:**
- JSON field naming: `camelCase` (ngoại trừ database mapping).
- Date format: ISO 8601 strings.

### Process Patterns

**Error Handling Patterns:**
- Sử dụng class `AppError` tùy chỉnh để quản lý metadata của lỗi.
- **Next.js Server Actions:** Phải được wrap bởi một `safeAction` helper để đảm bảo tính serializable khi truyền lỗi về Client.

**Loading State Patterns:**
- Ưu tiên sử dụng **Skeletons** (từ shadcn/ui) cho lần load đầu.
- Trạng thái AI đang suy nghĩ: Sử dụng animation Ni Avatar (Thinking state) kèm text hóm hỉnh.

### Enforcement Guidelines
- Tất cả các AI Agent khi tham gia implementation **BẮT BUỘC** phải đọc file này và tuân thủ các quy tắc trên.
- Mọi vi phạm quy tắc đặt tên sẽ bị coi là lỗi logic và cần refactor ngay lập tức.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
SpeakMate/
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── drizzle.config.ts           # Cấu hình DB migrations
├── .env.local                  # Chứa CLERK_SECRET, SUPABASE_URL, GEMINI_API_KEY
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout với ClerkProvider
│   │   ├── page.tsx            # Landing page
│   │   ├── (auth)/             # Route group cho Clerk (Sign-in/up)
│   │   └── (main)/             # Route group cho ứng dụng chính
│   │       ├── dashboard/      # Màn hình tổng quan
│   │       └── practice/       # Màn hình luyện tập (Safe, Stage, Debate)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components chuẩn
│   │   └── shared/             # Components dùng chung toàn app (Navbar, Footer)
│   ├── features/               # QUAN TRỌNG: Tổ chức theo Feature-based
│   │   ├── safe-mode/
│   │   │   ├── components/     # AudioRecorder, LivingTranscript, NiAvatar
│   │   │   ├── hooks/          # useMediaRecorder, useSafeModeAI
│   │   │   ├── utils/          # audio-processing.ts
│   │   │   └── safe-mode.store.ts
│   │   ├── stage-mode/
│   │   ├── debate-mode/
│   │   └── feedback/           # Logic hiển thị Feedback Cards
│   ├── server/                 # T3 Stack Backend
│   │   ├── db/                 # Drizzle schema và connection
│   │   │   └── schema.ts       # Định nghĩa bảng users, sessions, audio_logs
│   │   └── api/                # tRPC routers (nếu dùng) hoặc Server Actions
│   ├── lib/                    # Các client/config dùng chung
│   │   ├── prompts/            # Thư mục quản lý prompts
│   │   ├── gemini.ts           # Google Generative AI config
│   │   ├── supabase.ts         # Supabase client config
│   │   └── utils.ts            # Tailwind merge và các helper nhỏ
│   ├── types/                  # TypeScript interfaces toàn cầu
│   └── middleware.ts           # Clerk auth protection middleware
├── supabase/
│   └── migrations/             # SQL migrations từ Drizzle
├── public/
│   ├── assets/                 # Icons, Ni Avatar images
│   └── fonts/
└── tests/                      # Vitest và Playwright tests
```

### Architectural Boundaries

**API Boundaries:**
Mọi giao tiếp với AI và Database phải đi qua Server Actions (hoặc tRPC) để đảm bảo bảo mật và type-safety. Không gọi trực tiếp Supabase client từ Component nếu có liên quan đến dữ liệu nhạy cảm.

**Component Boundaries:**
Components được chia tách rõ ràng theo Features. Components dùng chung nằm trong `components/shared`. Không import chéo giữa các features (ví dụ: Safe Mode không nên import trực tiếp từ Debate Mode).

**Service Boundaries:**
Các service như Audio Processing, AI Streaming được đóng gói trong `src/features/[feature]/hooks` hoặc `src/lib`.

**Data Boundaries:**
Bảng `audio_logs` sẽ chỉ lưu metadata và transcript (đã xóa PII). File audio thực tế nằm trong Supabase Storage và bị xóa cứng bởi TTL. Store Zustand chỉ quản lý UI state (Client-side).

### Requirements to Structure Mapping

**Feature/Epic Mapping:**
- **Safe Mode:** `src/features/safe-mode/` và `src/app/(main)/practice/`.
- **Zero-PII Audio Lifecycle:** `src/lib/supabase.ts` (storage) và `src/server/db/schema.ts` (logs).
- **Gemini AI Feedback:** `src/lib/prompts/` và `src/features/safe-mode/hooks/useSafeModeAI.ts`.

### Integration Points

**Internal Communication:**
Sử dụng Zustand Stores để quản lý trạng thái nội bộ của Feature. Sử dụng Server Actions để giao tiếp giữa Client và Server.

**External Integrations:**
- **Clerk:** Authentication.
- **Supabase:** Database & Storage.
- **Gemini:** AI Processing.

**Data Flow:**
User Input (Audio) -> Client MediaRecorder -> Supabase Storage (Blob) -> Server Action (Gemini Analysis) -> SSE Stream -> Client UI (Living Transcript).

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Stack được chọn (Next.js + Clerk + Supabase + Drizzle + Vercel AI SDK) là một sự kết hợp chuẩn mực và hiện đại. Việc sử dụng Clerk cho Auth giúp giảm tải việc quản lý user session phức tạp khi dùng NextAuth với Supabase.

**Pattern Consistency:**
Mô hình Feature-based kết hợp với Modular Zustand Store đảm bảo khả năng mở rộng tốt, tránh việc các tính năng (Safe/Stage/Debate) bị dính chặt vào nhau (coupling).

**Structure Alignment:**
Cấu trúc thư mục phản ánh chính xác các quyết định kiến trúc: tách biệt Server/Client rõ ràng, cô lập logic từng Feature.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
- **Safe Mode:** Được hỗ trợ đầy đủ bởi `src/features/safe-mode` và Gemini Integration.
- **Zero-PII:** Đã có chiến lược Supabase Storage TTL + Cronjob fallback.
- **Latency < 3s:** Đã tối ưu bằng Gemini Multimodal (Direct Audio input) để bỏ qua bước STT trung gian.

**Non-Functional Requirements Coverage:**
- **Performance:** App Router + Vercel Edge (cho AI Streaming) đáp ứng tốt yêu cầu phản hồi nhanh.
- **Privacy:** Chiến lược lưu trữ tạm thời (Transient Storage) đảm bảo tuân thủ quyền riêng tư cho đối tượng học sinh.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Mọi công nghệ lõi và phiên bản (Next.js 14, TypeScript 5) đã được chốt. Không còn quyết định nào bị bỏ ngỏ (Deferred) ngoại trừ các tính năng Phase 2 (Video).

**Structure Completeness:**
Cây thư mục chi tiết đã sẵn sàng để Dev (Amelia) tạo file mà không cần hỏi lại.

### Gap Analysis Results

**Critical Gaps (Identified by QA):**
1.  **Audio Leakage:** Cronjob cần quét trực tiếp Storage Bucket, không chỉ dựa vào Database Logs.
2.  **Mobile Compatibility:** Cần thực hiện Spike Test sớm để kiểm tra định dạng audio (iOS Safari) với Gemini API.
3.  **Streaming Resilience:** Cần bổ sung logic Client-side Timeout/Retry cho SSE connection.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Integration points mapped

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**First Implementation Priority:**
Initialize project with: `npm create t3-app@latest` (App Router, Drizzle, Tailwind).

### Decision Impact Analysis

**Implementation Sequence:**
1.  Setup T3 Stack + Clerk + Supabase/Drizzle.
2.  Implement "Safe Mode" Core: MediaRecorder -> Supabase Storage -> Gemini -> Client.
3.  Refine UI với shadcn/ui và Optimistic Updates.