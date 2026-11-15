# Phase 2a Implementation Plan (3 Priorities over 2-3 Weeks)

## Executive Summary

This plan covers three priorities across 2-3 weeks:
1. **Parent/Admin Views** (Week 1) - API endpoints, auth guards, route protection
2. **PWA Hardening** (Week 1-2) - DB-backed push, IndexedDB queue, background sync, optimistic UI
3. **AI Tutor: Teacher Intervention UX + Analytics** (Week 2-3) - Real-time monitoring, intervention page, analytics dashboard

---

## Priority 1: Parent/Admin Views

### 1.1 Scope & Deliverables

| Deliverable | Description |
|-------------|-------------|
| **Auth: Role Guards** | Extend `requireRole` in `src/lib/auth/server.ts` to support `parent` and `admin` roles |
| **Auth: Middleware** | Create `src/middleware.ts` with route protection for `(parent)` and `(admin)` route groups |
| **Parent API: Children** | `GET /api/parent/children` - list parent's linked children with progress summary |
| **Parent API: Consent** | `POST /api/parent/consent` - submit consent records (COPPA/FERPA/GDPR) |
| **Parent API: Consent** | `GET /api/parent/consent` - fetch consent status for children |
| **Admin API: Districts** | CRUD: `GET/POST /api/admin/districts`, `GET/PATCH/DELETE /api/admin/districts/[id]` |
| **Admin API: Schools** | CRUD: `GET/POST /api/admin/schools`, `GET/PATCH/DELETE /api/admin/schools/[id]` |
| **Admin API: Audit** | `GET /api/admin/audit` - paginated, filterable audit logs |
| **Admin API: Retention** | `GET/POST /api/admin/retention`, `PATCH /api/admin/retention/[id]`, `POST /api/admin/retention/[id]/run` |
| **UI Integration** | Connect existing `(parent)` and `(admin)` pages to real APIs |

### 1.2 Affected Files

#### New Files
```
src/middleware.ts                                    # Route protection middleware
src/app/api/parent/children/route.ts                 # GET children list
src/app/api/parent/consent/route.ts                  # GET/POST consent
src/app/api/admin/districts/route.ts                 # GET/POST districts
src/app/api/admin/districts/[id]/route.ts            # GET/PATCH/DELETE district
src/app/api/admin/schools/route.ts                   # GET/POST schools
src/app/api/admin/schools/[id]/route.ts              # GET/PATCH/DELETE school
src/app/api/admin/audit/route.ts                     # GET audit logs
src/app/api/admin/retention/route.ts                 # GET/POST retention policies
src/app/api/admin/retention/[id]/route.ts            # PATCH/DELETE policy
src/app/api/admin/retention/[id]/run/route.ts        # POST run retention job
```

#### Modified Files
```
src/lib/auth/server.ts                               # Add parent/admin to requireRole
src/lib/roles.ts                                     # Add parent/admin to UserRole type
src/app/(parent)/children/[studentId]/page.tsx       # Connect to real API
src/app/(parent)/consent/page.tsx                    # Connect to real API
src/app/(admin)/districts/page.tsx                   # Connect to real API
src/app/(admin)/audit/page.tsx                       # Connect to real API
src/app/(admin)/retention/page.tsx                   # Connect to real API
src/components/shared/nav.tsx                        # Verify parent/admin nav routes
```

### 1.3 Database Changes

**No new migrations needed** - All required tables already exist:
- `parents`, `student_parents` (for parent-child linking)
- `consent_records` (for consent tracking)
- `districts`, `schools` (for admin management)
- `audit_logs` (for audit trail)
- `retention_policies`, `retention_jobs` (for retention management)
- `users` table already has `role` enum with `parent` and `admin` values

### 1.4 Implementation Steps (Ordered)

#### Step 1.1: Extend Auth Role Guards (Day 1)
1. Update `src/lib/roles.ts` - Add `parent`, `admin` to `UserRole` type
2. Update `src/lib/auth/server.ts` - Add `parent`, `admin` to `requireRole` function
3. Test role guard with existing teacher endpoints

