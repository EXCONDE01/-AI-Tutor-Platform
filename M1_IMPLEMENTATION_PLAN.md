# M1 Implementation Plan: i18n + LTI Core + Compliance Hardening (3 Weeks)

**Timeline:** 3 weeks (aggressive) | **Focus:** Foundation for all subsequent milestones  
**Stack:** Next.js 16 App Router, Neon Postgres, Drizzle ORM, @neon/auth, next-intl v4+, OpenRouter (free models)

---

## Week 1: next-intl i18n Setup + Translation Infrastructure

### 1.1 Install & Configure next-intl

| Task | Files to Create/Modify | Validation |
|------|------------------------|------------|
| Install next-intl | `package.json` (add `next-intl@^4.0.0`) | `npm install` succeeds |
| Create routing config | `src/i18n/routing.ts` | Type-check passes |
| Create request config | `src/i18n/request.ts` | Type-check passes |
| Create navigation helpers | `src/i18n/navigation.ts` | Type-check passes |
| Create middleware | `src/i18n/middleware.ts` | Type-check passes |
| Create locale message files | `src/i18n/locales/en.json`, `es.json`, `fr.json` | Build passes |
| Update root layout | `src/app/[locale]/layout.tsx` (new) | Build passes |
| Update middleware.ts | `src/middleware.ts` (combine locale + auth) | Build passes |

#### `src/i18n/routing.ts`
```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es', 'fr'] as const,
  defaultLocale: 'en',
  localePrefix: 'always', // /en/, /es/, /fr/
  pathnames: {
    '/': '/',
    '/teacher/dashboard': '/teacher/dashboard',
    '/student/chat': '/student/chat',
    // Add all existing routes here
  },
});
```

#### `src/i18n/request.ts`
```typescript
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ locale }) => {
  const messages = (await import(`./locales/${locale}.json`)).default;
  return { messages, locale };
});
```

#### `src/i18n/middleware.ts`
```typescript
import { createMiddleware } from 'next-intl/middleware';
import { routing } from './routing';

export default createMiddleware(routing);
export const config = { matcher: ['/', '/(teacher|student|parent|admin)/:path*'] };
```

### 1.2 Restructure App Router for `[locale]` Segment

| Task | Files to Create/Modify | Validation |
|------|------------------------|------------|
| Create `[locale]` layout | `src/app/[locale]/layout.tsx` | Build passes |
| Move all routes under `[locale]` | Restructure `src/app/*` → `src/app/[locale]/*` | All routes accessible |
| Update all `Link` imports | Use `next-intl/navigation` Link | Type-check passes |
| Update all redirects | Use `next-intl/navigation` redirect | Type-check passes |
| Update `usePathname`/`useRouter` | Use `next-intl/navigation` hooks | Type-check passes |

### 1.3 English Message File (Complete)

| Task | File | Validation |
|------|------|------------|
| Extract all UI strings | `src/i18n/locales/en.json` | No hardcoded strings in components |
| Include: nav, buttons, forms, errors, dates, numbers | | |
| Add metadata for SEO | | |

### 1.4 Locale Switcher Component

| Task | Files to Create/Modify | Validation |
|------|------------------------|------------|
| Create `LocaleSwitcher` | `src/components/shared/locale-switcher.tsx` | Renders in header |
| Add to Header/Nav | `src/components/shared/nav.tsx` | Switches locale correctly |
| Persist locale in cookie | Middleware handles | Cookie set on switch |

---

## Week 2: LTI 1.3 Core Types & Platform Setup

### 2.1 LTI 1.3 Type Definitions

| Task | Files to Create | Validation |
|------|-----------------|------------|
| Core types | `src/lib/lti/types.ts` | Type-check passes |
| OIDC launch types | `src/lib/lti/oidc.ts` | Type-check passes |
| JWT verification types | `src/lib/lti/jwt.ts` | Type-check passes |
| NRPS client types | `src/lib/lti/nrps.ts` | Type-check passes |
| AGS client types | `src/lib/lti/ags.ts` | Type-check passes |
| Platform abstraction | `src/lib/lti/platform.ts` | Type-check passes |
| Main index export | `src/lib/lti/index.ts` | Type-check passes |

