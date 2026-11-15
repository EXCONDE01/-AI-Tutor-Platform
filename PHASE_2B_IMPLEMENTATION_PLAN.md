# Phase 2b Implementation Plan: E2E Testing, Push Notifications & Image Optimization

## Overview
Three parallel tasks over 1-2 weeks to harden the platform with automated testing, production-ready push notifications, and image optimization.

---

## Task 1: Playwright E2E Testing Setup

### 1.1 Scope & Deliverables

| Deliverable | Description |
|-------------|-------------|
| **Playwright Installation** | `@playwright/test`, browser binaries (chromium, firefox, webkit) |
| **Configuration** | `playwright.config.ts` with baseURL, projects, retries, trace/video on failure |
| **Test Fixtures** | Auth fixtures for student/teacher login with session persistence |
| **Test Suites (4)** | Student login → sessions list, Student login → chat interventions, Teacher intervene → student sees it, PWA manifest/sw.js validation |
| **CI Workflow** | GitHub Actions `.github/workflows/e2e.yml` with preview URL, artifacts |
| **NPM Scripts** | `test:e2e`, `test:e2e:headed`, `test:e2e:debug`, `test:e2e:ui` |

### 1.2 File Structure

```
├── playwright.config.ts                    # Main config
├── tests/
│   ├── fixtures/
│   │   ├── auth.fixture.ts                # Login fixtures (student/teacher)
│   │   └── test-data.ts                   # Test user constants
│   ├── e2e/
│   │   ├── student-sessions.spec.ts       # Student login → /student/sessions
│   │   ├── student-chat-interventions.spec.ts  # Student login → chat interventions
│   │   ├── teacher-intervention.spec.ts   # Teacher intervene → student sees it
│   │   └── pwa-validation.spec.ts         # manifest.json, sw.js, icons
│   └── utils/
│       ├── page-objects/                  # Page Object Models
│       │   ├── student-sessions.po.ts
│       │   ├── student-chat.po.ts
│       │   ├── teacher-intervene.po.ts
│       │   └── login.po.ts
│       └── helpers.ts                     # Common utilities
├── .github/workflows/e2e.yml              # CI workflow
└── .env.test                              # Test environment vars (gitignored)
```

### 1.3 Implementation Steps

#### Step 1.1: Install & Configure Playwright (Day 1)
1. `npm install -D @playwright/test`
2. `npx playwright install chromium firefox webkit`
3. Create `playwright.config.ts`:
   - `baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'`
   - Projects: chromium, firefox, webkit (mobile: pixel 5, iphone 13)
   - Retries: 2 on CI, 0 locally
   - Trace: `on-first-retry`, Video: `retain-on-failure`
   - Screenshot: `only-on-failure`
   - Global setup/teardown for auth state

#### Step 1.2: Create Auth Fixtures (Day 1)
1. `tests/fixtures/auth.fixture.ts`:
   - `studentFixture`: Login as student, save storage state
   - `teacherFixture`: Login as teacher, save storage state
   - Use Neon Auth email/password or OAuth flow
   - Reuse storage state across tests (`storageState`)

#### Step 1.3: Build Page Object Models (Day 1-2)
1. `login.po.ts`: `login(email, password)`, `assertLoggedIn(role)`
2. `student-sessions.po.ts`: `goto()`, `getSessionList()`, `openSession(id)`
3. `student-chat.po.ts`: `goto(sessionId)`, `getMessages()`, `assertInterventionVisible(text)`
4. `teacher-intervene.po.ts`: `goto(sessionId)`, `sendIntervention(message)`, `useQuickAction(id)`

#### Step 1.4: Write Test Suites (Day 2-3)
1. **student-sessions.spec.ts**:
   - Login as student → navigate to `/student/sessions`
   - Assert session list renders with at least 1 session
   - Assert session cards show: title, date, status, progress
   
2. **student-chat-interventions.spec.ts**:
   - Login as student → navigate to `/student/chat/[sessionId]`
   - Assert initial messages load
   - Verify teacher intervention messages appear (system role, orange badge)
   
