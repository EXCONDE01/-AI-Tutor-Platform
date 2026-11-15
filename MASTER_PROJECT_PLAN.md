# 📋 Master Project Plan: AI Tutor for Teachers & Students (Web + PWA)

---

## **1. Project Scope**

Build a **multi-tenant, PWA-enabled AI tutoring platform** for K-12 education:

| User | Capabilities |
|------|--------------|
| **Teachers** | Configure tutor personas per class, monitor student sessions live, intervene in real-time, view analytics, push notifications, export worksheets/quizzes to Google/Microsoft 365 |
| **Students** | Chat with AI tutor via LMS SSO (Canvas, Google Classroom, Schoology) or direct login, works offline, installable on Chromebooks/iPads/phones, receive push reminders |
| **Parents** | Read-only access to child's progress, COPPA consent management |
| **Admins** | District/school setup, compliance audit logs, data retention policies |

**Compliance**: FERPA/COPPA — audit logs, retention automation, parent consent, no training on student data.

---

## **2. Architecture**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS + PWA (VERCEL)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TEACHER DASHBOARD                                                   │   │
│  │  • Class roster (LMS sync) • Tutor config (persona, guardrails)    │   │
│  │  • Live session monitor (Neon Realtime) • Intervention controls    │   │
│  │  • Analytics (duration, topics, tokens) • Grade passback status    │   │
│  │  • Export tools (Google Docs/Forms/Slides, Microsoft 365)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STUDENT TUTOR CHAT                                                  │   │
│  │  • Streaming chat (useChat → Neon Function) • Message history      │   │
│  │  • Offline queue (IndexedDB + Service Worker sync)                 │   │
│  │  • Push notifications (Web Push API) • Artifact viewer             │   │
│  │  • PWA: installable, standalone, background sync                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  • LTI 1.3 Launch + Deep Linking + NRPS/AGS                               │
│  • OAuth: Google Workspace / Microsoft 365                                │
│  • Neon Auth (Managed Better Auth) — multi-role: teacher | student       │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │ HTTPS + JWT (Bearer / ?token=)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      NEON FUNCTIONS (TUTOR AGENT)                           │
│  • Hono server on Neon Compute (15-min streaming, WebSocket/SSE native)    │
│  • Module-scope pg Pool + attachDatabasePool (no idle disconnects)         │
│  • JWT verification via NEON_AUTH_JWKS_URL                                 │
│  • CORS + SSE heartbeat (: ping\n\n every 25s)                             │
│  • Vercel AI SDK streamText + ToolLoopAgent                                │
│  • OpenRouter: claude-3.5-sonnet (primary) → gpt-4o-mini → gemini-flash   │
│  • Tools: searchKnowledgeBase (RAG), getAssignmentContext, exportToGoogle* │
│  • Neon Realtime subscriptions for live teacher monitoring                 │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │ Branches together (per teacher/class)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEON LAKEBASE POSTGRES                                   │
│  • Multi-tenant hierarchy: districts → schools → teachers → classes → students │
│  • Core: tutor_sessions, messages, interventions, audit_logs               │
│  • LTI: platforms, deployments, nrps_cache, ags_line_items                 │
│  • Artifacts: generated_artifacts, export_jobs, oauth_tokens               │
│  • Compliance: consent_records, data_deletion_requests, retention_policies │
│  • RLS policies for tenant isolation                                       │
│  • pgvector for curriculum/standards RAG                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
            │ NEON REALTIME│         │ NEON OBJECT  │         │  OPENROUTER  │
            │ (sealed live │         │ STORAGE      │         │  (LLM GATEWAY)│
            │  queries)    │         │ (artifacts)  │         └──────────────┘
            └──────────────┘         └──────────────┘