#### `src/lib/lti/types.ts` - Key Interfaces
```typescript
// LTI 1.3 Launch Types
export interface LTILaunchParams {
  iss: string;           // Platform issuer
  aud: string;           // Client ID
  sub: string;           // User ID
  azp: string;           // Authorized party
  nonce: string;         // OIDC nonce
  iat: number;           // Issued at
  exp: number;           // Expires
  'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest';
  'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0';
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string;
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[];
  'https://purl.imsglobal.org/spec/lti/claim/context': LTIContext;
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': LTIResourceLink;
  'https://purl.imsglobal.org/spec/lti/claim/launch_presentation': LTILaunchPresentation;
  'https://purl.imsglobal.org/spec/lti/claim/custom': Record<string, string>;
  'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': NRPSEndpoint;
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': AGSEndpoint;
}

export interface LTIContext {
  id: string;
  label?: string;
  title?: string;
  type?: string[];
}

export interface LTIResourceLink {
  id: string;
  title?: string;
  description?: string;
}

export interface LTILaunchPresentation {
  document_target?: 'iframe' | 'window' | 'embed';
  height?: number;
  width?: number;
  return_url?: string;
  locale?: string;
}

export interface NRPSEndpoint {
  context_memberships_url: string;
  service_versions: string[];
}

export interface AGSEndpoint {
  scope: string[];
  lineitems_url: string;
  service_versions: string[];
}

// Platform Configuration
export interface LTIPlatformConfig {
  id: string;
  issuer: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  authAudience?: string;
  jwksUrl: string;
  deploymentId?: string;
  scopes: string[];
  supportsNRPS: boolean;
  supportsAGS: boolean;
  supportsDeepLinking: boolean;
}
```

### 2.2 OIDC Launch Initiation & Callback

| Task | Files to Create | Validation |
|------|-----------------|------------|
| OIDC launch handler | `src/lib/lti/oidc.ts` | Unit tests pass |
| State/nonce generation | | |
| PKCE support (optional) | | |
| Launch callback endpoint | `src/app/api/lti/launch/route.ts` | E2E test with Canvas |

#### `src/app/api/lti/launch/route.ts` - Endpoint Structure
```typescript
// POST /api/lti/launch - Initiate OIDC login initiation (3rd party init)
// GET /api/lti/launch - Handle platform redirect back (callback)
```

### 2.3 JWT Verification with JWKS Caching

| Task | Files to Create | Validation |
|------|-----------------|------------|
| JWKS client with caching | `src/lib/lti/jwt.ts` | Unit tests pass |
| Key rotation handling | | |
| JWT validation (iss, aud, exp, nonce) | | |
| Platform key storage | Uses existing `lti_platforms` table | |

### 2.4 NRPS Client (Names & Role Provisioning)

| Task | Files to Create | Validation |
|------|-----------------|------------|
| NRPS client class | `src/lib/lti/nrps.ts` | Type-check passes |
| Get context memberships | | |
| Pagination support | | |
| Cache to `nrps_cache` table | Uses existing schema | |

### 2.5 AGS Client (Assignment & Grade Service)

| Task | Files to Create | Validation |
|------|-----------------|------------|
| AGS client class | `src/lib/lti/ags.ts` | Type-check passes |
| Create line item | | |
| Get line items | | |
| Post score | | |
| Get scores | | |

### 2.6 JWKS Endpoint for Platform Keys

| Task | Files to Create | Validation |
|------|-----------------|------------|
| JWKS public endpoint | `src/app/api/lti/jwks/route.ts` | Returns valid JWKS |
| Serve platform public keys | From `lti_platforms.public_key` | |

### 2.7 Admin LTI Platform Management UI

| Task | Files to Create | Validation |
|------|-----------------|------------|
| Platform list page | `src/app/(admin)/lti/platforms/page.tsx` | Renders, CRUD works |
| Platform detail/edit | `src/app/(admin)/lti/platforms/[id]/page.tsx` | Key rotation works |
| Deployment list | `src/app/(admin)/lti/deployments/page.tsx` | Renders, CRUD works |
| Deployment detail | `src/app/(admin)/lti/deployments/[id]/page.tsx` | NRPS/AGS config works |

