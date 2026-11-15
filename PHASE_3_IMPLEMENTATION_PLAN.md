# Phase 3 Implementation Plan: LMS Integrations, i18n, Mobile, AI Tutor & Platform Hardening

## Executive Summary

**Timeline:** 3-4 months (iterative, no fixed deadline)  
**Team:** 1 solo developer  
**Constraints:** Free-tier services only | FERPA/COPPA/GDPR compliance | Neon Postgres + Vercel stack  
**Quality Standard:** **NO MOCKS** — Fully functional, production-ready system from start; real integrations, real testing

**Selected Goals (ALL):**
1. LMS Integrations (LTI 1.3 + Canvas + Google Classroom)
2. Advanced Analytics & Reporting → **DEFERRED to Phase 4**
3. Parent Portal Enhancements
4. Multi-language / i18n Support (next-intl) — ES/FR translations (AI + human review)
5. Mobile — PWA-first + Capacitor Android (no iOS/App Store for now)
6. AI Tutor Improvements (incremental) — OpenStax/Khan Academy OER for RAG
7. Admin Dashboard Enhancements
8. Performance & Scale Optimization

---

## Milestone Roadmap Overview

| Milestone | Duration | Focus | Key Deliverables |
|-----------|----------|-------|------------------|
| **M1** | 3-4 weeks | **Foundation: i18n + LTI Core + Compliance Hardening** | next-intl setup, LTI 1.3 library, consent/retention APIs, audit logging, ES/FR translation files |
| **M2** | 4-5 weeks | **LMS Integrations: Canvas + Google Classroom (REAL)** | LTI Platform/Deployment CRUD, NRPS sync, AGS line items/scores, Classroom API — tested on real Canvas Free for Teacher + real Google Cloud project |
| **M3** | 3-4 weeks | **Mobile: PWA + Capacitor Android + Parent Portal** | PWA enhancements, Capacitor Android build, push on Android, parent consent UX, student linking (NO iOS/App Store) |
| **M4** | 3-4 weeks | **AI Tutor Improvements + Platform Hardening** | Model routing, RAG with OpenStax Algebra I embeddings, vector search, performance optimization, observability |

**Total:** ~13-16 weeks (3.25-4 months)

---

## Detailed Milestone Plans

### M1: Foundation — i18n + LTI Core + Compliance Hardening (Weeks 1-4)

#### Scope: IN
- [ ] **next-intl integration** — App Router compatible, server components, middleware locale detection
- [ ] **Translation files** — `en.json`, `es.json`, `fr.json` (AI-generated + human review for ES/FR)
- [ ] **LTI 1.3 Core Library** — Abstract platform-agnostic (OIDC launch, JWT validation, NRPS/AGS clients)
- [ ] **LTI Database Schema** — Already exists (`lti_platforms`, `lti_deployments`, `nrps_cache`, `ags_line_items`, `ags_scores`)
- [ ] **Admin LTI Management UI** — Platform/Deployment CRUD (builds on existing `(admin)/districts` page)
- [ ] **Compliance Hardening** — Consent versioning, data deletion workflow, retention job automation
- [ ] **Audit Logging Enhancement** — Structured events for LTI launches, consent changes, data exports
- [ ] **Middleware Route Protection** — `(admin)`, `(parent)`, `(teacher)`, `(student)` route groups

#### Scope: OUT
- Canvas/Classroom specific implementations
- Mobile builds
- Advanced analytics
- AI Tutor RAG/vector search

#### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **i18n Library** | `next-intl` v4+ | Best Next.js 15+ App Router support, type-safe translations, server component compatible, middleware-based locale routing |
| **Locale Strategy** | Subpath routing (`/en/...`, `/es/...`) + cookie fallback | SEO-friendly, works with middleware, no domain complexity |
| **LTI Library** | **Custom thin wrapper** around `openid-client` + `jsonwebtoken` | Avoid heavy frameworks (ltijs, lti-1p3) that assume Express; Neon Functions + Next.js need lightweight, tree-shakable code |
| **NRPS/AGS Clients** | Separate typed clients per service | Clear separation, testable, platform-agnostic interfaces |
| **Consent Versioning** | Semantic version in `consentRecords.version` + `policyUrl` | Audit trail, re-consent triggers on version bump |

#### Key Files to Create/Modify