#### Step 1.2: Create Middleware (Day 1)
1. Create `src/middleware.ts` using Next.js middleware
2. Protect `(parent)/*` routes - require `parent` role
3. Protect `(admin)/*` routes - require `admin` role
4. Redirect unauthenticated to `/sign-in`, unauthorized to `/unauthorized`
5. Handle cookie rewriting for Neon Auth (reuse logic from `api/auth/[...all]/route.ts`)

#### Step 1.3: Parent APIs (Day 2)
1. `GET /api/parent/children` - Join `users` → `parents` → `student_parents` → `students` → `users` (child) + latest session summary
2. `GET /api/parent/consent` - Fetch consent records for parent's children
3. `POST /api/parent/consent` - Create consent records (validate required types: `parental_consent`, `coppa_consent`, `ferpa_consent`)

#### Step 1.4: Admin APIs - Districts & Schools (Day 2-3)
1. `GET/POST /api/admin/districts` - CRUD with pagination, search
2. `GET/PATCH/DELETE /api/admin/districts/[id]` - Single district ops
3. `GET/POST /api/admin/schools` - CRUD with district filter
4. `GET/PATCH/DELETE /api/admin/schools/[id]` - Single school ops

#### Step 1.5: Admin APIs - Audit & Retention (Day 3)
1. `GET /api/admin/audit` - Paginated, filterable (action, severity, date range, user)
2. `GET/POST /api/admin/retention` - List/create policies
3. `PATCH /api/admin/retention/[id]` - Update policy
4. `POST /api/admin/retention/[id]/run` - Trigger retention job

#### Step 1.6: Connect UI to APIs (Day 4)
1. Update `(parent)/children/[studentId]/page.tsx` - fetch real child data
2. Update `(parent)/consent/page.tsx` - submit to real API
3. Update `(admin)/districts/page.tsx` - fetch real districts, add create/edit modals
4. Update `(admin)/audit/page.tsx` - fetch real audit logs
5. Update `(admin)/retention/page.tsx` - fetch real policies, add create/edit/run actions

#### Step 1.7: Validation & Testing (Day 5)
1. Run `npm run type-check`
2. Run `npm run lint`
3. Run `npm run build`
4. Manual test: parent login → children → consent flow
5. Manual test: admin login → districts → audit → retention flow

### 1.5 Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Neon Auth middleware cookie handling | Reuse existing cookie rewrite logic from `api/auth/[...all]/route.ts` |
| Parent role not provisioned in `ensureAppUser` | Add parent provisioning path in `provision.ts` |
| RLS policies may block admin queries | Use `withTenantContext` with admin context or bypass RLS for admin |
| Pagination performance on large audit logs | Add composite indexes on `(created_at, severity, action)` |

### 1.6 Validation Checklist

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Parent can view linked children with real progress data
- [ ] Parent can submit consent (required + optional)
- [ ] Admin can CRUD districts/schools
- [ ] Admin can view paginated, filterable audit logs
- [ ] Admin can CRUD retention policies and trigger jobs
- [ ] Route protection: unauthorized redirects work
- [ ] Unit tests for auth guards and API handlers

### 1.7 Dependencies

- **Blocks Priority 2**: Admin API needed for push subscription management
- **Blocks Priority 3**: Teacher session monitoring needs audit logging

---

## Priority 2: PWA Hardening - Offline Queue + Push

### 2.1 Scope & Deliverables

| Deliverable | Description |
|-------------|-------------|
| **DB-backed Push Subscriptions** | Replace in-memory `Map` with `push_subscriptions` table |
| **IndexedDB Queue** | Client-side queue for outgoing messages (chat, interventions) |
| **Background Sync** | Service worker sync for queued messages when online |
| **Optimistic UI** | Pending/sent states for queued messages in chat |
| **SW Background Sync for Push** | Handle incoming push → local notification when app closed |

### 2.2 Affected Files