3. **teacher-intervention.spec.ts**:
   - Login as teacher → navigate to `/teacher/sessions/[sessionId]/intervene`
   - Send intervention via composer
   - Open student chat in separate context → verify intervention appears
   
4. **pwa-validation.spec.ts**:
   - Fetch `/manifest.json` → validate required fields (name, icons, start_url)
   - Fetch `/sw.js` → assert service worker registers
   - Verify icons exist at `/icons/icon-192.png`, `/icons/icon-512.png`
   - Check `Cache-Control` headers on manifest/sw.js

#### Step 1.5: GitHub Actions CI Workflow (Day 3)
1. Create `.github/workflows/e2e.yml`:
   - Trigger: `pull_request` (skip drafts), `push` to main, `schedule` (nightly)
   - Jobs: `e2e-chromium`, `e2e-firefox`, `e2e-webkit` (parallel)
   - Use Vercel preview URL from deployment (via `vercel` action or env)
   - Upload artifacts: traces, videos, screenshots on failure
   - Timeout: 30 min per job

#### Step 1.6: NPM Scripts & Validation (Day 3-4)
1. Add to `package.json`:
   ```json
   "test:e2e": "playwright test",
   "test:e2e:headed": "playwright test --headed",
   "test:e2e:debug": "playwright test --debug",
   "test:e2e:ui": "playwright test --ui",
   "test:e2e:ci": "playwright test --reporter=github"
   ```
2. Run validation: `npm run type-check && npm run lint && npm run build && npm run test:e2e`

### 1.4 Acceptance Criteria

- [ ] `npm run test:e2e` passes locally against `localhost:3000`
- [ ] CI workflow runs on PR, uses Vercel preview URL
- [ ] All 4 test suites pass in Chromium, Firefox, WebKit
- [ ] Auth fixtures persist login state (no re-login per test)
- [ ] PWA validation confirms manifest + SW + icons
- [ ] Artifacts uploaded on failure (trace, video, screenshot)
- [ ] `npm run type-check`, `lint`, `build` all pass

### 1.5 Dependencies
- Requires deployed preview environment (Vercel) for CI
- Requires test student/teacher accounts in Neon Auth
- Independent of Tasks 2 & 3

---

## Task 2: VAPID Keys for Push Notifications

### 2.1 Scope & Deliverables

| Deliverable | Description |
|-------------|-------------|
| **VAPID Key Generation** | `npx web-push generate-vapid-keys` → public/private pair |
| **Environment Config** | `.env.local` (dev) + Vercel Environment Variables (prod) |
| **Server Update** | `src/lib/push/server.ts` - remove fallback, enforce real keys |
| **Client Subscription** | Verify subscription flow works end-to-end |
| **Test Notification** | Send test push from teacher → student receives it |

### 2.2 Current State Analysis

**Existing code in `src/lib/push/server.ts`:**
- Lines 18-23: Already throws if keys missing at runtime
- Line 18: `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client)
- Line 19: `process.env.VAPID_PRIVATE_KEY` (server)
- Line 267: `getVapidPublicKey()` returns public key for client

**No `.env.local` or `.env` files exist currently.**

### 2.3 Implementation Steps

#### Step 2.1: Generate Keys (Day 1)
```bash
npx web-push generate-vapid-keys
```
Output:
```
Public Key:  BEl62iUYg... (base64url)
Private Key:  U4x9jK... (base64url)
```

#### Step 2.2: Configure Environment (Day 1)

**Local Development (`.env.local` - gitignored):**
```bash
# .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYg...
VAPID_PRIVATE_KEY=U4x9jK...
NEON_AUTH_COOKIE_SECRET=your-dev-secret
NEON_AUTH_BASE_URL=http://localhost:3000/api/auth
```

**Production (Vercel Dashboard → Settings → Environment Variables):**
| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `<public-key>` | Production, Preview |
| `VAPID_PRIVATE_KEY` | `<private-key>` | Production, Preview |
| `NEON_AUTH_COOKIE_SECRET` | `<secure-random>` | Production, Preview |
| `NEON_AUTH_BASE_URL` | `https://your-app.vercel.app/api/auth` | Production, Preview |