```
# i18n
src/i18n/
  request.ts                 # getRequestConfig for next-intl
  routing.ts                 # defineRouting (locales, defaultLocale, pathnames)
  middleware.ts              # createMiddleware for locale detection
  navigation.ts              # createNavigation (Link, redirect, usePathname, useRouter)
  locales/
    en.json                  # English (default)
    es.json                  # Spanish (AI-translated + human reviewed)
    fr.json                  # French (AI-translated + human reviewed)

src/middleware.ts            # Combine: locale + auth role protection

# LTI Core
src/lib/lti/
  index.ts                   # Public API exports
  types.ts                   # Platform-agnostic interfaces
  oidc.ts                    # OIDC launch initiation + callback validation
  jwt.ts                     # JWT verification (JWKS caching, key rotation)
  nrps.ts                    # Names & Role Provisioning Service client
  ags.ts                     # Assignment & Grade Service client
  platform.ts                # Platform abstraction (Canvas, Classroom, generic)

# Admin LTI UI
src/app/(admin)/lti/
  platforms/page.tsx         # List/create LTI platforms
  platforms/[id]/page.tsx    # Platform detail + key rotation
  deployments/page.tsx       # List/create deployments
  deployments/[id]/page.tsx  # Deployment detail + NRPS/AGS config

# Compliance
src/app/api/compliance/
  consent/route.ts           # GET/POST consent (versioned)
  consent/[id]/route.ts      # PATCH withdraw, GET history
  deletion/route.ts          # POST request, GET status
  retention/route.ts         # Admin: CRUD policies + trigger jobs
```

#### Validation Criteria (M1)
```bash
# Code quality
npm run type-check
npm run lint
npm run build

# Database
npm run db:generate
npm run db:migrate
npm run db:check

# i18n
# - Locale switching works via middleware
# - Translations render in server/client components
# - Date/number formatting respects locale
# - ES/FR translation files present and complete (no missing keys vs en.json)

# LTI Core
# - OIDC launch initiates correctly (real Canvas Free for Teacher instance)
# - JWT validation passes with JWKS rotation
# - NRPS client types compile
# - AGS client types compile

# Compliance
# - Consent versioning enforced (re-consent on version change)
# - Data deletion request flow: request → verify → schedule → execute
# - Retention jobs runnable via admin UI

# Tests
npm run test              # Unit tests pass
npm run test:e2e          # Critical paths: auth, LTI launch, consent
```

#### Compliance Checklist (M1)
| Requirement | Implementation | Verification |
|-------------|----------------|--------------|
| **FERPA** | Consent type `ferpa_consent` required for student data access | Parent must grant before viewing child data |
| **COPPA** | `parental_consent` + `coppa_consent` for students <13 | Age gate on sign-up; parent flow required |
| **GDPR** | `gdpr_consent`, data deletion requests, retention policies | Art. 17 deletion workflow; Art. 30 records via audit logs |
| **Data Minimization** | LTI NRPS sync only pulls required fields (name, email, roles) | Schema validation on `nrpsCache.rawData` |
| **Audit Trail** | All consent changes, LTI launches, data exports logged | `audit_logs` with `action`, `severity`, `metadata` |

#### Cost Analysis (M1)
| Service | Free Tier | Projected Cost |
|---------|-----------|----------------|
| Neon Postgres | 0.5 GB storage, 190 hrs compute/mo | $0 (within limits) |
| Vercel | 100 GB bandwidth, unlimited personal projects | $0 |
| OpenRouter | Free models only (enforced by code) | $0 |
| Neon Auth | 10k MAU free | $0 |
| Neon Functions | 100k invocations/mo | $0 |
| Neon Object Storage | 1 GB free | $0 |

---

### M2: LMS Integrations — Canvas + Google Classroom (Weeks 5-9)

#### Scope: IN
- [ ] **Canvas LTI 1.3 Platform (REAL)** — Platform registration on Canvas Free for Teacher instance, key management, NRPS roster sync, AGS score passback
- [ ] **Google Classroom API (REAL)** — OAuth2 via real Google Cloud project, CourseWork/StudentSubmission sync, grade push (separate from LTI)
- [ ] **Unified Sync Engine** — Scheduled Neon Function for NRPS + Classroom roster sync
- [ ] **Admin Sync Monitoring** — Dashboard showing last sync, errors, manual trigger
- [ ] **Deep Linking** — LTI Resource Link + Deep Linking for assignment launch
- [ ] **Grade Passback** — AGS line items → Canvas; Classroom API → CourseWork grades

#### Scope: OUT
- Mobile builds
- Parent portal UX
- AI Tutor improvements
- Advanced analytics
- Mock/simulation testing — ALL testing on real platforms

#### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Canvas Integration** | LTI 1.3 only (no Canvas REST API) | LTI Advantage (NRPS+AGS+DeepLinking) covers roster + grades; avoids separate OAuth; tested on real Canvas Free for Teacher |
| **Google Classroom** | Classroom API (OAuth2) + optional LTI | Classroom doesn't fully support LTI Advantage; API needed for CourseWork/Submissions; tested on real Google Cloud project |
| **Sync Engine** | Neon Function (cron) | Runs next to DB, branches with data, no external scheduler needed |
| **Token Storage** | `oauthTokens` table (encrypted) | Per-user tokens for Classroom API; LTI uses platform-level keys |
| **Error Handling** | Dead letter queue + admin alerts | Failed syncs retry with backoff; alert on repeated failures |
| **Testing Approach** | **NO MOCKS** — Real Canvas instance + Real Google Cloud project | Production-ready from day one; catches real API quirks, rate limits, auth flows |

#### Key Files to Create/Modify

```
# Canvas LTI 1.3
src/lib/lti/platforms/
  canvas.ts                  # Canvas-specific: NRPS context memberships, AGS line items

src/lib/lti/sync/
  nrps-sync.ts               # Generic NRPS membership sync (Canvas + other LTI)
  ags-sync.ts                # Grade passback queue processor

# Google Classroom
src/lib/classroom/
  index.ts                   # Public API
  auth.ts                    # OAuth2 flow, token refresh, scopes
  courses.ts                 # Course/roster sync
  coursework.ts              # Assignment/submission sync
  grades.ts                  # Grade push to Classroom

src/app/api/classroom/
  auth/route.ts              # OAuth callback
  sync/route.ts              # Manual sync trigger
  webhook/route.ts           # Classroom push notifications (optional)

# Sync Engine (Neon Function)
src/functions/lti-sync.ts    # Cron: NRPS + Classroom roster sync
src/functions/ags-push.ts    # Cron: Grade passback queue processor

# Admin Sync UI
src/app/(admin)/lti/
  sync/page.tsx              # Sync status, logs, manual triggers
  canvas/page.tsx            # Canvas-specific config
  classroom/page.tsx         # Classroom OAuth + config
```

#### Validation Criteria (M2)
```bash
# Code quality
npm run type-check && npm run lint && npm run build

# Database
npm run db:generate && npm run db:migrate && npm run db:check

# Canvas LTI 1.3 (REAL Canvas Free for Teacher instance)
# - Platform registration flow works with real Canvas dev keys
# - OIDC launch → student lands in tutor session (real LTI launch)
# - NRPS sync: roster appears in `nrpsCache` table (real Canvas enrollments)
# - AGS: line item created, score passed back, appears in Canvas gradebook (real)
# - Deep linking: teacher creates assignment from tutor (real Canvas)

# Google Classroom (REAL Google Cloud project)
# - OAuth2 flow: teacher connects Classroom account (real Google OAuth)
# - Courses sync: classes appear in tutor platform (real Classroom courses)
# - CourseWork sync: assignments bidirectional (real assignments/submissions)
# - Grade push: tutor score → Classroom gradebook (real grades)

# Sync Engine
# - Neon Function deploys and runs on cron
# - Manual trigger from admin UI works
# - Error handling: failed syncs logged, retry works

# Tests
npm run test && npm run test:e2e
# ALL E2E tests run against REAL integrations — NO MOCKS
```

#### Compliance Checklist (M2)
| Requirement | Canvas LTI | Google Classroom API |
|-------------|------------|---------------------|
| **FERPA** | LTI launch includes `lis_person_sourced_id` (not PII) | OAuth scopes: `classroom.rosters.readonly`, `classroom.coursework.students.readonly` |
| **COPPA** | No student <13 data without parental consent | Same — filter by age before sync |
| **GDPR** | Data processing agreement via LTI platform config | Google DPA covers Classroom API; document in `consentRecords` |
| **Data Minimization** | NRPS: only name, email, roles | Request minimal scopes; don't sync guardian data unless needed |
| **Retention** | `nrpsCache.expiresAt` auto-cleanup | Sync metadata retained per `retentionPolicies` |

#### Cost Analysis (M2)
| Service | Free Tier | Notes |
|---------|-----------|-------|
| Canvas LTI | Free for LTI Advantage (Instructure) | Developer keys free in test instance |
| Google Classroom API | Free (standard quotas) | 10k requests/day/user; apply for quota increase if needed |
| Neon Functions | 100k invocations/mo | Cron every 15 min = ~3k/mo; well within limit |
| Neon Object Storage | 1 GB | For LTI platform icons, cached JWKS |

