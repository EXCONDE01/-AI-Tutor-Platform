# 📋 Master Project Plan: AI Tutor for Teachers & Students (Web + PWA)

**Last updated:** 2026-11-19 · **Release:** production pilot build (pre-pivot baseline)
**Production:** https://ai-tutor-platform-exconde.vercel.app

| Dimension | State |
|-----------|-------|
| Phases 1-7 (AI-tutor-chat product) | ✅ Complete — **deployed baseline** |
| Pivot: video-call + post-call AI guidance | 🟡 **PLANNING (not approved/implemented)** — **Q1–Q8 answered**, Phase 0 spike (100ms + Capacitor WebRTC) required before approval |
| Deployed teacher surfaces (pre-pivot) | dashboard, classes, classes/[id], sessions, sessions/[id], sessions/new, analytics |
| Quality gates (pre-pivot) | type-check clean · lint 0 errors (8 pre-existing warnings) · 152 unit tests passing · production build green |
| Working tree | Feature work uncommitted (production reflects the deployed pre-pivot builds) |

---

## **1. Project Scope** (redefined for pivot)

Build a **multi-tenant, PWA-enabled video tutoring platform** for K-12 education with **post-call AI guidance grounded in the lecture**.

| User | Capabilities |
|------|--------------|
| **Teachers** | Create/join live in-app video calls with students (class-scoped, 1:1 ad-hoc MVP); access post-call lecture artifacts (notes, transcripts, materials); view student guidance history; analytics on call duration, engagement, guidance usage |
| **Students** | Join teacher-initiated video calls via LMS SSO (Canvas, Google Classroom, Schoology) or direct login; after call ends, ask AI for guidance **grounded in that call's lecture** (notes/transcript/materials); works offline for guidance chat; installable on Chromebooks/iPads/phones; receive push reminders |
| **Parents** | Read-only access to child's call history, guidance usage, progress; COPPA consent management for recordings/transcripts |
| **Admins** | District/school setup, compliance audit logs, data retention policies, recording/transcript governance |

**Compliance**: FERPA/COPPA — audit logs, retention automation, parent consent (esp. for recordings/transcripts), access control/RLS, **no training on student data**. Recording/transcript policies **pending decision (Q4)**.

**English only.** Free tiers only (Neon, Vercel, OpenRouter `:free`/`openrouter/free`, free-tier video/infra for MVP).

---

## **2. Architecture** (target for pivot — **proposed/pending**)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS + PWA (VERCEL)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TEACHER DASHBOARD                                                   │   │
│  │  • Class roster (LMS sync) • Video session launcher (class-scoped) │   │
│  │  • Live call monitor (Neon Realtime) • Call lifecycle controls     │   │
│  │  • Lecture artifacts (notes/materials) upload & management         │   │
│  │  • Post-call analytics (duration, engagement, guidance usage)      │   │
│  │  • Export tools (Google Docs/Forms/Slides, Microsoft 365)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STUDENT VIDEO CALL + POST-CALL GUIDANCE                             │   │
│  │  • In-app video call join (provider SDK) • Call end → guidance UI  │   │
│  │  • Guidance chat (useChat → /api/ai/guidance) grounded in lecture  │   │
│  │  • Offline queue (IndexedDB + SW sync) for guidance messages       │   │
│  │  • Push notifications (Web Push API) • PWA: installable/standalone │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  • LTI 1.3 Launch + Deep Linking + NRPS/AGS                               │
│  • OAuth: Google Workspace / Microsoft 365                                │
│  • Neon Auth (Managed Better Auth) — teacher | student | parent | admin │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │ HTTPS + JWT (Bearer / ?token=)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TUTOR AGENT (NEXT.JS ROUTE HANDLERS)                      │
│  • Node runtime on Vercel (SSE streaming, no idle disconnects)             │
│  • Pooled Neon connection via @neondatabase/serverless                     │
│  • Neon Auth session/JWT verification                                      │
│  • SSE heartbeat while streaming                                           │
│  • Vercel AI SDK streamText                                                │
│  • OpenRouter FREE models only (ordered :free fallbacks, vision-aware)     │
│  • Tools: searchLectureContext (RAG over lecture artifacts),               │
│           getCallContext (call metadata, artifacts)                        │
│  • Neon Realtime subscriptions for live teacher monitoring                 │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │ Branches together (per environment)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEON LAKEBASE POSTGRES                                   │
│  • Multi-tenant hierarchy: districts → schools → teachers → classes → students │
│  • Video domain: video_sessions, call_records, lecture_artifacts,          │
│      transcript_chunks, guidance_sessions, guidance_messages               │
│  • Legacy AI-tutor-chat: tutor_sessions, messages, interventions,          │
│      session_summaries (to be migrated/repurposed per Q7)                  │
│  • LTI: platforms, deployments, nrps_cache, ags_line_items                 │
│  • Artifacts: generated_artifacts, export_jobs, oauth_tokens               │
│  • Compliance: consent_records, data_deletion_requests, retention_policies │
│  • RLS policies for tenant isolation                                       │
│  • pgvector for lecture-context RAG                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                     ┌───────────────────────┼───────────────────────┐
                     ▼                       ▼                       ▼
             ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
             │ NEON REALTIME│         │ NEON OBJECT  │         │  OPENROUTER  │
             │ (mirror      │         │ STORAGE      │         │  (LLM GATEWAY)│
             │  tables)     │         │ (lecture     │         └──────────────┘
             └──────────────┘         │  artifacts,  │
                                      │  recordings) │
                                      └──────────────┘