#### Step 2.3: Update Server Code (Day 1)
**File: `src/lib/push/server.ts`**
- Current: Lines 18-23 throw at runtime if missing
- Change: Keep validation but improve error message for build-time clarity
- No logic change needed - already uses `process.env` correctly

#### Step 2.4: Verify Client Subscription Flow (Day 2)
1. **Check client subscription code** - search for `pushManager.subscribe`
2. **Test flow manually:**
   - Start dev: `npm run dev`
   - Login as student
   - Open DevTools → Application → Service Workers → "Push" tab
   - Subscribe → verify POST to `/api/push/subscribe` succeeds
   - Check DB: `push_subscriptions` table has entry

#### Step 2.5: End-to-End Push Test (Day 2)
1. **Teacher sends intervention** in `/teacher/sessions/[id]/intervene`
2. **Verify push notification** received by student (app open/closed)
3. **Test offline scenario:** Close app → send intervention → open app → verify notification

#### Step 2.6: Document Key Rotation (Day 2)
- Add `scripts/rotate-vapid-keys.ts` for future rotation
- Document process in README

### 2.4 Acceptance Criteria

- [ ] `.env.local` created with valid VAPID keys (dev)
- [ ] Vercel Environment Variables configured for Production/Preview
- [ ] `npm run dev` starts without VAPID errors
- [ ] Student can subscribe to push (POST `/api/push/subscribe` returns 200)
- [ ] Subscription persisted in `push_subscriptions` table
- [ ] Teacher intervention triggers push to student
- [ ] Push received when app closed (service worker shows notification)
- [ ] `npm run type-check`, `lint`, `build` pass

### 2.5 Dependencies
- Requires Neon DB with `push_subscriptions` table (from Phase 2a Priority 2)
- Requires service worker registered (already in `public/sw.js`)
- Independent of Tasks 1 & 3

---

## Task 3: next/image Optimization in ChildDetailsClient.tsx

### 3.1 Scope & Deliverables

| Deliverable | Description |
|-------------|-------------|
| **Replace `<img>` with `<Image>`** | Avatar in `ChildDetailsClient.tsx` line 88 |
| **Add width/height/alt** | Proper layout shift prevention |
| **Configure remotePatterns** | Support Google, GitHub, Neon Object Storage |
| **Fix Lint Warning** | Resolve `next/image` missing alt/width/height |

### 3.2 Current Code Analysis

**File: `src/app/(parent)/children/[studentId]/ChildDetailsClient.tsx`**
```tsx
// Line 86-91
<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-medium">
  {childData.avatarUrl ? (
    <img src={childData.avatarUrl} alt={childData.name} className="h-16 w-16 rounded-full" />
  ) : (
    childData.name.split(' ').map(n => n[0]).join('').toUpperCase()
  )}
</div>
```

**Issues:**
1. Uses native `<img>` instead of `next/image`
2. No `width`/`height` props (causes CLS)
3. `next.config.js` already has Google + GitHub remotePatterns
4. May need Neon Object Storage domain if custom uploads

### 3.3 Implementation Steps

#### Step 3.1: Update next.config.js (Day 1)
**File: `next.config.js`** - Add Neon Object Storage pattern if needed
```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
    // Add for Neon Object Storage (if using custom domain)
    // { protocol: 'https', hostname: 'your-bucket.neon.storage' },
  ],
  formats: ['image/avif', 'image/webp'],
}
```
**Note:** If using Neon Object Storage with default domain, add the bucket hostname. If using custom domain, add that.

#### Step 3.2: Replace `<img>` with `<Image>` (Day 1)
**File: `src/app/(parent)/children/[studentId]/ChildDetailsClient.tsx`**

```tsx
// Add import
import Image from 'next/image';

// Replace lines 86-91
<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-medium relative">
  {childData.avatarUrl ? (
    <Image
      src={childData.avatarUrl}
      alt={childData.name}
      width={64}
      height={64}
      className="h-16 w-16 rounded-full object-cover"
      sizes="64px"
      priority // Above fold, LCP candidate
    />
  ) : (
    <span className="text-2xl font-medium">
      {childData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
    </span>
  )}
</div>
```