---

### M3: Mobile: PWA + Capacitor Android + Parent Portal Enhancements (Weeks 10-13)

#### Scope: IN
- [ ] **PWA Enhancements** — Optimize existing PWA for mobile (performance, installability, offline)
- [ ] **Capacitor Android Only** — Android project, native plugins (NO iOS)
- [ ] **Push Notifications on Android** — FCM via Capacitor Push Notifications
- [ ] **Offline Support** — Enhanced SW + IndexedDB queue (already in Phase 2) works in WebView
- [ ] **Parent Portal UX** — Consent management, student linking, progress views (mobile-responsive)
- [ ] **Student Linking Flow** — Parent invites student / admin links parent to student
- [ ] **Play Store Prep** — Icons, splash screens, data safety form, store listing

#### Scope: OUT
- iOS / App Store (deferred indefinitely)
- Native-only features (camera, biometrics) — can add later
- Advanced analytics
- AI Tutor improvements
- APNs / iOS push notifications

#### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Mobile Approach** | PWA-first + Capacitor Android wrapper | Shares 95%+ code; PWA already has SW, offline, manifest; Android only = no Apple Dev cost |
| **Build Process** | `next build` → `cap copy` → `cap sync` → Android Studio | Capacitor workflow for Android only; CI/CD via GitHub Actions + Fastlane (Android) |
| **Push on Mobile** | Capacitor Push Notifications + Firebase (FCM only) | Unified API; Neon Functions already send web push; extend to Android tokens only |
| **Auth Persistence** | Capacitor Preferences / Secure Storage | Persist Neon Auth session across app restarts |
| **Deep Links** | `aitutor://` custom scheme + Android App Links | LTI launch from LMS app → open mobile app (Android) |
| **Biometrics** | Defer to Phase 4 | Not needed for MVP; Capacitor Biometrics plugin available later |
| **iOS** | **Excluded** — No Apple Developer Program ($99/yr), no App Store | PWA works on iOS Safari; native iOS deferred indefinitely |

#### Key Files to Create/Modify

```
# Capacitor Config
capacitor.config.ts          # App ID, plugins, Android config only
android/app/                 # Generated (cap add android)

# Mobile-Specific Code
src/lib/mobile/
  push.ts                    # Capacitor push registration + token sync to DB (Android FCM)
  auth.ts                    # Session persistence (Secure Storage)
  deeplinks.ts               # Handle aitutor:// LTI launches (Android App Links)
  haptics.ts                 # Optional: haptic feedback

# Push Integration
src/lib/push/server.ts       # Extend: send to mobile tokens (FCM only)
src/app/api/push/subscribe/route.ts  # Accept mobile tokens (platform: 'android')

# Parent Portal
src/app/(parent)/
  link-student/page.tsx      # Parent invites/links student
  consent/page.tsx           # Enhanced: versioned consent, multi-lang
  children/[id]/page.tsx     # Mobile-responsive, touch-friendly

# Build/CI
.github/workflows/
  mobile-build.yml           # Build Android artifacts only
  mobile-deploy.yml          # Fastlane to Play Console Internal
```

#### Validation Criteria (M3)
```bash
# Code quality
npm run type-check && npm run lint && npm run build

# Capacitor (Android only)
npx cap sync                 # Sync web assets to Android project
npx cap build android        # Gradle build succeeds

# Mobile Push
# - Android: FCM token registered, test notification received
# - Web push still works (no regression)

# PWA
# - Installable on Android Chrome
# - Offline support works in PWA and Capacitor WebView
# - Lighthouse PWA score > 90

# Parent Portal
# - Consent flow works in mobile browser + Capacitor app
# - Student linking: parent enters code / admin approves
# - Progress views responsive on mobile viewport

# Deep Links
# - aitutor://launch?lti=... opens app to session
# - Android App Links configured

# Tests
npm run test && npm run test:e2e
# Mobile E2E: Playwright mobile (Android emulator)
```

#### Compliance Checklist (M3)
| Requirement | Implementation |
|-------------|----------------|
| **FERPA** | Parent portal only shows linked children; mobile app enforces same RLS |
| **COPPA** | Age gate on mobile sign-up; parental consent required before student data |
| **GDPR** | Data deletion request accessible from mobile app; privacy policy in app |
| **Mobile Privacy** | iOS Privacy Manifest (NSPrivacyTracking=FALSE); Android Data Safety form |
| **Push Consent** | Explicit opt-in for push notifications (separate consent type) |