#### New Files
```
db/schema/push.ts                                    # push_subscriptions table
drizzle/migrations/[new]_push_subscriptions.sql      # Auto-generated
src/lib/push/server.ts                               # Server push utilities
src/app/api/push/subscribe/route.ts                  # Replace in-memory with DB
src/app/api/push/queue/route.ts                      # IndexedDB sync endpoint
src/hooks/use-push-queue.ts                          # Client queue hook
src/hooks/use-optimistic-messages.ts                 # Optimistic UI hook
public/sw.js                                         # Enhanced with background sync
src/components/shared/install-prompt.tsx             # Update for PWA features
```

#### Modified Files
```
src/app/api/push/subscribe/route.ts                  # Migrate to DB storage
src/app/teacher/sessions/[sessionId]/teacher-session-detail-client.tsx  # Optimistic messages
src/app/student/chat/[sessionId]/page.tsx            # Optimistic messages (if exists)
src/lib/auth/provision.ts                            # Add push subscription on user creation
```

### 2.3 Database Changes

**New Migration Required:**
```sql
-- push_subscriptions table
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);
```

### 2.4 Implementation Steps (Ordered)

#### Step 2.1: Database Schema & Migration (Day 1)
1. Create `db/schema/push.ts` with `pushSubscriptions` table
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply

#### Step 2.2: Server Push Utilities (Day 1)
1. Create `src/lib/push/server.ts` with:
   - `saveSubscription(userId, subscription)` - upsert to DB
   - `getSubscriptions(userId)` - fetch user's subscriptions
   - `deleteSubscription(userId, endpoint)` - remove subscription
   - `sendNotification(subscription, payload)` - wrapper with error handling
   - `broadcastToRole(role, payload)` - query DB for role, send to all

#### Step 2.3: Update Push API to Use DB (Day 2)
1. Replace in-memory `Map` in `src/app/api/push/subscribe/route.ts` with DB calls
2. Add `GET /api/push/subscribe?userId=` to fetch user's subscriptions
3. Add proper error handling for expired/invalid subscriptions (410)

#### Step 2.4: IndexedDB Queue (Day 2-3)
1. Create `src/hooks/use-push-queue.ts` using `idb` library (add dependency)
2. Queue structure: `{ id, type: 'chat'|'intervention', payload, timestamp, status: 'pending'|'sent'|'failed' }`
3. Background sync registration in SW when queue non-empty
4. API endpoint `POST /api/push/queue` - batch process queue items

#### Step 2.5: Service Worker Background Sync (Day 3)
1. Enhance `public/sw.js`:
   - Register `sync` event for `sync-messages` tag
   - In `sync` handler: fetch queue from IndexedDB, POST to `/api/push/queue`
   - On success: update IndexedDB status to `sent`
   - On failure: retry with exponential backoff
   - Handle incoming `push` event → show notification (already exists)

#### Step 2.6: Optimistic UI (Day 3-4)
1. Create `src/hooks/use-optimistic-messages.ts`:
   - Track messages with `status: 'sending' | 'sent' | 'failed'`
   - On send: immediately add to UI with `sending` status
   - On API success: update to `sent`
   - On API failure: update to `failed`, offer retry
2. Integrate into `teacher-session-detail-client.tsx` (intervention messages)
3. Integrate into student chat (if applicable)

#### Step 2.7: Testing & Validation (Day 4-5)
1. Test offline: disconnect network, send messages, reconnect → verify sync
2. Test push: send notification to subscribed user (app open/closed)
3. Test optimistic UI: send intervention, verify instant UI update
4. Run full validation suite

### 2.5 Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| IndexedDB not available (private browsing) | Fallback to in-memory queue with warning |
| Background sync not supported (Safari < 16.4) | Poll queue on visibilitychange/focus |
| VAPID key rotation | Store keys in env, support key rotation in DB |
| Duplicate notifications on retry | Use idempotency keys in queue items |

### 2.6 Validation Checklist

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Push subscriptions persisted to DB (survive restart)
- [ ] Offline queue: messages sent offline → synced on reconnect
- [ ] Background sync triggers on network restore
- [ ] Optimistic UI shows sending/sent/failed states
- [ ] Push notifications received when app closed
- [ ] Unit tests for queue hook, push utilities

### 2.7 Dependencies

- **Depends on Priority 1**: Admin API for managing push subscriptions at scale
- **Enables Priority 3**: Real-time session updates via push + Neon Realtime