---

## Week 3: Compliance Hardening + ES/FR Translations + Integration

### 3.1 Consent Versioning (v1 → v2)

| Task | Files to Modify | Validation |
|------|-----------------|------------|
| Add version comparison logic | `src/app/api/parent/consent/route.ts` | Re-consent triggered on version bump |
| Update consent check middleware | New: `src/lib/compliance/consent.ts` | Blocks access without valid consent |
| Add policy version config | `src/config/consent-versions.ts` | Centralized version management |
| Migration for existing records | Drizzle migration | `db:migrate` succeeds |

#### Consent Version Config
```typescript
// src/config/consent-versions.ts
export const CONSENT_VERSIONS = {
  parental_consent: '2.0.0',
  coppa_consent: '2.0.0',
  ferpa_consent: '2.0.0',
  gdpr_consent: '2.0.0',
  ai_interaction: '1.0.0',
  data_sharing: '1.0.0',
  // ...
} as const;

export function isConsentCurrent(type: string, version: string): boolean {
  return version === CONSENT_VERSIONS[type as keyof typeof CONSENT_VERSIONS];
}
```

### 3.2 Data Deletion API (User + Admin Initiated)

| Task | Files to Create | Validation |
|------|-----------------|------------|
| User deletion request | `src/app/api/compliance/deletion/route.ts` (POST) | Request → verify → schedule → execute |
| Admin deletion request | `src/app/api/admin/compliance/deletion/route.ts` (POST) | Admin-only, bypasses verification |
| Deletion status check | `src/app/api/compliance/deletion/[id]/route.ts` (GET) | Returns progress |
| Deletion worker | `src/lib/compliance/deletion-worker.ts` | Processes scheduled deletions |
| Verification email | Extend existing email flow | Token-based verification |

#### Deletion Scope Schema (extend existing)
```typescript
// scope: { tables: string[], dateRange: { from, to }, includeBackups: boolean }
```

### 3.3 Retention Policies + pg_cron Jobs

| Task | Files to Create/Modify | Validation |
|------|------------------------|------------|
| Retention policy CRUD API | `src/app/api/admin/compliance/retention/route.ts` | Admin UI works |
| pg_cron job setup | Migration: `pg_cron.schedule()` | Jobs run on schedule |
| Retention worker | `src/lib/compliance/retention-worker.ts` | Processes per policy |
| Archive strategy | Move to cold storage table | Optional for M1 |
| Admin monitoring UI | `src/app/(admin)/retention/page.tsx` | Shows job status |

### 3.4 Audit Log Enhancements

| Task | Files to Modify | Validation |
|------|-----------------|------------|
| Add LTI launch events | `src/lib/audit.ts` | Logs `lti_launch`, `lti_nrps_sync`, `lti_ags_score` |
| Add consent change events | | Logs `consent_given`, `consent_withdrawn` |
| Add data export events | | Logs `data_export` |
| Structured metadata | Ensure all events have rich metadata | Queryable in admin UI |

### 3.5 ES/FR Translations (AI + Human Review)

| Task | Process | Validation |
|------|---------|------------|
| Generate AI translations | Script using OpenRouter free model | `es.json`, `fr.json` created |
| Human review checklist | Document: `TRANSLATION_REVIEW.md` | All keys reviewed |
| Add to message files | `src/i18n/locales/es.json`, `fr.json` | No missing keys vs en.json |
| Date/number formatting | Test in components | Locale-aware formatting works |

#### Translation Script
```bash
# scripts/translate.ts
# Uses OpenRouter free model (e.g., meta-llama/llama-3.1-8b-instruct:free)
# Prompt: "Translate JSON to Spanish/French, preserve keys, handle interpolation"
```

### 3.6 Integration Testing & Validation Gates