#### Cost Analysis (M3)
| Service | Free Tier | Notes |
|---------|-----------|-------|
| Capacitor | Free (OSS) | No cost |
| Firebase (FCM) | Free unlimited | Required for Android push |
| Google Play Console | $25 one-time | Required for Android store |
| Fastlane | Free (OSS) | CI/CD automation |
| GitHub Actions | 2000 min/mo free | Sufficient for mobile builds |

**Budget Note:** **No Apple Developer Program cost** — iOS/App Store excluded. PWA works on iOS Safari. Only hard cost is $25 Google Play Console (one-time).

---

### M4: AI Tutor Improvements + Platform Hardening (Weeks 14-17)

#### Scope: IN
- [ ] **Smart Model Routing** — Fallback chain, cost tracking, per-request model selection
- [ ] **RAG / Knowledge Retrieval** — OpenStax/Khan Academy OER (Algebra I), pgvector embeddings, hybrid search
- [ ] **Multi-modal Support** — Math notation (KaTeX), image analysis (free vision models), code execution
- [ ] **Personalization** — Student learning profiles, mastery-based progression, adaptive scaffolding
- [ ] **Performance Optimization** — Query optimization, connection pooling, caching strategy
- [ ] **Observability** — Structured logs, metrics, traces (Vercel + Neon Logs)
- [ ] **Load Testing** — k6 scripts, bottleneck identification

#### Scope: OUT
- New major features
- Additional LMS platforms
- Mock/simulation testing — ALL testing on real integrations

#### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Model Routing** | Extend `src/lib/ai/openrouter.ts` with cost/latency tracking | Already has fallback chain; add telemetry + per-user model prefs |
| **Vector Search** | Neon Lakebase Search (pgvector + BM25 hybrid) | Built into Neon; no separate vector DB; branches with data |
| **Embeddings** | Neon AI Gateway (free tier) or local `bge-small-en-v1.5` | AI Gateway: one API, free embeddings; local: zero cost, runs in Function |
| **RAG Content Source** | **OpenStax Algebra I + Khan Academy Algebra I (OER)** | Freely available, curriculum-aligned, CC-BY license; no licensing costs |
| **RAG Pipeline** | Neon Function (cron) for ingestion; query-time retrieval in tutor | Ingestion: chunk OER PDFs/HTML → embeddings → `studentLearningEmbeddings` |
| **Math/Code** | KaTeX rendering + free code execution (Pyodide in browser) | No server cost; Pyodide runs in WebWorker |
| **Observability** | Vercel Logs + Neon Logs (Loki/Grafana) | Already in stack; add structured logging + custom metrics |

#### Key Files to Create/Modify

```
# AI Tutor Core
src/lib/ai/
  openrouter.ts              # Enhance: model routing, cost tracking, telemetry
  routing.ts                 # New: smart model selection (task-type → model)
  rag.ts                     # New: retrieval + context injection
  embeddings.ts              # New: embedding generation (AI Gateway or local)
  multimodal.ts              # New: image/code handling

# Neon Functions (AI)
src/functions/
  tutor.ts                   # Enhance: RAG context, personalization
  rag-ingest.ts              # Cron: OpenStax/Khan Academy Algebra I ingestion → embeddings
  analytics-aggregate.ts     # Cron: pre-compute analytics for dashboards

# Vector Search
db/schema/vector.ts          # Already exists: studentLearningEmbeddings
db/rls.ts                    # Add RLS for embeddings table

# OER Content Processing
src/lib/oer/
  openstax.ts                # New: OpenStax Algebra I fetch/parse/chunk
  khanacademy.ts             # New: Khan Academy Algebra I fetch/parse/chunk
  chunking.ts                # New: semantic chunking for math content

# Observability
src/lib/observability/
  logger.ts                  # Structured logging (pino-compatible)
  metrics.ts                 # Custom metrics (counters, histograms)
  tracing.ts                 # OpenTelemetry integration (optional)

# Performance
src/lib/db/
  pool.ts                    # Connection pool tuning
  cache.ts                   # Redis-like caching (Neon Object Storage or in-memory)
```