---

## Priority 3: AI Tutor - Teacher Intervention UX + Session Analytics

### 3.1 Scope & Deliverables

| Deliverable | Description |
|-------------|-------------|
| **Intervention Page** | `/teacher/sessions/[id]/intervene` - real-time session view with intervention actions |
| **Live Sessions Tab** | Teacher dashboard "Live Sessions" tab with Neon Realtime subscriptions |
| **Session Analytics Dashboard** | Mastery trends, intervention frequency, time-on-task charts |
| **Neon Realtime Integration** | Live query for active sessions, interventions, messages |

### 3.2 Affected Files

#### New Files
```
src/app/teacher/sessions/[sessionId]/intervene/page.tsx          # Intervention page
src/app/teacher/sessions/[sessionId]/intervene/intervene-client.tsx  # Client component
src/app/api/realtime/teacher-monitoring/route.ts                  # Realtime seal for teachers
src/lib/realtime/server.ts                                        # Realtime utilities
src/components/teacher/live-sessions-panel.tsx                    # Live sessions UI
src/components/teacher/session-analytics-charts.tsx               # Analytics charts
src/hooks/use-live-sessions.ts                                    # Neon Realtime hook
```

#### Modified Files
```
src/app/teacher/dashboard/teacher-dashboard-client.tsx            # Add Live Sessions tab
src/app/teacher/analytics/teacher-analytics-client.tsx            # Replace mock with real data
src/app/api/teacher/sessions/[sessionId]/route.ts                 # Add realtime fields
src/app/api/teacher/sessions/[sessionId]/intervene/route.ts       # Ensure realtime updates
public/sw.js                                                      # Handle realtime reconnection
```

### 3.3 Database Changes

**No new migrations needed** - Existing tables support this:
- `tutor_sessions`, `messages` - for session data
- `interventions`, `intervention_actions` - for intervention tracking
- `session_summaries` - for analytics
- `teachers`, `classes`, `students` - for joins

**However:** Need to ensure Neon Realtime publications are created (via Neon dashboard or SQL):
```sql
-- Publications for realtime
CREATE PUBLICATION teacher_monitoring FOR TABLE 
  tutor_sessions, 
  messages, 
  interventions, 
  intervention_actions;
```

### 3.4 Implementation Steps (Ordered)

#### Step 3.1: Intervention Page (Day 1-2)
1. Create `/teacher/sessions/[sessionId]/intervene/page.tsx` (server component)
2. Create `intervene-client.tsx` with:
   - Real-time message stream (Neon Realtime or polling fallback)
   - Student info panel
   - Intervention message composer (reuse from detail page)
   - Quick actions: "Pause Session", "Suggest Hint", "Escalate", "End Session"
   - Session metadata sidebar
3. Add route to nav (teacher sessions list → "Intervene" link)

#### Step 3.2: Neon Realtime Setup (Day 2)
1. Create Neon Realtime publications via Neon Console or migration
2. Create `src/lib/realtime/server.ts` with:
   - `createRealtimeToken(userId, publications)` - generate JWT
   - `getRealtimeConfig()` - endpoint, publications per role
3. Create `src/app/api/realtime/teacher-monitoring/route.ts` - seal endpoint for teachers

#### Step 3.3: Live Sessions Dashboard Tab (Day 3)
1. Create `src/hooks/use-live-sessions.ts` - subscribe to `teacher_monitoring` publication
2. Filter: sessions where `teacher_id` matches current teacher AND `status = 'active'`
3. Create `src/components/teacher/live-sessions-panel.tsx`:
   - Live grid of active sessions
   - Real-time updates: new messages, status changes, interventions
   - Quick intervene buttons per session
4. Add "Live Sessions" tab to `teacher-dashboard-client.tsx`

#### Step 3.4: Session Analytics Dashboard (Day 3-4)
1. Create analytics API: `GET /api/teacher/analytics/sessions` with:
   - Mastery trends over time (from `session_summaries.learning_progress`)
   - Intervention frequency (count/group by day/week from `interventions`)
   - Time-on-task (from `tutor_sessions.total_duration_seconds`)
   - Message volume, token usage, completion rates