**Key props:**
- `width={64}` `height={64}` - matches `h-16 w-16` (16 * 4 = 64px)
- `sizes="64px"` - tells browser exact render size
- `priority` - loads immediately (above fold, avatar is LCP candidate)
- `object-cover` - maintains aspect ratio in circle
- `alt={childData.name}` - accessibility

#### Step 3.3: Handle Missing Avatar Fallback (Day 1)
The initials fallback doesn't need `next/image` - it's text. Keep as `<span>`.

#### Step 3.4: Verify & Test (Day 1-2)
1. `npm run dev` - check no console errors
2. `npm run lint` - confirm no `next/image` warnings
3. `npm run build` - verify production build succeeds
4. Test with:
   - Google OAuth avatar URL
   - GitHub OAuth avatar URL
   - Custom Neon Object Storage URL (if configured)
   - No avatar (initials fallback)

#### Step 3.5: Optional - Blur Placeholder (Day 2)
For better perceived performance:
```tsx
<Image
  src={childData.avatarUrl}
  alt={childData.name}
  width={64}
  height={64}
  className="h-16 w-16 rounded-full object-cover"
  sizes="64px"
  priority
  placeholder="blur"
  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" // 1px transparent
/>
```

### 3.4 Acceptance Criteria

- [ ] `<img>` replaced with `<Image>` from `next/image`
- [ ] `width={64}` `height={64}` `sizes="64px"` set
- [ ] `priority` prop for above-fold avatar
- [ ] `alt={childData.name}` for accessibility
- [ ] `next.config.js` has all needed `remotePatterns`
- [ ] `npm run lint` passes (no next/image warnings)
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] Avatar renders correctly for Google, GitHub, custom sources
- [ ] Initials fallback works when no avatar
- [ ] No layout shift (CLS = 0 for avatar)

### 3.5 Dependencies
- Independent of Tasks 1 & 2
- Requires `next.config.js` remotePatterns to match actual avatar sources

---

## Cross-Task Dependencies Summary

```
Task 1 (Playwright)          Task 2 (VAPID)              Task 3 (next/image)
     │                            │                           │
     ├────────────────────────────┼───────────────────────────┤
     │                            │                           │
     ▼                            ▼                           ▼
  Independent              Requires DB                    Independent
  (can run in parallel)    push_subscriptions              (can run in parallel)
                            table (Phase 2a)
```

---

## Overall Timeline (1-2 Weeks)

| Week | Focus | Key Milestones |
|------|-------|----------------|
| **Week 1** | All 3 tasks in parallel | Playwright config + fixtures, VAPID keys generated + env configured, next/image swapped |
| **Week 2** | Test suites + CI + validation | 4 E2E tests passing, CI workflow green, push E2E verified, build/lint clean |

---

## Validation Commands

```bash
# After each task
npm run type-check
npm run lint
npm run build

# Task 1 specific
npm run test:e2e              # Local against localhost:3000
npm run test:e2e:headed       # Debug with browser visible
npm run test:e2e:ui           # Playwright UI mode

# Task 2 specific
# Manual: dev server → login student → subscribe → teacher intervene → verify push

# Task 3 specific
npm run dev                   # Visual check avatar renders
npm run build                 # Production build verification
```

---

## Open Questions / Decisions Needed

1. **Neon Object Storage domain**: Confirm if custom avatars use Neon Storage → add hostname to `remotePatterns`
2. **Test user credentials**: Document exact student/teacher emails for E2E fixtures
3. **Vercel preview URL**: How to inject into CI (Vercel GitHub Action outputs `deployment-url`)
4. **Push notification payload**: Confirm intervention push includes `data.url` to deep-link to chat

---

## Assumptions

1. Vercel project exists and deploys previews on PR
2. Neon Auth has test student/teacher accounts provisioned
3. `push_subscriptions` table exists (Phase 2a Priority 2 migration applied)
4. Service worker registers correctly (existing `public/sw.js`)
5. Google/GitHub OAuth configured in Neon Auth for avatar sources
6. Node.js ≥ 20.9.0 (per `package.json` engines)