#### Validation Criteria (M4)
```bash
# Code quality
npm run type-check && npm run lint && npm run build

# Database
npm run db:generate && npm run db:migrate && npm run db:check

# AI Tutor
# - Model fallback chain works (simulate 429 → next model)
# - RAG: query returns relevant OpenStax/Khan Academy Algebra I chunks
# - Embeddings: generated and stored for OER content
# - Multi-modal: math renders, code executes in Pyodide
# - Personalization: student profile affects scaffolding level

# Performance
# - P95 API latency < 500ms (local load test)
# - Connection pool: no exhaustion under 50 concurrent users
# - Cache hit rate > 80% for repeated queries

# Observability
# - Structured logs in Vercel/Neon
# - Custom metrics visible (request duration, model tokens, errors)
# - Alert on error rate > 5%

# Load Test
npx k6 run scripts/load-test.js  # 50 VU, 5 min, pass thresholds

# Tests
npm run test && npm run test:e2e
# ALL tests use REAL integrations — NO MOCKS
```

#### Compliance Checklist (M4)
| Requirement | Implementation |
|-------------|----------------|
| **FERPA** | AI prompts never include raw PII; use pseudonymized student IDs |
| **COPPA** | No behavioral profiling of students <13 without parental consent |
| **GDPR** | Right to explanation: log model decisions affecting students; data portability for learning profiles |
| **AI Transparency** | Disclose AI use in consent; opt-out for AI-generated content |
| **Data Retention** | Embeddings + learning profiles follow `retentionPolicies` |

#### Cost Analysis (M4)
| Service | Free Tier | Notes |
|---------|-----------|-------|
| OpenRouter Free Models | Unlimited (rate limited) | Current constraint; routing optimizes within free tier |
| Neon AI Gateway | Free embeddings + LLM calls | One API key; routes to Databricks models |
| pgvector (Neon) | Included in compute | No extra cost |
| Pyodide (client-side) | Free | Runs in browser |
| Vercel Observability | Free tier logs/metrics | Sufficient for dev/staging |
| k6 Cloud | Free tier (50 VU) | Local k6 is free unlimited |

---

## Cross-Milestone Dependencies

```
M1 (Foundation)
  │
  ├──→ M2 (LMS) needs: i18n middleware, LTI core types, admin auth, audit logging, ES/FR translations
  │
  ├──→ M3 (Mobile) needs: i18n (parent portal), push server (mobile tokens), auth persistence
  │
  └──→ M4 (AI) needs: i18n (multi-lang tutor), vector schema, observability foundation

M2 (LMS) ──────────────→ M3 (Mobile) : LTI launch deep links → Android app
M2 (LMS) ──────────────→ M4 (AI)     : Grade passback data → learning analytics

M3 (Mobile) ───────────→ M4 (AI)     : Mobile usage telemetry → model routing
```

---

## Technical Debt & Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Solo developer bandwidth** | Milestone slippage | High | Strict scope guardrails; defer non-critical to Phase 4; weekly progress review |
| **LTI 1.3 complexity** | Integration delays | Medium | Start with Canvas Free for Teacher instance; use existing `lti` schema; thin wrapper over `openid-client` |
| **Google Classroom API quotas** | Sync failures at scale | Low (dev phase) | Implement exponential backoff; cache rosters; request quota increase early |
| **Neon Functions cold starts** | Tutor latency spikes | Medium | Keep functions warm (cron ping); use connection pooling; consider edge runtime for simple ops |
| **i18n translation maintenance** | Stale translations | Medium | Start with en/es/fr; use CI to detect missing keys; crowdsource later |
| **Push notification reliability** | Missed interventions | Medium | Dual-channel (web push + Android push); in-app notification center as fallback |
| **RAG quality on free embeddings** | Poor retrieval | Medium | Curate OER chunks; hybrid search (vector + BM25); human-in-loop for critical content |
| **Database migration conflicts** | Schema drift | Low | Solo dev = linear migrations; `db:check` in CI; branch-per-feature in Neon |
| **NO MOCKS constraint** | Slower initial dev | Medium | Invest in real test environments early (Canvas Free, Google Cloud); catches bugs sooner |

---

## Compliance Checklist Summary (All Milestones)

| Regulation | M1 | M2 | M3 | M4 | Ongoing |
|------------|----|----|----|----|---------|
| **FERPA** | Consent gating, audit logs | LTI PII minimization | Parent portal access control | AI pseudonymization | Annual audit |
| **COPPA** | Age gate, parental consent | Filter <13 from sync | Mobile age gate | No profiling <13 | Verifiable parental consent |
| **GDPR** | Deletion workflow, retention | DPA documentation | Privacy manifest, data safety | Right to explanation, portability | DPIA for AI processing |
| **State Laws (CCPA, etc.)** | `state_privacy_law` consent type | Opt-out mechanisms | Mobile privacy labels | AI transparency | Monitor new legislation |