| Validation | Command | Pass Criteria |
|------------|---------|---------------|
| Type-check | `npm run type-check` | Zero errors |
| Lint | `npm run lint` | Zero errors |
| Build | `npm run build` | Succeeds |
| DB generate | `npm run db:generate` | Migration created |
| DB migrate | `npm run db:migrate` | Applies cleanly |
| DB check | `npm run db:check` | Schema matches |
| Unit tests | `npm run test` | All pass |
| E2E smoke | `npm run test:e2e` | Auth, LTI launch, consent, locale switch |

---

## Detailed File Inventory

### New Files to Create (Week 1 - i18n)
```
src/i18n/
├── routing.ts
├── request.ts
├── navigation.ts
├── middleware.ts
└── locales/
    ├── en.json        # Complete, ~2000 keys
    ├── es.json        # AI-generated + reviewed
    └── fr.json        # AI-generated + reviewed

src/middleware.ts                    # Combined: locale + auth role protection
src/app/[locale]/layout.tsx          # New root layout with locale
src/app/[locale]/page.tsx            # Home page (moved)
src/app/[locale]/teacher/...         # All teacher routes moved
src/app/[locale]/student/...         # All student routes moved
src/app/[locale]/parent/...          # All parent routes moved
src/app/[locale]/admin/...           # All admin routes moved
src/app/[locale]/api/...             # API routes that need locale
src/components/shared/locale-switcher.tsx
scripts/translate.ts                 # AI translation script
TRANSLATION_REVIEW.md                # Human review checklist
```

### New Files to Create (Week 2 - LTI Core)
```
src/lib/lti/
├── index.ts
├── types.ts
├── oidc.ts
├── jwt.ts
├── nrps.ts
├── ags.ts
└── platform.ts

src/app/api/lti/
├── launch/route.ts          # OIDC initiation + callback
├── jwks/route.ts            # Public JWKS endpoint
└── platform/route.ts        # Platform registration (admin)

src/app/(admin)/lti/
├── platforms/
│   ├── page.tsx             # List + create
│   └── [id]/page.tsx        # Detail + key rotation
└── deployments/
    ├── page.tsx             # List + create
    └── [id]/page.tsx        # Detail + NRPS/AGS config
```

### New Files to Create (Week 3 - Compliance)
```
src/lib/compliance/
├── consent.ts               # Version checking, middleware
├── deletion-worker.ts       # Process deletion requests
├── retention-worker.ts      # Process retention jobs
└── audit.ts                 # Enhanced audit helpers

src/config/
└── consent-versions.ts      # Centralized policy versions

src/app/api/compliance/
├── consent/route.ts         # Enhanced with versioning
├── consent/[id]/route.ts    # Withdraw, history
├── deletion/route.ts        # User-initiated deletion
├── deletion/[id]/route.ts   # Status check
└── retention/route.ts       # Admin CRUD + trigger

src/app/api/admin/compliance/
└── deletion/route.ts        # Admin-initiated deletion

src/app/(admin)/compliance/
├── consent/page.tsx         # Consent management
├── deletion/page.tsx        # Deletion requests monitoring
└── retention/page.tsx       # Retention policies + jobs
```

### Modified Files
```
src/components/shared/nav.tsx              # Add LocaleSwitcher, use next-intl navigation
src/components/shared/header.tsx           # Add LocaleSwitcher
src/lib/auth/server.ts                     # Ensure works with [locale] routes
src/app/api/auth/[...all]/route.ts         # Ensure works with [locale] routes
src/lib/db/index.ts                        # No changes needed
db/schema/*.ts                             # No schema changes needed (existing covers M1)
```

---

## Schema Migrations Needed

| Migration | Description | Command |
|-----------|-------------|---------|
| Consent version tracking | Already in `consentRecords.version` | None (existing) |
| Deletion request verification | Already in `dataDeletionRequests.verificationToken` | None (existing) |
| Retention job scheduling | Already in `retentionJobs.nextRunAt` | None (existing) |
| pg_cron schedule | Add cron jobs for retention | Manual SQL in migration |
| Audit log partitioning (optional) | Partition `audit_logs` by month | Manual SQL in migration |