2. Create `src/components/teacher/session-analytics-charts.tsx` using Recharts:
   - Line chart: mastery trend
   - Bar chart: interventions per week
   - Area chart: time-on-task
   - Summary cards: totals
3. Update `teacher-analytics-client.tsx` to use real data + charts

#### Step 3.5: Real-time Enhancements (Day 4)
1. Add optimistic updates to intervention page (Neon Realtime message stream)
2. Add real-time badge on dashboard for "Live Sessions" count
3. Handle reconnection in SW for realtime

#### Step 3.6: Testing & Validation (Day 5)
1. Test intervention page with active student session
2. Test live sessions tab with multiple concurrent sessions
3. Test analytics with historical data
4. Run full validation suite

### 3.5 Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Neon Realtime not available in all regions | Fallback to 5s polling for live sessions |
| Realtime subscription limits | Batch subscriptions per teacher; cleanup on unmount |
| Analytics query performance | Materialized views or pre-aggregated tables for large datasets |
| Intervention race conditions | Use DB transactions + optimistic locking |

### 3.6 Validation Checklist

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Intervention page loads real-time session data
- [ ] Teacher can send interventions that appear instantly in student chat
- [ ] Live Sessions tab shows active sessions with real-time updates
- [ ] Analytics dashboard displays mastery trends, intervention frequency, time-on-task
- [ ] Neon Realtime connection established and reconnects on network change
- [ ] Unit tests for realtime hook, analytics queries

### 3.7 Dependencies

- **Depends on Priority 1**: Teacher auth, session APIs, audit logging for interventions
- **Depends on Priority 2**: Push notifications for intervention alerts when teacher not in dashboard

---

## Cross-Priority Dependencies Summary

```
Priority 1 (Auth + Parent/Admin APIs)
    │
    ├──→ Priority 2 (PWA Push needs admin APIs for subscription mgmt)
    │
    └──→ Priority 3 (Teacher intervention needs auth, audit, session APIs)
           │
           └──→ Priority 2 (Push enables intervention alerts)
```

---

## Overall Timeline (2-3 Weeks)

| Week | Focus | Key Milestones |
|------|-------|----------------|
| **Week 1** | Priority 1 + Start Priority 2 | Auth guards, middleware, Parent/Admin APIs, UI connected, DB push schema |
| **Week 2** | Priority 2 + Start Priority 3 | IndexedDB queue, background sync, optimistic UI, Intervention page, Realtime setup |
| **Week 3** | Priority 3 completion | Live Sessions tab, Analytics dashboard, Integration testing, Full validation |

---

## Validation Commands

```bash
# Run after each priority
npm run type-check
npm run lint
npm run build
npm run test

# Database
npm run db:generate
npm run db:migrate
npm run db:check

# Manual verification
# 1. Parent flow: sign in → /parent/children → /parent/consent
# 2. Admin flow: sign in → /admin/districts → /admin/audit → /admin/retention
# 3. PWA: offline → send message → online → verify sync
# 4. Teacher: dashboard → Live Sessions → intervene → analytics
```

---

## Open Questions

1. **Neon Realtime**: Are publications already created in Neon Console, or need SQL migration?
2. **Admin provisioning**: How are admin users created? (Manual DB insert? Special sign-up?)
3. **Parent linking**: Is `student_parents` populated via admin UI or self-service?
4. **Push VAPID keys**: Are production keys configured in env?
5. **Analytics retention**: Should analytics aggregate raw tables or use `session_summaries`?
6. **Testing**: Any E2E test framework (Playwright/Cypress) configured?

---

## Assumptions

1. Neon Auth is the sole auth provider (Managed Better Auth)
2. Database is Neon Postgres with pooling
3. All teacher/student/parent/admin users provisioned via `ensureAppUser`
4. RLS policies exist but app connects as owner (bypasses RLS currently)
5. Service worker registered via Next.js PWA (manifest exists)
6. Recharts already in deps for analytics charts
7. `idb` library acceptable for IndexedDB (lightweight, 2kb)