**Key Compliance Artifacts to Maintain:**
- `consentRecords` with versioned policies
- `audit_logs` with structured metadata
- `retentionPolicies` per data category
- `dataDeletionRequests` workflow
- Privacy Policy / Terms of Service (versioned in repo)

---

## Cost Analysis Summary (Free-Tier Focus)

| Category | Monthly Cost | Annual Cost | Notes |
|----------|--------------|-------------|-------|
| **Neon (Postgres + Auth + Functions + Storage + AI Gateway)** | $0 | $0 | Within free tier limits |
| **Vercel (Hosting + Logs + Analytics)** | $0 | $0 | Personal plan sufficient |
| **OpenRouter (Free Models)** | $0 | $0 | Enforced by code |
| **Firebase (FCM)** | $0 | $0 | Unlimited |
| **Google Play Console** | — | **$25** | One-time (Android only) |
| **Domain / SSL** | $0 | $0 | Vercel provides |
| **Monitoring (Sentry, etc.)** | $0 | $0 | Use Vercel/Neon built-in |
| **Total (Year 1)** | — | **~$25** | **No Apple Developer cost** — iOS/App Store excluded |

**Scaling Triggers (when free tier exceeded):**
- Neon: >0.5 GB storage or >190 compute hrs/mo → $19/mo scale plan
- Vercel: >100 GB bandwidth → $20/mo Pro
- OpenRouter: Need paid models → budget per usage
- Firebase: >1M messages/mo → Blaze plan (pay as you go)

---

## Validation Criteria Per Milestone

| Check | M1 | M2 | M3 | M4 |
|-------|----|----|----|----|
| `npm run type-check` | ✅ | ✅ | ✅ | ✅ |
| `npm run lint` | ✅ | ✅ | ✅ | ✅ |
| `npm run build` | ✅ | ✅ | ✅ | ✅ |
| `npm run db:generate` | ✅ | ✅ | ✅ | ✅ |
| `npm run db:migrate` | ✅ | ✅ | ✅ | ✅ |
| `npm run db:check` | ✅ | ✅ | ✅ | ✅ |
| `npm run test` (unit) | ✅ | ✅ | ✅ | ✅ |
| `npm run test:e2e` (Playwright) | Critical paths | LTI + Classroom (REAL) | PWA + Android + Parent | AI + Perf (REAL) |
| **Mobile Build** | — | — | Android only | Regression |
| **Load Test (k6)** | — | — | — | ✅ 50 VU |
| **Compliance Review** | Consent + Audit + i18n | LTI + Classroom | Android Privacy + PWA | AI Transparency |

---

## Team Capacity Assumptions (Solo Developer)

| Assumption | Detail |
|------------|--------|
| **Weekly Capacity** | 25-30 focused hours/week (nights/weekends) |
| **Parallel Work** | None — strictly sequential milestones |
| **Code Review** | Self-review + AI-assisted (GitHub Copilot) |
| **Testing** | Unit tests for all new logic; E2E for critical paths only |
| **Documentation** | Inline code comments + README updates; no separate docs site |
| **Deployment** | Vercel preview on every push; production on main merge |
| **Database Branching** | Neon branch per milestone; reset from parent at milestone start |
| **Risk Buffer** | 20% time buffer per milestone (built into week ranges) |

---

## Open Questions / Decisions Needed

1. **Canvas Developer Instance** — **CONFIRMED:** Canvas Free for Teacher instance available for LTI 1.3 development (M2)
2. **Google Cloud Project** — **CONFIRMED:** Can create Google Cloud project for Classroom API + OAuth consent screen (M2)
3. **Translation Source** — **DECIDED:** AI-translate ES/FR + human review → M1 includes translation files
4. **Apple Developer Account** — **DECIDED:** No Apple iOS deployment for now — Skip App Store, use PWA + Capacitor Android only
5. **Curriculum Content for RAG** — **DECIDED:** Use OpenStax/Khan Academy OER (Algebra I) → M4 sources freely available content
6. **Domain Name** — Custom domain for production? (Vercel provides `*.vercel.app` free)
7. **Analytics Deferred** — Confirm Phase 4 will cover teacher/admin/parent analytics dashboards
8. **Neon AI Gateway** — Enable for embeddings? (Free, one API key, branches with project)
9. **NO MOCKS Policy** — **CONFIRMED:** Build fully functional, production-ready system from start (all milestones)