### pg_cron Setup (Run Once)
```sql
-- Enable pg_cron (Neon supports this)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily retention job at 2 AM UTC
SELECT cron.schedule(
  'daily-retention-jobs',
  '0 2 * * *',
  $$
  SELECT process_retention_jobs();
  $$
);

-- Hourly deletion processor
SELECT cron.schedule(
  'hourly-deletion-processor',
  '0 * * * *',
  $$
  SELECT process_deletion_requests();
  $$
);
```

---

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/lti/launch` | POST | Public | Initiate OIDC login (3rd party) |
| `/api/lti/launch` | GET | Public | OIDC callback from platform |
| `/api/lti/jwks` | GET | Public | Platform JWKS endpoint |
| `/api/lti/platform` | GET/POST | Admin | Platform CRUD |
| `/api/compliance/consent` | GET/POST | Parent | Consent management (versioned) |
| `/api/compliance/consent/[id]` | PATCH/GET | Parent | Withdraw, history |
| `/api/compliance/deletion` | POST | User | Request data deletion |
| `/api/compliance/deletion/[id]` | GET | User | Check deletion status |
| `/api/admin/compliance/deletion` | POST | Admin | Admin-initiated deletion |
| `/api/compliance/retention` | GET/POST/PATCH | Admin | Retention policy CRUD |
| `/api/compliance/retention/trigger` | POST | Admin | Manual job trigger |

---

## Test Coverage Requirements

### Unit Tests (Vitest)
| Module | Test File | Coverage Target |
|--------|-----------|-----------------|
| i18n routing | `src/i18n/routing.test.ts` | 100% |
| i18n middleware | `src/i18n/middleware.test.ts` | 90% |
| Locale switcher | `src/components/shared/locale-switcher.test.tsx` | 80% |
| LTI types | `src/lib/lti/types.test.ts` | 100% |
| LTI OIDC | `src/lib/lti/oidc.test.ts` | 90% |
| LTI JWT | `src/lib/lti/jwt.test.ts` | 95% |
| LTI NRPS | `src/lib/lti/nrps.test.ts` | 85% |
| LTI AGS | `src/lib/lti/ags.test.ts` | 85% |
| Consent versioning | `src/lib/compliance/consent.test.ts` | 90% |
| Deletion worker | `src/lib/compliance/deletion-worker.test.ts` | 80% |
| Retention worker | `src/lib/compliance/retention-worker.test.ts` | 80% |

### E2E Tests (Playwright)
| Flow | Test File | Priority |
|------|-----------|----------|
| Locale detection + switch | `tests/i18n-locale.spec.ts` | P0 |
| LTI launch (mock platform) | `tests/lti-launch.spec.ts` | P0 |
| Parent consent v2 flow | `tests/compliance-consent.spec.ts` | P0 |
| User data deletion request | `tests/compliance-deletion.spec.ts` | P0 |
| Admin retention policy CRUD | `tests/compliance-retention.spec.ts` | P1 |
| Audit log verification | `tests/audit-logs.spec.ts` | P1 |

---

## Validation Gates (Must Pass Before M1 Complete)

```bash
# Code Quality
npm run type-check          # ✅ Zero TypeScript errors
npm run lint                # ✅ Zero ESLint errors
npm run build               # ✅ Production build succeeds

# Database
npm run db:generate         # ✅ Migration files created
npm run db:migrate          # ✅ Migrations apply cleanly
npm run db:check            # ✅ Schema matches database

# Tests
npm run test                # ✅ All unit tests pass
npm run test:e2e            # ✅ Critical path E2E tests pass

# i18n Specific
# - Locale switching works via middleware
# - Translations render in server/client components
# - Date/number formatting respects locale
# - ES/FR translation files present and complete (no missing keys vs en.json)

# LTI Core Specific
# - OIDC launch initiates correctly (test with mock platform)
# - JWT validation passes with JWKS rotation simulation
# - NRPS client types compile and basic fetch works
# - AGS client types compile and basic operations work

