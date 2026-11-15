# Data Deletion Workflow — Implementation Summary

## Files Created/Modified

### 1. Service Layer
- **`src/lib/compliance/deletion.ts`** — Core service with:
  - `createDeletionRequest(input)` — Creates request with `requested` status, generates 32-byte verification token (24h expiry), emits `data_deletion_requested` audit
  - `getDeletionRequestsByUser(userId)` — Returns user's own requests (as requester or target)
  - `getAllDeletionRequests()` — Admin list with user email joins
  - `getDeletionRequestById(id)` — Single request lookup
  - `updateDeletionRequestStatus(id, status, actorId, opts?)` — Validates transitions, sets timestamps, emits audit
  - `executeDeletion(id, actorId)` — Performs actual deletion with per-table counts, error isolation, anonymizes user record

### 2. API Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/deletion-request` | any | Submit deletion request → 201 `{id, verificationToken}` |
| GET | `/api/deletion-request` | any | List own requests (paginated) |
| GET | `/api/admin/deletion-requests` | admin | List all requests with user emails (paginated, status filter) |
| PATCH | `/api/admin/deletion-requests/[id]` | admin | Status transitions: verify/schedule/cancel/reject → 200 updated row |
| POST | `/api/admin/deletion-requests/[id]/execute` | admin | Execute deletion (must be `scheduled`) → 202 |

All routes: try/catch → 500, UUID validation → 400, role guards via `requireAppRole`.

### 3. UI Pages
- **`src/app/deletion-request/page.tsx`** — User page:
  - Form: legal basis select (GDPR/CCPA/COPPA/FERPA), reason textarea, scope checkbox (include backups)
  - Shows verification token once on submit with copy button
  - History table with status badges, dates, record counts

- **`src/app/admin/deletion-requests/page.tsx`** — Admin page:
  - Stats cards per status
  - Table: user email, student, status badge, legal basis, requested at, records count, actions
  - Action buttons enabled per status: Verify/Schedule/Execute/Cancel/Reject
  - Dialogs for scheduling (datetime), notes, confirmation
  - Error display for failed requests

### 4. Tests
- **`tests/deletion.spec.ts`** — Playwright tests covering:
  - Student: POST→201 with token, GET own requests, 400 on invalid input
  - Anonymous: POST→401, GET admin→401
  - Admin: GET list, verify, schedule, execute unscheduled→409, execute→202→completed, cancel
  - Authorization: student hitting admin endpoints → 403
  - Audit: `data_deletion_executed` row appears after execute

### 5. Deletion Tables (guarded per-table)
1. `consent_records` (userId)
2. `tutor_sessions` (studentId) + `messages` (sessionId cascade)
3. `interventions` (studentId)
4. `generated_artifacts` (studentId)
5. `ags_scores` (student userId)
6. `export_jobs` (teacherId via userId)
7. `oauth_tokens` (userId)
8. `push_subscriptions` (userId)
9. `student_parents` (studentId)
10. `users` — anonymized (not deleted, keeps FK integrity)
11. `students` — anonymized if studentId provided

### 6. Audit Actions Emitted
| Transition | Action | Severity |
|------------|--------|----------|
| create | `deletion_requested` | info (→ low) |
| verify | `deletion_verified` | info |
| schedule | `deletion_scheduled` | info |
| execute start | `deletion_started` | info |
| completed | `deletion_completed` | warning (→ medium) |
| failed | `deletion_failed` | error (→ high) |
| cancelled | `deletion_cancelled` | info |
| rejected | `deletion_cancelled` | info |

### 7. Valid Status Transitions
```
requested → verified → scheduled → in_progress → completed
    ↓           ↓           ↓            ↓
  cancelled  cancelled  cancelled    failed
    ↓           ↓           ↓
  rejected   rejected   rejected
```
Admin can cancel/reject from any non-completed state.

### Quality Checks
- `npx tsc --noEmit` — **PASS** (no new errors in created files)
- `npx eslint` on all created files — **PASS**