```

---

## **3. Technical Decisions**

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Platform** | Web + PWA (`next-pwa`, Workbox, Web Push) | Single codebase, works on Chromebooks/iPads/phones, installable, offline-capable |
| **LTI Library** | `@lti-tool/core` + `@lti-tool/postgresql` + `@lti-tool/hono` | Neon-native Postgres storage, Hono for Functions, full LTI Advantage |
| **Tutor Framework** | Vercel AI SDK `streamText` + `ToolLoopAgent` | Native streaming, Neon Function compatible, low complexity |
| **Primary Model** | `anthropic/claude-3.5-sonnet` via **OpenRouter** | Best tool-calling reliability; free tier for dev; pay-as-you-go |
| **Fallback Models** | `openai/gpt-4o-mini`, `google/gemini-flash-1.5`, free tier models | Cost-effective fallbacks; auto-fallback on 429/5xx |
| **Auth** | Neon Auth (Managed Better Auth) | Branches with DB, JWT verification in Functions, OIDC for LTI |
| **Streaming** | SSE with heartbeat (`: ping\n\n` every 25s) | Survives Cloudflare/Vercel proxy timeouts |
| **Realtime** | Neon Realtime sealed queries | Teacher monitors student sessions live without polling |
| **Storage** | Neon Object Storage (S3-compatible) | Branches with DB, presigned URLs for student downloads |
| **Migrations** | `drizzle-kit generate` + `migrate` on `DATABASE_URL_UNPOOLED` | Per AGENTS.md: never `push` |
| **Offline** | Service Worker + IndexedDB outbox queue | Students draft messages offline, sync on reconnect |
| **Push** | Web Push API + VAPID | Assignment reminders, teacher interventions, session alerts |

---

## **4. Implementation Phases**

### **Phase 1: Foundation (Week 1)**
| Area | Deliverables |
|------|--------------|
| **Database** | Complete Drizzle schema: all tables, RLS policies, indexes, pgvector, enums, relations. Migration scripts via `drizzle-kit generate`. |
| **Neon Config** | `neon.ts` with `auth`, `realtime`, `functions`, `buckets` (NO `aiGateway`). Branch-per-teacher config with TTL. |
| **Auth** | Neon Auth setup: teacher email/OAuth, student LTI SSO flow. Trusted domains for preview/production. |
| **PWA Scaffold** | Next.js + `next-pwa`, manifest, icons, VAPID keys, service worker (caching, background sync), install prompt, offline fallback. |
| **Design System** | Tailwind + shadcn/ui primitives: tokens, layout, auth forms, error boundaries. |
| **CI/CD** | GitHub Actions: `neon checkout --create --env` + Vercel preview deployment. Branch env vars via Neon CLI. |

### **Phase 2: LTI Launch & Roster Sync (Week 1-2)**
| Area | Deliverables |
|------|--------------|
| **LTI 1.3 Core** | OIDC launch flow (LMS → Neon Auth session → Dashboard). Deep Linking (add tutor to assignment). |
| **NRPS (Roster Sync)** | Nightly Neon Function cron: sync Canvas/Classroom/Schoology rosters → `students` table. |
| **AGS (Grade Passback)** | Line item creation, score passback from tutor assessments. |
| **Teacher Dashboard v1** | Class roster view, tutor config panel (persona, guardrails, allowed tools, subject scope). |
| **Database** | LTI tables: `lti_platforms`, `lti_deployments`, `lti_nrps_cache`, sync cursors. |

### **Phase 3: Core Tutor Agent (Week 2)**
| Area | Deliverables |
|------|--------------|
| **Neon Function: `/chat`** | Streaming SSE, JWT auth, conversation persistence, model fallback chain (Sonnet → GPT-4o-mini → Gemini). |
| **Tools** | `searchKnowledgeBase` (pgvector RAG), `getAssignmentContext` (LMS assignment, rubric, due date). |
| **Student Chat UI** | `useChat` → direct Function URL, token minting, streaming render, offline queue (IndexedDB), push subscription. |
| **Teacher Dashboard v2** | Session list, live monitor via `useLiveQuery` (sealed Realtime queries), intervention controls (message/pause/redirect/end). |
| **Database** | Optimized queries for streaming append, conversation branching, token usage tracking. |

### **Phase 4: Interventions, Analytics & Push (Week 2-3)**
| Area | Deliverables |
|------|--------------|
| **Intervention Tools** | Teacher sends message, pauses, redirects, ends session — persisted + realtime. |
| **Analytics** | Session duration, topics covered, struggle areas, token usage. Materialized views refreshed via cron. |
| **Grade Passback** | Tutor assessments → LMS gradebook (Canvas/Classroom AGS). |
| **Push Notifications** | Web Push triggers: new assignment, teacher message, session reminder, streak alerts. |
| **Export Tools (Teacher)** | `exportToGoogleDoc`, `exportToGoogleForm`, `exportToSlides` as tutor-callable tools. |

### **Phase 5: Google/Microsoft 365 Integration (Week 3)**
| Area | Deliverables |
|------|--------------|
| **OAuth Flows** | Teacher: export to Drive/Docs/Forms/Slides. Student: import from Drive. Separate token storage. |
| **Export Tools** | "Create worksheet" → Google Doc, "Create quiz" → Google Form, "Create slides" → Slides. |
| **Import Tools** | "Use this reading passage" → import from Google Doc/Drive. |
| **Microsoft Parity** | OneDrive/Word/PowerPoint equivalents via Microsoft Graph. |
| **Database** | `generated_artifacts`, `export_jobs`, `oauth_tokens` (encrypted), file mappings. |

### **Phase 6: Compliance, Safety & Polish (Week 3-4)**
| Area | Deliverables |
|------|--------------|
| **Content Filter** | Pre-message filter via `gpt-4o-mini`: PII, inappropriate, cheating, FERPA/COPPA concerns. |
| **Audit Logging** | All actions → `audit_logs` table (user, action, resource, metadata, IP, UA). |
| **Retention Policies** | Automated cleanup cron: FERPA (1yr chats, 7yr audit), COPPA (delete on request). |
| **Parent Portal** | Read-only session viewer, progress summary, COPPA consent management. |
| **PWA Polish** | Install prompts, splash screens, offline cached lessons, "You're offline" banner, queued messages indicator. |
| **Load Test** | `hey -n 100 -c 10` → verify 15-min budget, concurrent isolation. |

---

## **5. Database Development (Explicit)**

### **Schema Files**
```
db/
├── schema/
│   ├── tenants.ts        # districts, schools
│   ├── users.ts          # teachers, students, parents
│   ├── classes.ts        # classes, tutor_config (JSONB)
│   ├── sessions.ts       # tutor_sessions, messages
│   ├── interventions.ts  # interventions
│   ├── lti.ts            # platforms, deployments, nrps_cache, ags_line_items
│   ├── artifacts.ts      # generated_artifacts, export_jobs, oauth_tokens
│   ├── audit.ts          # audit_logs
│   └── compliance.ts     # consent_records, data_deletion_requests, retention_policies
├── migrations/           # drizzle-kit generated SQL (committed)
├── rls.ts                # Row-level security policies
├── indexes.ts            # Performance indexes (tenant, session, time)
└── vector.ts             # pgvector setup: embeddings, HNSW indexes
```

### **Key Tables**
| Table | Purpose | RLS Policy |
|-------|---------|------------|
| `districts` | Top-level tenant | Admin only |
| `schools` | District children | District admin |
| `teachers` | Neon Auth user + LMS IDs | Teacher sees own |
| `classes` | Teacher's classes + tutor config | Teacher owns |
| `students` | Class members + LMS IDs + consent | Teacher sees class; student sees self |
| `tutor_sessions` | Active/ended tutoring sessions | Teacher sees class; student owns |
| `messages` | Chat messages + tool calls/results | Same as session |
| `interventions` | Teacher actions in student sessions | Teacher owns; student sees |
| `audit_logs` | All actions for compliance | Admin only |
| `lti_platforms` | Canvas/Classroom/Schoology config | District admin |
| `lti_nrps_cache` | Roster sync cache | Sync function only |
| `generated_artifacts` | Worksheets, quizzes, slides | Teacher owns; student views assigned |
| `oauth_tokens` | Encrypted Google/Microsoft tokens | User owns |
| `consent_records` | COPPA parent consent | Parent + admin |

---

## **6. Web UI Development (Explicit)**

### **Component Structure**
```
components/
├── auth/
│   ├── LTILaunch.tsx           # LTI 1.3 entry point
│   ├── SignIn.tsx              # Neon Auth email/OAuth
│   └── RoleSwitch.tsx          # Teacher ↔ Admin
├── teacher/
│   ├── ClassRoster.tsx         # Synced from LMS, editable
│   ├── TutorConfig.tsx         # Persona, guardrails, tools, subject
│   ├── SessionMonitor.tsx      # Realtime live view (useLiveQuery)
│   ├── InterventionPanel.tsx   # Message/pause/redirect/end
│   ├── AnalyticsDashboard.tsx  # Charts: duration, topics, tokens
│   ├── ExportTools.tsx         # Google/Microsoft export builders
│   └── GradePassback.tsx       # AGS status, manual override
├── student/
│   ├── ChatInterface.tsx       # useChat + streaming + markdown
│   ├── OfflineBanner.tsx       # "You're offline" + queue count
│   ├── MessageQueue.tsx        # IndexedDB outbox visualizer
│   ├── ArtifactViewer.tsx      # Render generated docs/quizzes
│   ├── PushSubscription.tsx    # Opt-in for notifications
│   └── ClassSelector.tsx       # Multi-class students
├── parent/
│   ├── ConsentForm.tsx         # COPPA consent flow
│   ├── SessionViewer.tsx       # Read-only child sessions
│   └── ProgressSummary.tsx     # Weekly/monthly digest
├── shared/
│   ├── Layout.tsx              # PWA shell, nav, install prompt
│   ├── DesignSystem.tsx        # Tokens, primitives (shadcn/ui)
│   ├── ErrorBoundary.tsx       # Graceful degradation
│   └── LoadingStates.tsx       # Skeletons, stream placeholders
└── admin/
    ├── DistrictSetup.tsx       # LMS config, standards import
    ├── AuditViewer.tsx         # Compliance logs
    └── RetentionPolicy.tsx     # Cleanup schedule config