# Compliance Specific
# - Consent versioning enforced (re-consent on version change)
# - Data deletion request flow: request → verify → schedule → execute
# - Retention jobs runnable via admin UI
# - Audit logs capture LTI launches, consent changes, data exports
```

---

## Risk Mitigation (Aggressive 3-Week Timeline)

| Risk | Impact | Mitigation |
|------|--------|------------|
| `[locale]` restructuring breaks routes | High | Do incrementally; test each route group |
| next-intl v4 API changes | Medium | Pin version; test early |
| LTI JWT complexity | Medium | Start with types; use `jose` library (already in deps) |
| Translation completeness | Medium | Automated key extraction script |
| pg_cron not available on Neon | Low | Fallback: Neon Function cron trigger |
| Solo dev bandwidth | High | Strict scope; defer non-critical UI polish |

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Next.js 16 compatibility with next-intl v4 | ✅ Verified | next-intl v4 supports Next.js 15+ |
| `jose` for JWT (already in deps) | ✅ Available | v6.2.5 installed |
| `openid-client` for OIDC | ❌ Need to install | `npm install openid-client` |
| Neon pg_cron support | ⚠️ Verify | Check Neon docs; fallback to Functions |
| OpenRouter free model access | ✅ Available | Already configured in `src/lib/ai/openrouter.ts` |

---

## Week-by-Week Breakdown

### Week 1 (Days 1-5): i18n Foundation
| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Install next-intl, create config files, `[locale]` structure | Routing works |
| 2 | Move all routes under `[locale]`, update imports | All pages render |
| 3 | Create `en.json` (extract all strings), locale switcher | Complete EN messages |
| 4 | AI translate to ES/FR, human review process | ES/FR files ready |
| 5 | Integration testing, middleware auth + locale combined | All validation gates pass |

### Week 2 (Days 6-10): LTI 1.3 Core
| Day | Focus | Deliverable |
|-----|-------|-------------|
| 6 | LTI types, OIDC launch initiation | Types compile |
| 7 | JWT verification with JWKS caching | Unit tests pass |
| 8 | NRPS client + cache to DB | Types + basic fetch |
| 9 | AGS client + line items/scores | Types + basic ops |
| 10 | Admin UI for platforms/deployments, JWKS endpoint | CRUD works |

### Week 3 (Days 11-15): Compliance + Integration
| Day | Focus | Deliverable |
|-----|-------|-------------|
| 11 | Consent versioning (v2), policy config | Re-consent enforced |
| 12 | Data deletion API (user + admin) | Full workflow works |
| 13 | Retention policies + pg_cron jobs | Jobs scheduled |
| 14 | Audit log enhancements, translation review complete | All events logged |
| 15 | **Full validation gate run**, bug fixes, M1 complete | All gates pass |

---

## Definition of Done (M1)

- [ ] All validation gates pass (type-check, lint, build, db:generate, db:migrate, db:check, test, test:e2e)
- [ ] next-intl i18n works: `/en/`, `/es/`, `/fr/` routes accessible, locale switcher functional
- [ ] ES/FR translation files complete (no missing keys vs en.json), human-reviewed
- [ ] LTI 1.3 core types compile; OIDC launch/JWT/NRPS/AGS clients type-check
- [ ] Admin LTI platform/deployment CRUD functional
- [ ] JWKS endpoint serves platform keys
- [ ] Consent versioning v2 enforced (re-consent on version bump)
- [ ] Data deletion API: user + admin flows work end-to-end
- [ ] Retention policies CRUD + pg_cron jobs scheduled
- [ ] Audit logs capture LTI launches, consent changes, data exports
- [ ] No hardcoded English strings in components (all use `useTranslations`)

---

## Post-M1 Handoff to M2

M2 (Canvas + Google Classroom) will consume:
- `src/lib/lti/` core library (complete)
- `lti_platforms`, `lti_deployments`, `nrps_cache`, `ags_line_items`, `ags_scores` tables (exist)
- Admin LTI UI (complete)
- i18n infrastructure for multi-lang LMS error messages
- Audit logging for LTI sync events
- Compliance consent gating for student data access

---

*Plan Version: 1.0 | Created: 2026-11-14 | Timeline: 3 weeks aggressive | Author: Planning Subagent*