```

**Video provider (pending Q2):** Managed SDK (100ms, Daily, LiveKit) — room/token flow, TURN/signaling, webhooks for lifecycle. Self-host/raw WebRTC high risk on Vercel.

**Lecture context capture (pending Q3):** L1 teacher notes/materials upload → Neon Object Storage + embeddings; L2 provider post-call transcript ingestion; L3 upload+transcribe (Whisper in Neon Function); L4 live transcript (defer). RAG over `lecture_artifacts` + `transcript_chunks` (pgvector).

**Guidance endpoint:** `/api/ai/guidance` — unlocked after call end + context-ready, constrained guidance persona, OpenRouter free models, filtering/audit, student + teacher visibility per Q6.

**Legacy AI-tutor-chat components** (`/api/ai/chat`, `TutorChat`, teacher live monitor, interventions) — **to be migrated/repurposed per Q7**. Current deployment reflects this legacy system.

---

## **3. Technical Decisions**

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Framework** | Next.js `16.4.6` (App Router) + React `19.3.1`, TypeScript `5.7` | Server components + route handlers on Vercel; current majors in production |
| **PWA** | Hand-written service worker (`public/sw.js`) + `manifest.json` + `offline.html` | No `next-pwa`/Workbox; cache-first static, network-first API, offline fallback, background sync |
| **Native shell** | Capacitor `8` (`@capacitor/core`, `android`, `ios`, push/local notifications, keyboard, splash) loading live site | Live-server approach (not static export); `cap:sync` / `cap:run:*` scripts |
| **LTI Library** | In-house `src/lib/lti` (`oidc.ts`, `platform.ts`, `jwt.ts`, `keys.ts`, `nrps.ts`, `ags.ts`, `ags-client.ts`, `validation.ts`) | Full LTI 1.3 + Deep Linking + NRPS + AGS without third-party; keys/JWKS controlled |
| **Tutor Framework** | Vercel AI SDK `ai` v5 (`streamText`) + `@ai-sdk/react` `useChat` | Native streaming through route handlers |
| **Models** | **OpenRouter free models only** — `openrouter/free` plus `:free` ids, ordered fallbacks in `src/lib/ai/openrouter.ts`, `assertFreeModel()` rejects anything else | Zero LLM spend during pilot; vision-capable free models when images present |
| **Auth** | Neon Auth (`@neon/auth`, Managed Better Auth) + `ensureAppUser()` provisioning | Branches with DB; OIDC consumed by LTI launch route |
| **Streaming** | SSE from `app/api/ai/*` with heartbeats | Survives Vercel/proxy idle timeouts |
| **Realtime** | Neon Realtime (`@neon/realtime`, `-react`, `-drizzle`) over **RLS-free mirror tables** (`teacher_active_sessions_realtime`, `session_messages_realtime`) kept in sync by triggers in migration `0013` | Neon Realtime rejects relations with RLS, views, matviews, set-returning functions; mirrors are supported workaround. Polling fallback retained |
| **Storage** | Neon Object Storage via `@aws-sdk/client-s3` + presigner (`src/lib/object-storage`) | S3-compatible, presigned URLs, branches with DB |
| **Database** | Neon Lakebase Postgres + Drizzle ORM `0.45` / `drizzle-kit 0.31` | Typed schema in `db/schema`, SQL migrations committed |
| **Migrations** | `npm run db:generate` then `npm run db:migrate` (unpooled URL); migrations `0000`-`0013` | Per AGENTS.md: **never** `push` |
| **Offline** | IndexedDB (`idb`) outbox queue + service-worker background sync | Students draft guidance messages offline, sync on reconnect |
| **Push** | Web Push API + VAPID (`web-push`) and Capacitor push notifications | Assignment reminders, teacher interventions, session alerts |
| **Testing** | Vitest `5.1` (unit), Playwright `1.65` (e2e) | `npm test`, `npm run test:e2e` |

### **Decisions Answered (Pivot-Specific — Awaiting Phase 0 Spike Validation)**

| # | Decision | Choice | Status |
|---|----------|--------|--------|
| Q1 | Session scope: 1:1 vs group; ad-hoc vs scheduled | **1:1 ad-hoc only (MVP)** | ✅ Answered |
| Q2 | Video provider (managed SDK) | **100ms** — bundled free tier (10k call min + 300 min recording + 300 min transcript + AI summary); prebuilt React components | ✅ Answered — **Phase 0 spike required** |
| Q3 | Lecture source & grounding | **L2 — Provider post-call transcript** (100ms) | ✅ Answered |
| Q4 | Recording/consent/retention | **Opt-in recording per session (teacher-initiated)** with FERPA/COPPA consent captured before recording | ✅ Answered — legal/compliance review recommended before implementation |
| Q5 | Session domain model & migration | **New video-session domain** (`video_sessions`, `call_records`, `lecture_artifacts`, `transcript_chunks`, `guidance_sessions`, `guidance_messages`) | ✅ Answered |
| Q6 | Guidance unlock/boundaries/visibility | **Unlock after `call_status=ended` + `context_ready=true`**; student-only guidance chat; constrained "guidance not tutor" persona | ✅ Answered |
| Q7 | Disposition of current AI tutor chat | **Deprecate & archive** `/api/ai/chat`, `TutorChat`, teacher live monitor, interventions | ✅ Answered |
| Q8 | MVP slice definition | **Minimal: 1:1 ad-hoc call → L2 transcript → post-call guidance chat (student) → teacher call log + guidance view** | ✅ Answered |

**Capacitor WebView WebRTC/media permissions need a Phase 0 spike** (validate 100ms SDK on Android/iOS WebView: camera/mic permissions, signaling, join/leave, background/foreground, network changes).

---

## **4. Implementation Phases** (pivot roadmap — **Proposed/Pending Approval**)

> **Note:** Phases 1-7 below delivered the **AI-tutor-chat product** (pre-pivot baseline). The pivot roadmap (Phase 0–6) has **not started** and requires approved decisions + Phase 0 spike before implementation.

### **Pre-Pivot Baseline (Historical — Phases 1-7 Complete)**

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Foundation: DB schema, Neon config, Auth, PWA scaffold, Design System, CI/CD | ✅ Done |
| 2 | LTI 1.3 Launch, NRPS Roster Sync, AGS Grade Passback, Teacher Dashboard v1 | ✅ Done |
| 3 | Core Tutor Agent: `/api/ai/chat` streaming, RAG, Assignment Context, Student Chat UI, Teacher Live Monitor | ✅ Done |
| 4 | Interventions, Analytics, Grade Passback, Push Notifications, Export Tools | ✅ Done |
| 5 | Google/Microsoft 365 OAuth, Export/Import Tools | ✅ Done (Microsoft blocked) |
| 6 | Compliance: Content Filter, Audit Logging, Retention, Parent Portal, PWA Polish, Load Test | ✅ Done |
| 7 | UI/UX Hardening & Data Correctness: Realtime mirrors (0013), teacher surfaces rebuild, query fixes, test coverage | ✅ Done |

---

### **Pivot Roadmap (Proposed — Not Started)**

#### **Phase 0: Prerequisites & Decisions** (before any implementation)
| Area | Deliverables |
|------|--------------|
| **Decisions** | ✅ **Q1–Q8 answered** (see §10); record in decision log; stakeholder sign-off |
| **Capacitor WebRTC Spike** | Test **100ms SDK** in Capacitor WebView (Android/iOS): camera/mic permissions, signaling, join/leave, background/foreground, network changes; document limitations |
| **Plan Updates** | Update this plan with approved decisions; detail Phase 1–6 scope; update §5 schema proposal, §6 UI proposal, §7 gates, §8 blockers |
| **No schema/code changes** | This phase is decision-making and validation only |

#### **Phase 1: Domain Model & Lifecycle Foundation**
| Area | Deliverables |
|------|--------------|
| **Video session domain** | New tables: `video_sessions`, `call_records`, `lecture_artifacts`, `transcript_chunks`, `guidance_sessions`, `guidance_messages` (pgvector for chunks) |
| **Consent/access/retention** | `recording_consent` linkage, retention policies per artifact type, RLS policies for video/guidance data |
| **Migration/compat strategy** | Explicit plan for existing `tutor_sessions` (NOT NULL `tutor_config_id`), `messages`, `interventions`, realtime mirrors, RLS; authoritative `ended_at`/`total_duration_seconds` semantics; session_type enum or new tables |
| **DB changes only via** | `npm run db:generate` + `npm run db:migrate` (never push) |

#### **Phase 2: Video Call Integration (MVP)**
| Area | Deliverables |
|------|--------------|
| **Provider integration** | Room creation, token minting (teacher + student), join/leave UI, call lifecycle persistence (`call_records`), webhook handlers (idempotent) for `session.started/ended/participant.joined/left` |
| **Teacher launcher** | Class-scoped "Start Video Call" → creates `video_session` + provider room → student join link via LMS/direct |
| **Student join flow** | LTI/direct auth → provider SDK join → in-call UI (mute, camera, leave) |
| **Call end** | Teacher or student ends → `call_record.ended_at`, `duration_seconds`, `status=ended`; trigger context-ready pipeline |

#### **Phase 3: Lecture Context Capture**
| Area | Deliverables |
|------|--------------|
| **L2 — Provider transcript (primary, per Q3)** | Post-call webhook → ingest 100ms transcript → chunk + embed → `transcript_chunks` (pgvector); pending/failed states, retry with backoff; dead-letter visibility |
| **L1 — Teacher notes/materials (fallback, per Q3)** | Teacher upload (PDF, images, text) → Neon Object Storage → chunk + embed → `lecture_artifacts` + `transcript_chunks`; fallback when transcript unavailable/delayed |
| **L3 (upload+transcribe)** | Optional: Whisper in Neon Function for uploaded recordings → transcript → chunks/embeddings (defer unless needed) |
| **Context-ready signal** | `video_session.context_ready = true` when transcript chunks available (L2) or teacher materials ingested (L1 fallback) |

#### **Phase 4: Post-Call AI Guidance**
| Area | Deliverables |
|------|--------------|
| **Guidance endpoint** | `/api/ai/guidance` — `useChat` streaming, OpenRouter free models, grounded retrieval over `transcript_chunks` (RAG), **constrained "guidance not tutor" persona**: Socratic/hints only, refuses direct answers, cites lecture sources (chunk IDs) |
| **Unlock logic (per Q6)** | Student sees guidance UI **only after `call_status=ended` AND `context_ready=true`**; **student-only guidance chat** (teacher not visible) |
| **Persistence** | `guidance_sessions` (linked to `video_session`), `guidance_messages` (with retrieval citations), token usage, audit |
| **Filtering/audit** | Pre-message filter (PII, inappropriate, cheating); all guidance → `audit_logs` |
| **Student UI** | Guidance chat view, artifact viewer (transcript, notes), offline queue, push for "guidance available" |
| **Teacher UI** | Call log + duration; **no access to student guidance interactions** (per Q6) |

#### **Phase 5: Realtime/Monitoring/Analytics Adaptation & Legacy Deprecation**
| Area | Deliverables |
|------|--------------|
| **Realtime adaptation** | Mirror tables for `video_sessions`/`call_records`/`guidance_sessions` if needed; teacher live call monitor (participant list, duration) |
| **Analytics** | Call duration, engagement, guidance sessions per student, topic coverage from lecture context |
| **Legacy deprecation (per Q7)** | **Remove** `/api/ai/chat`, `TutorChat`, teacher live AI-chat monitor (`live-sessions-panel`), interventions; **archive** `tutor_sessions`, `messages`, `session_summaries`, `interventions` (keep for audit/history, no new writes) |

#### **Phase 6: Compliance Hardening, Capacitor/PWA Verification, Rollout**
| Area | Deliverables |
|------|--------------|
| **Compliance** | Consent flows for recording/transcript (Q4); retention/deletion automation; access audits; no-training enforcement |
| **Capacitor/PWA** | Video call + guidance offline/background behavior; install prompts; manual device matrix (iOS Safari, Android Chrome, Chromebook) |
| **Rollout** | Pilot with 1 teacher + 1 class; gather feedback; iterate |
| **Plan updates** | Close decisions; document final architecture |

---

## **5. Database Development (Explicit)**

### **Current Schema (Pre-Pivot Baseline — As Deployed)**

**Schema Files** (`db/schema/`)
```
db/
├── schema/
│   ├── tenants.ts        # districts, schools
│   ├── users.ts          # users, teachers, students, parents, student_parents
│   ├── classes.ts        # classes, class_students, tutor_configs
│   ├── sessions.ts       # tutor_sessions, messages, session_summaries
│   ├── interventions.ts  # interventions, intervention_actions
│   ├── lti.ts            # lti_platforms, lti_deployments, nrps_cache, ags_line_items, ags_scores
│   ├── artifacts.ts      # generated_artifacts, export_jobs, oauth_tokens
│   ├── audit.ts          # audit_logs, audit_logs_partitioned
│   ├── compliance.ts     # consent_records, data_deletion_requests, retention_policies, retention_jobs
│   ├── push.ts           # push_subscriptions
│   ├── vector.ts         # message_embeddings, artifact_embeddings, knowledge_embeddings,
│   │                     #   student_learning_embeddings, embedding_jobs
│   └── index.ts          # barrel export + Drizzle relations
├── rls.ts                # Row-level security policies
├── indexes.ts            # Performance indexes (tenant, session, time)
└── vector.ts             # pgvector setup: extension, HNSW indexes
```

**Migrations** (`drizzle/migrations/`)
`0000`-`0012` generated by drizzle-kit; `0001_pgvector_extension.sql`, `0003_rls_policies.sql`, `0005_realtime_publication.sql`, `0007_vector_embeddings.sql`, `0013_realtime_shadow_tables.sql` hand-written. All registered in `meta/_journal.json`. Latest: `0013_realtime_shadow_tables`.

- Apply with `npm run db:generate` then `npm run db:migrate`. **Never `drizzle push`.**
- Migration `0013` creates realtime mirror tables (`teacher_active_sessions_realtime`, `session_messages_realtime`) and sync triggers (Neon Realtime cannot subscribe to RLS-protected relations).

**Key Tables (Current)**
| Table | Purpose | RLS Policy |
|-------|---------|------------|
| `districts` | Top-level tenant | Admin only |
| `schools` | District children | District admin |
| `users` | Neon Auth identity (role: teacher/student/parent/admin) | Self + admin |
| `teachers` | Teacher profile; `user_id` bridge from auth | Teacher sees own |
| `classes` | Teacher's classes (`teacher_id` → **`teachers.id`**) | Teacher owns |
| `class_students` | Enrollment join | Teacher sees class; student sees self |
| `students` | Student profile + LMS IDs | Teacher sees class; student sees self |
| `tutor_sessions` | Active/ended AI tutoring sessions | Teacher sees class; student owns |
| `messages` | Chat messages + tool calls/results | Same as session |
| `session_summaries` | Topics, struggles, engagement per session | Same as session |
| `interventions` | Teacher actions in student sessions | Teacher owns; student sees |
| `audit_logs` | All actions for compliance | Admin only |
| `lti_platforms` | Canvas/Classroom/Schoology config | District admin |
| `nrps_cache` | Roster sync cache | Sync function only |
| `generated_artifacts` | Worksheets, quizzes, slides | Teacher owns; student views assigned |
| `oauth_tokens` | Encrypted Google/Microsoft tokens | User owns |
| `consent_records` | COPPA parent consent | Parent + admin |
| `push_subscriptions` | Web Push endpoints | User owns |

**Scoping rule:** `classes.teacher_id` references `teachers.id`, not `users.id`. Every teacher-scoped query must join `teachers` on `classes.teacher_id` and filter `teachers.user_id = auth user id`.

---

### **Proposed Schema Additions (Pivot — Q3, Q5 Answered)**

> **Not yet implemented.** Decisions: **Q3 = L2 provider transcript (100ms) primary, L1 teacher notes fallback**; **Q5 = New video-session domain** (recommended). Tables below reflect these choices.

| Proposed Table | Purpose | Notes |
|----------------|---------|-------|
| `video_sessions` | Parent record: class-scoped, teacher-initiated, `status` (active/ended), `context_ready` boolean, `started_at`, `ended_at`, `total_duration_seconds` | Links to `classes`, `teachers`; replaces `tutor_sessions` for video; no `scheduled` status in MVP (ad-hoc only, per Q1) |
| `call_records` | Provider-specific call metadata: `provider` ('100ms'), `room_id`, `room_url`, `token_teacher`, `token_student`, `started_at`, `ended_at`, `duration_seconds`, `status`, `recording_url` | One per `video_session` (MVP); webhook updates from 100ms |
| `lecture_artifacts` | Teacher-uploaded fallback materials: `video_session_id`, `type` (notes/pdf/image/slides), `storage_key`, `mime_type`, `size_bytes`, `chunk_count`, `embedding_model`, `status` (pending/ready/failed), `created_at` | Neon Object Storage key; pgvector chunks in `transcript_chunks`; L1 fallback when transcript unavailable |
| `transcript_chunks` | Text chunks + embeddings for RAG: `video_session_id`, `source` ('100ms_transcript' | 'teacher_notes'), `chunk_index`, `content`, `embedding` (vector), `token_count` | pgvector HNSW index; partitioned by `video_session_id`; primary source is 100ms post-call transcript |
| `guidance_sessions` | Post-call guidance chat: `video_session_id`, `student_id`, `status` (active/ended), `started_at`, `ended_at`, `message_count`, `total_tokens` | Unlocked only when `video_session.context_ready=true` AND `call_record.status=ended` |
| `guidance_messages` | Guidance chat messages: `guidance_session_id`, `role` (user/assistant), `content`, `retrieval_citations` (chunk IDs), `token_usage`, `created_at` | Grounded in lecture context; mirrors `messages` shape but for guidance |
| `recording_consent` | Per-student per-session consent: `video_session_id`, `student_id`, `parent_consent` (boolean), `consented_at`, `withdrawn_at` | FERPA/COPPA; gates recording/transcript storage (opt-in per session, teacher-initiated, per Q4) |

**RLS/Realtime Implications (Proposed)**
- New tables need RLS policies mirroring class-scoped access (teacher sees class, student sees own).
- If realtime monitoring needed for video calls, new mirror tables + triggers required (like `0013`).
- `transcript_chunks` pgvector index must be compatible with Neon Realtime constraints (no RLS on subscribed relations).

**Migration Strategy (Q5 Answered: New Video-Session Domain)**
- **Approach:** New video-session domain tables (above); `tutor_sessions`/`messages`/`session_summaries`/`interventions` **archived** (kept for historical AI-chat data, no new writes after deprecation).
- Legacy data remains accessible for compliance/audit; new video flows use new tables exclusively.
- Any schema change requires `npm run db:generate` + `npm run db:migrate` (never push).

---

## **6. Web UI Development (Explicit)**

### **Current Structure (Pre-Pivot Baseline — AI-Tutor-Chat)**

**Component Structure** (`src/components/`)
```
components/
├── ui/                     # shadcn-style primitives
├── shared/                 # layout, nav, install-prompt, error-boundary
├── teacher/
│   ├── AnalyticsDashboard.tsx        # /teacher/analytics
│   ├── live-sessions-panel.tsx       # Dashboard realtime AI-chat monitor
│   ├── session-analytics-charts.tsx
│   ├── SessionSummaryCard.tsx
│   ├── analytics/                    # Analytics building blocks
│   ├── classes/                      # Class cards, toolbar, create dialog
│   └── sessions/                     # Sessions list/table/cards, transcript, toolbar
├── student/
│   └── TutorChat.tsx       # useChat + streaming AI chat + offline queue
├── parent/
│   ├── ConsentForm.tsx
│   ├── SessionViewer.tsx
│   └── ProgressSummary.tsx
└── compliance/
```

**Pages / Routes** (`src/app/`)
```
app/
├── sign-in/  sign-up/  onboarding/  auth/callback/
├── unauthorized/
├── lti/                     # LTI 1.3 launch
├── oauth/callback/          # Google/Microsoft
├── teacher/
│   ├── dashboard/           # live AI-chat monitor
│   ├── classes/
│   │   └── [id]/            # class detail
│   ├── sessions/
│   │   ├── new/             # start AI tutor session
│   │   └── [id]/            # AI chat transcript
│   ├── analytics/
│   └── settings/
├── student/
│   ├── classes/  sessions/  artifacts/  notifications/  settings/
├── parent/                  # /parent/*
├── admin/
└── api/                     # route handlers (auth, ai/chat, teacher/*, student/*, lti/*, ...)
```

---

### **Proposed Structure (Pivot — Video Call + Post-Call Guidance — Q1–Q8 Answered)**

> **Not yet implemented.** Distinguishes new video/guidance surfaces from legacy AI-chat (to deprecate per Q7).

**New / Modified Components**
```
components/
├── teacher/
│   ├── video/
│   │   ├── VideoCallLauncher.tsx      # "Start Video Call" per class (1:1 ad-hoc)
│   │   ├── CallMonitor.tsx            # Live participant view, duration, end call
│   │   ├── LectureArtifactsManager.tsx # View 100ms transcript status; upload notes (L1 fallback)
│   │   └── CallDetailView.tsx         # Call log + duration; **no guidance visibility** (per Q6)
│   ├── sessions/                      # LEGACY — AI tutor chat sessions (to deprecate per Q7)
│   └── analytics/                     # Extended with call duration, guidance usage
├── student/
│   ├── video/
│   │   ├── VideoCallJoin.tsx          # Join call (100ms SDK)
│   │   ├── InCallUI.tsx               # Mute, camera, leave, 100ms controls
│   │   └── PostCallGuidance.tsx       # Guidance chat (unlocked after end+context_ready)
│   │       ├── GuidanceChat.tsx       # useChat → /api/ai/guidance (constrained persona)
│   │       ├── ArtifactViewer.tsx     # 100ms transcript + teacher notes
│   │       └── GuidanceHistory.tsx    # Past guidance sessions for this student
│   └── TutorChat.tsx                  # LEGACY — AI tutor chat (to deprecate per Q7)
└── shared/
    └── VideoCallProvider.tsx          # 100ms SDK context
```

**New / Modified Routes**
```
app/
├── teacher/
│   ├── classes/
│   │   └── [id]/
│   │       └── video/               # Video call launcher, lecture artifacts (transcript status, notes upload)
│   ├── video-sessions/              # Video session list (replaces sessions for video)
│   │   └── [id]/                    # Call detail: duration, recording link, transcript status; **no student guidance**
│   └── analytics/                   # Extended: call metrics, guidance usage (aggregate)
├── student/
│   ├── video/
│   │   ├── join/[sessionId]/        # Join video call
│   │   ├── call/[sessionId]/        # In-call UI
│   │   └── guidance/[sessionId]/    # Post-call guidance chat + artifacts (unlocked after end+context)
│   └── sessions/                    # LEGACY — AI tutor chat history (to deprecate)
├── api/
│   ├── ai/
│   │   ├── chat/                    # LEGACY — /api/ai/chat (to deprecate per Q7)
│   │   └── guidance/                # NEW — /api/ai/guidance (post-call, grounded in transcript_chunks)
│   ├── teacher/
│   │   ├── video-sessions/          # CRUD, launch, end, artifacts (transcript/notes)
│   │   └── calls/                   # Call log, duration, transcript status
│   └── student/
│       └── guidance/                # Student guidance endpoint
```

---

## **7. Validation & Quality Gates**

Run before every deploy. Current status as of 2026-11-19 (pre-pivot baseline).

| Gate | Command / Check | Current Result |
|------|-----------------|----------------|
| **TypeScript** | `npm run type-check` (`tsc --noEmit`) | ✅ Clean |
| **Lint** | `npm run lint` (`eslint .`) | ✅ 0 errors · 8 pre-existing warnings |
| **Unit tests** | `npm test` (`vitest run`) | ✅ 152/152 passing across 9 files |
| **Drizzle Generate** | `npm run db:generate` (after any `db/schema` change) | ✅ Up to date (`0000`-`0013`) |
| **Drizzle Migrate** | `npm run db:migrate` (unpooled URL) | ✅ Applied, incl. `0013_realtime_shadow_tables` |
| **Build** | `npm run build` (`next build`) | ✅ Green; `/teacher/*` routes render dynamically |
| **E2E** | `npm run test:e2e` (Playwright) | Available; not part of default gate |
| **API smoke (unauthenticated)** | `curl` production routes | ✅ `/teacher/*` → 307, `/api/teacher/*` → 401 |
| **Analytics API (live DB)** | Temporary mocked-auth vitest harness against Neon | ✅ 200; dense 30-day series |
| **Realtime Test** | `neon realtime subscribe` on both mirror tables | ✅ Streaming |
| **PWA Audit** | Lighthouse PWA, install + offline load | Manual — pending signed-in pass |
| **Push Test** | VAPID → send → receive | Manual — pending device pass |
| **Load Test** | `npm run load-test` | Script available |

**Signed-in visual QA outstanding** for `/teacher/classes`, `/teacher/sessions`, `/teacher/sessions/[id]`, `/teacher/analytics`; requires teacher session.

---

### **Proposed Gates for Pivot (Implementation Pending Phase 0 Spike)**

| Gate | Description |
|------|-------------|
| **Capacitor/WebView WebRTC Matrix** | Manual test on iOS Safari, Android Chrome, Chromebook: join/leave, background/foreground, network change, permissions, audio/video quality (**Phase 0 spike deliverable**) |
| **Provider Webhook Idempotency (100ms)** | Simulate duplicate/misordered 100ms webhooks (`session.started/ended`, `participant.joined/left`); verify `call_record` state machine correctness |
| **Session Lifecycle & Guidance Unlock AuthZ** | Integration tests: call end → context ready → guidance unlocked for **student only** (per Q6); blocked if context not ready |
| **Lecture Artifact Access/Retention** | RLS tests: 100ms transcript → student views in guidance; **recording_consent** gates recording/transcript (opt-in, per Q4); retention job deletes on schedule |
| **Realtime Model Changes** | Subscribe to new video/guidance mirror tables; verify teacher live call monitor (participant list, duration) updates |
| **Legacy Regression** | Verify AI-chat paths (`/api/ai/chat`, `TutorChat`) still work until Q7 deprecation; no cross-contamination with guidance data |
| **All existing gates** | type-check, lint, test, build, db:generate/migrate, PWA audit, push test, load test — **must remain passing** |

---

## **8. Critical Blockers**

| Blocker | Action | Status |
|---------|--------|--------|
| **Capacitor WebRTC Spike (100ms SDK)** | Validate 100ms SDK in Capacitor WebView (Android/iOS): camera/mic permissions, signaling, join/leave, background/foreground, network changes; document limitations | 🟡 **Pivot Blocker — Phase 0** |
| **Recording/consent/retention policy (Q4)** | FERPA/COPPA legal review: consent flow (opt-in per session, teacher-initiated), retention schedule, auto-deletion, no-training enforcement | 🟡 **Pivot Blocker — Phase 0** |
| **Microsoft Entra App** | Register for Microsoft Graph (Drive, OneDrive) | ⛔ Blocked — Azure anti-fraud review |
| **Custom Domain (optional)** | Not configured; using Vercel production alias | ⏸ Deferred |
| **Google → existing email/password linking** | Neon Auth exposes no social-link endpoint | ⛔ Blocked — upstream limitation |

---

## **9. Cost Estimate (Monthly)**

| Service | Cost | Notes |
|---------|------|-------|
| **OpenRouter (LLM)** | **$0** | Free models only (`openrouter/free` + `:free`) |
| **Neon** | **$0** | Free tier: Lakebase Postgres, autoscaling, branches, Realtime, Storage, Auth |
| **Vercel** | **$0** | Free tier: personal project, production alias |
| **Video Provider** | **$0 (target)** | Must fit chosen provider free tier (concurrent rooms, minutes, TURN, recording, transcripts) — **pending Q2** |
| **Transcription/Storage** | **$0 (target)** | Must fit Neon Object Storage free tier + provider transcript inclusion or Whisper in Neon Function — **pending Q3** |
| **LMS APIs** | **$0** | Free developer keys |
| **Google APIs** | **$0** | Free tiers sufficient |
| **Domain (optional)** | **~$12/yr** | Not configured |
| **Total (pilot)** | **$0/mo (target)** | Free tiers only; video/transcription/storage usage must fit provider/Object Storage free-tier limits |

---

## **10. Decisions & Open Questions**

### **Resolved (Carry Forward)**
1. **Language** — English only.
2. **Models** — OpenRouter free models only, with ordered fallbacks; non-free ids rejected at runtime.
3. **Student auth** — Neon Auth for all roles plus LTI 1.3 launch; direct email/password for non-LMS schools.
4. **Realtime** — Neon Realtime over RLS-free mirror tables, with polling fallback.
5. **Migrations** — `drizzle-kit generate` + `migrate`; no `push`.
6. **PWA Approach** — Capacitor 8 live-server (not static export); hand-written service worker.
7. **Stack** — Next.js App Router on Vercel, Neon (Lakebase Postgres, Auth, Realtime, Object Storage, Functions), Drizzle ORM/kit.
8. **Compliance Baseline** — FERPA/COPPA audit logs, retention automation, parent consent, no training on student data.

### **Answered (Pivot Decisions Q1–Q8 — Awaiting Phase 0 Spike Validation)**

| # | Decision | Choice | Notes |
|---|----------|--------|-------|
| Q1 | **Session scope**: 1:1 vs group; ad-hoc vs scheduled | **1:1 ad-hoc only (MVP)** | Group/scheduled defer |
| Q2 | **Video provider** (managed SDK) | **100ms** | Bundled free tier: 10k call min + 300 min recording + 300 min post-call transcript + AI summary; prebuilt React components. **Phase 0 spike required for Capacitor WebView validation.** |
| Q3 | **Lecture source & grounding** | **L2 — Provider post-call transcript (100ms) primary; L1 — Teacher notes/materials fallback** | L3 (Whisper) optional; L4 (live) defer |
| Q4 | **Recording/consent/retention** | **Opt-in recording per session (teacher-initiated)** with FERPA/COPPA consent captured before recording | Legal/compliance review recommended before implementation |
| Q5 | **Session model & migration** | **New video-session domain** (`video_sessions`, `call_records`, `lecture_artifacts`, `transcript_chunks`, `guidance_sessions`, `guidance_messages`, `recording_consent`) | Archive legacy `tutor_sessions`/`messages`/`session_summaries`/`interventions` |
| Q6 | **Guidance unlock/boundaries/visibility** | **Unlock after `call_status=ended` + `context_ready=true`**; **student-only guidance chat**; constrained "guidance not tutor" persona (Socratic/hints, no answers, cites lecture sources) | Teacher cannot see student guidance interactions |
| Q7 | **Disposition of current AI tutor chat** | **Deprecate & archive** `/api/ai/chat`, `TutorChat`, teacher live monitor, interventions | Clean break; legacy data kept for audit/history |
| Q8 | **MVP slice** | **Minimal: 1:1 ad-hoc call → L2 transcript → post-call guidance chat (student) → teacher call log + guidance view** | No scheduling, no group, no rich in-call tools; free-tier only |

**Detail Questions (for Phase 1 design):**
- Join flow: teacher creates room → student joins via deep link/LMS; ownership = teacher's class
- Webhook failure states: idempotency keys, retry with backoff, dead-letter visibility
- Guidance session ownership: student owns; teacher reads call log only (no guidance); admin reads all
- Capacitor permissions: `camera`, `microphone` in `capacitor.config.ts` + native manifests (Phase 0 spike)

### **Still-Relevant Prior Open Questions**
1. **Standards alignment** — include CCSS/NGSS/state standards in RAG knowledge base?
2. **Tutor persona config** — which parameters should teachers control (tone, scaffolding, allowed topics, refusal style)?
3. **Pilot scope** — begin with one LMS (Canvas) + one teacher + one class?
4. **Push triggers** — which events (assignment, teacher message, reminder, streak, parent digest)?
5. **Analytics depth** — basic (duration, topics, engagement) vs. advanced (misconception detection, progression)?
6. **Microsoft Graph** — external unblock required before 365 parity.

---

## **11. Deliverables & Known Issues / Next Steps**

### **Delivered (Pre-Pivot Baseline — Phases 1-7)**
| Deliverable | Includes | Status |
|-------------|----------|--------|
| **1. Drizzle Schema + Migrations** | All tables, RLS, indexes, pgvector, relations, `db:generate`/`db:migrate` | ✅ Done |
| **2. Neon Platform Config + CI/CD** | Auth, Realtime, Object Storage, branches, Vercel production deploys | ✅ Done |
| **3. Next.js + PWA Shell** | App Router, hand-written service worker, manifest, install prompt, offline banner, Capacitor 8 shell | ✅ Done |
| **4. Teacher Surfaces (AI-Chat)** | Dashboard, classes list/detail, AI-chat sessions list/transcript, analytics | ✅ Done |
| **5. Tutor Agent (AI-Chat)** | Streaming chat, free-model fallback, RAG, persistence | ✅ Done |
| **6. Student Chat UI (AI-Chat)** | `useChat` streaming, offline queue, push subscription, artifacts | ✅ Done |
| **7. Phase 7 Hardening** | Realtime mirrors (0013), scoping fixes, redesigned teacher pages, new vitest coverage (152 passing) | ✅ Done |

---

### **Known Issues / Follow-ups (Current Baseline)**

| Issue | Impact | Next Step |
|-------|--------|-----------|
| Signed-in visual QA not performed for redesigned teacher pages | Charts/tabs/mobile layout unverified visually | Manual pass with a teacher account |
| All 14 seeded sessions remain `status='active'`, `ended_at` NULL, `total_duration_seconds` 0 | Duration KPIs and session-length chart show honest empty states | Wire session completion / duration accounting |
| No `session_summaries` or `interventions` rows in live data | Content and Interventions tabs show empty states | Generate summaries; exercise intervention flows |
| `token_usage` is `{}` and messages lack `metadata.tokens` | Token card shows "not recorded yet" | Capture usage from model responses |
| Microsoft Graph end-to-end | 365 parity unavailable | Needs Azure App Registration unblock |
| Google → existing email/password account linking | Users with both cannot merge | Blocked on Neon Auth social-link support |
| Feature work uncommitted in working tree | Production reflects deployed builds, not git history | Commit and push |

---

### **Pending Pivot Deliverables (Tied to Phase 0+)**
| Deliverable | Depends On |
|-------------|------------|
| Decision record (Q1–Q8 — answered) | Stakeholder sign-off, Phase 0 spike results |
| Capacitor WebRTC spike report (100ms SDK) | Phase 0 spike execution |
| Detailed schema/migration for video-session domain | Phase 1 (after spike approval) |
| Video call integration (MVP) | Phase 2 |
| Post-call guidance endpoint + UI | Phase 3–4 |
| Compliance hardening for recordings/transcripts | Q4 legal review + Phase 6 |
| Deprecation of AI-chat paths | Phase 5 |

---

### **Next Steps**
1. **Run Phase 0 spike**: Capacitor WebRTC test with **100ms SDK**; document results (join/leave, permissions, background/foreground, network changes on Android/iOS WebView).
2. **Record decisions** in decision log; obtain stakeholder sign-off (including legal/compliance for Q4).
3. **Draft detailed schema/migration** for video-session domain (Phase 1 scope) — only after spike passes and decisions approved.
4. **No implementation until decisions approved** and Phase 0 spike complete.

---

**End of Master Project Plan** — This document reflects the **pre-pivot deployed baseline** (Phases 1-7 complete) and a **proposed pivot roadmap** (Phases 0-6) that requires **Phase 0 spike validation** (100ms + Capacitor WebRTC) and **stakeholder sign-off** before any implementation begins.