```

### **Pages / Routes**
```
app/
├── (auth)/
│   ├── sign-in/
│   ├── lti/launch/             # LTI entry point
│   └── oauth/callback/         # Google/Microsoft
├── (teacher)/
│   ├── dashboard/
│   ├── classes/[classId]/
│   │   ├── configure/          # TutorConfig
│   │   ├── sessions/           # SessionMonitor + list
│   │   ├── analytics/
│   │   └── exports/
│   └── settings/
├── (student)/
│   ├── chat/[sessionId]/       # ChatInterface
│   ├── classes/
│   ├── artifacts/
│   └── notifications/
├── (parent)/
│   ├── consent/
│   ├── children/[studentId]/
│   └── progress/
└── (admin)/
    ├── districts/
    ├── audit/
    └── retention/
```

---

## **7. Validation & Quality Gates**

| Gate | Command / Check | Phase |
|------|-----------------|-------|
| **TypeScript** | `npm run typecheck` | All |
| **Lint** | `npm run lint` | All |
| **Build** | `npm run build` (Next.js + Hono) | All |
| **Drizzle Generate** | `npm run db:generate` | 1, 2, 5, 6 |
| **Drizzle Migrate** | `npm run db:migrate` (on `DATABASE_URL_UNPOOLED`) | 1, 2, 5, 6 |
| **Function Local** | `neon dev` → streaming + auth + tools + fallback | 3, 4 |
| **LTI Test** | Canvas dev key → launch → roster sync | 2 |
| **PWA Audit** | Lighthouse PWA ≥ 90, install works, offline loads | 1, 6 |
| **Push Test** | VAPID → send → receive on ChromeOS/Android/iOS 16.4+ | 4 |
| **Realtime Test** | Teacher dashboard → student chat → live updates | 3 |
| **Preview Deploy** | PR → Neon branch + Vercel preview → integration test | All |
| **Load Test** | `hey -n 100 -c 10 <function-url>` | 6 |
| **Compliance Audit** | FERPA/COPPA flow review with legal | 6 |

---

## **8. Critical Blockers (Resolve Before Coding)**

| Blocker | Action | Owner |
|---------|--------|-------|
| **OpenRouter API Key** | Sign up at openrouter.ai → add to Neon env vars | You |
| **LTI Developer Keys** | Register in Canvas/Classroom/Schoology dev portals | You |
| **Google Cloud Project** | Enable Drive, Docs, Forms, Slides, Classroom APIs; OAuth consent | You |
| **Microsoft Entra App** | Register for Microsoft Graph (Drive, OneDrive) | You |
| **VAPID Keys** | `npx web-push generate-vapid-keys` → add to env | You |
| **Neon Project** | Provision in `aws-us-east-2` (best Functions + Realtime) | You |
| **Custom Domain (optional)** | Purchase + configure in Vercel | You |

---

## **9. Cost Estimate (Monthly)**

| Service | Cost | Notes |
|---------|------|-------|
| **OpenRouter (LLM)** | **$10-50** | Pilot: 500 sessions/mo mixed models; free tier for dev |
| **Neon** | **$0** | Free tier: 0.5 GB, autoscaling, 10 branches, Functions, Realtime, Storage, Auth |
| **Vercel** | **$0** | Free tier: 100 GB bandwidth, unlimited personal projects |
| **LMS APIs** | **$0** | Free developer keys |
| **Google/Microsoft APIs** | **$0** | Free tiers sufficient |
| **Domain (optional)** | **~$12/yr** | Custom domain |
| **Total (pilot)** | **~$10-50/mo** | **Only OpenRouter is variable cost** |

---

## **10. Open Questions (Need Your Input)**

1. **Standards alignment**: Include CCSS/NGSS/state standards in knowledge base for RAG?
2. **Tutor persona config**: What parameters should teachers control? (tone, scaffolding level, allowed topics, refusal style, language)
3. **Student auth**: LTI-only, or also direct email/password for non-LMS schools?
4. **Pilot scope**: Start with 1 LMS (Canvas?) + 1 teacher + 1 class?
5. **Push notification triggers**: Which events? (new assignment, teacher message, session reminder, streak alerts, parent digest)
6. **Language support**: English only initially, or Spanish/other from start?
7. **Analytics depth**: Basic (duration, topics) or advanced (misconception detection, learning progression)?

---

## **11. Next Deliverables (Pick One to Start)**

| Deliverable | Includes |
|-------------|----------|
| **1. Drizzle Schema + Migration** | All tables, RLS, indexes, pgvector, enums, relations, `db:generate` script |
| **2. Neon `neon.ts` + CI/CD** | All services declared, branch-per-teacher config, GitHub Actions workflow |
| **3. Next.js + PWA Scaffold** | `next.config.js`, manifest, service worker, VAPID, layout, design system, auth pages |
| **4. Teacher Dashboard v1** | Class roster, tutor config panel, LTI launch integration |
| **5. Neon Function: Core Tutor** | Auth, streaming, OpenRouter, tool loop, fallback, persistence, Realtime subscribe |
| **6. Student Chat UI** | `useChat` + streaming, offline queue, push subscription, artifact viewer |

**Which deliverable should I generate first?**