---

## Appendix: File Structure Reference (Post-Phase 3)

```
src/
├── app/
│   ├── (admin)/
│   │   ├── districts/           # M1: existing
│   │   ├── lti/                 # M1-M2: NEW
│   │   │   ├── platforms/
│   │   │   ├── deployments/
│   │   │   └── sync/
│   │   └── compliance/          # M1: NEW
│   ├── (parent)/
│   │   ├── children/[id]/       # M3: enhanced
│   │   ├── consent/             # M1+M3: enhanced
│   │   └── link-student/        # M3: NEW
│   ├── (teacher)/               # Existing
│   ├── (student)/               # Existing
│   ├── api/
│   │   ├── lti/                 # M2: NEW
│   │   ├── classroom/           # M2: NEW
│   │   ├── compliance/          # M1: NEW
│   │   └── push/                # M1+M3: enhanced
│   └── [locale]/                # M1: next-intl routing
│       ├── layout.tsx
│       └── page.tsx
├── components/
│   ├── admin/                   # M1-M2: LTI UI
│   ├── parent/                  # M3: Mobile-responsive
│   ├── teacher/                 # Existing
│   └── ui/                      # Existing
├── functions/                   # Neon Functions
│   ├── tutor.ts                 # M4: enhanced
│   ├── lti-sync.ts              # M2: NEW
│   ├── ags-push.ts              # M2: NEW
│   └── rag-ingest.ts            # M4: NEW
├── hooks/                       # Existing
├── i18n/                        # M1: NEW
│   ├── locales/
│   │   ├── en.json
│   │   ├── es.json              # AI-translated + human reviewed
│   │   └── fr.json              # AI-translated + human reviewed
│   ├── request.ts
│   ├── routing.ts
│   ├── middleware.ts
│   └── navigation.ts
├── lib/
│   ├── ai/                      # M4: enhanced
│   │   ├── openrouter.ts
│   │   ├── routing.ts
│   │   ├── rag.ts
│   │   ├── embeddings.ts
│   │   └── multimodal.ts
│   ├── lti/                     # M1-M2: NEW
│   │   ├── platforms/
│   │   ├── sync/
│   │   ├── oidc.ts
│   │   ├── jwt.ts
│   │   ├── nrps.ts
│   │   ├── ags.ts
│   │   └── platform.ts
│   ├── classroom/               # M2: NEW
│   │   ├── auth.ts
│   │   ├── courses.ts
│   │   ├── coursework.ts
│   │   └── grades.ts
│   ├── mobile/                  # M3: NEW (Android only)
│   │   ├── push.ts
│   │   ├── auth.ts
│   │   ├── deeplinks.ts
│   │   └── haptics.ts
│   ├── oer/                     # M4: NEW
│   │   ├── openstax.ts
│   │   ├── khanacademy.ts
│   │   └── chunking.ts
│   ├── observability/           # M4: NEW
│   │   ├── logger.ts
│   │   ├── metrics.ts
│   │   └── tracing.ts
│   ├── push/                    # Existing + M3 mobile
│   ├── auth/                    # Existing
│   ├── db/                      # Existing
│   └── utils/                   # Existing
├── middleware.ts                # M1: locale + auth
├── db/
│   ├── schema/                  # Existing (LTI, compliance, vector)
│   └── migrations/              # Auto-generated
└── tests/                       # Playwright + Vitest

capacitor.config.ts              # M3: NEW (Android config)
android/                         # M3: Generated (Android only)
.github/workflows/
├── e2e.yml                      # Existing
├── mobile-build.yml             # M3: NEW (Android only)
└── mobile-deploy.yml            # M3: NEW (Play Console)
```

---

## Next Steps

1. **Confirm open questions** (Canvas instance, Google Cloud, translations, Apple Dev budget)
2. **Create M1 branch in Neon** — `git checkout -b phase3-m1 && neon branches create phase3-m1`
3. **Set up next-intl** — `npm install next-intl` + configure routing
4. **Build LTI Core types** — Start with `src/lib/lti/types.ts` interfaces
5. **Weekly sync** — Review progress, adjust scope, unblock dependencies

---

*Plan created: 2026-11-14 | Version: 1.1 | Author: Planning Subagent | Updated with confirmed decisions: No iOS, Real Canvas/Classroom, AI translations ES/FR, OpenStax RAG, NO MOCKS*