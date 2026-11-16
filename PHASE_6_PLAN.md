# Phase 6: Compliance, Safety & Polish - Implementation Plan

## Overview
Complete all Phase 6 deliverables in parallel where possible:
1. **Content Filter** - Pre-message filter for tutor chat
2. **Parent Portal Integration** - Wire real data to existing components
3. **Retention Policy Cron Jobs** - Automated FERPA/COPPA cleanup
4. **PWA Polish** - Install prompts, offline support, splash screens
5. **Audit Logging UI Enhancement** - Already complete, verify
6. **Load Testing** - Run against deployed app

---

## 1. Content Filter (Pre-message Filter)

### Location
- New file: `src/lib/compliance/content-filter.ts`
- Integration: `src/app/api/chat/route.ts` (before streaming to LLM)

### Requirements
- Use `gpt-4o-mini` via OpenRouter (free model)
- Check for: PII, inappropriate content, cheating, FERPA/COPPA violations
- Return: `{ allowed: boolean, reason?: string, filteredMessage?: string }`
- Log to audit logs

### Implementation Steps
1. Create content filter module with structured prompt
2. Add filter call in chat API before user message persistence
3. If blocked, return error response with reason
4. Add audit logging for filtered messages

---

## 2. Parent Portal Integration

### Current State
- Components exist: `SessionViewer`, `ProgressSummary`, `ConsentForm`
- API routes exist: `/api/parent/children/[id]`, `/api/parent/consent`
- Pages use mock data

### Implementation Steps
1. Update `/api/parent/children/[id]/route.ts` to return real session data
2. Update `/api/parent/children/route.ts` to return real children list
3. Wire `ParentChildrenPage` to real API
4. Wire `SessionViewer` and `ProgressSummary` to real data
4. Verify consent management works end-to-end

---

## 3. Retention Policy Cron Jobs

### Current State
- Schema: `retentionPolicies`, `retentionJobs`
- API: `/api/admin/compliance/retention/*` (CRUD + run)
- `runRetentionJob` in `service.ts` is a stub

### Implementation Steps
1. Implement actual deletion logic in `runRetentionJob`
2. Handle each retention category:
   - `messages`: FERPA 1 year, COPPA delete on request
   - `tutor_sessions`: FERPA 1 year
   - `audit_logs`: FERPA 7 years
   - `generated_artifacts`: FERPA 1 year
   - `consent_records`: FERPA 7 years
   - `oauth_tokens`: Delete on user deletion
3. Add cron job endpoint for Vercel Cron (`/api/cron/retention`)
4. Create default retention policies on first deploy

---

## 4. PWA Polish

### Current State
- `next.config.ts` has PWA config
- Manifest exists
- Service worker registered

### Implementation Steps
1. **Install Prompt**: Custom `beforeinstallprompt` handler in `components/ui/InstallPrompt.tsx`
2. **Splash Screens**: Generate via `@capacitor/assets` (already in scripts)
3. **Offline Cached Lessons**: 
   - IndexedDB cache for recent tutor sessions
   - Service worker strategy for `/api/chat` (queue when offline)
4. **"You're Offline" Banner**: `components/ui/OfflineBanner.tsx` with online/offline detection
5. **Queued Messages Indicator**: Show pending messages count when offline

---

## 5. Audit Logging UI - Verify Complete
- Admin audit page exists at `/admin/audit`
- Has: filtering, pagination, stats tab, CSV export, detail dialog
- API: `/api/admin/audit`, `/api/admin/audit/stats`, `/api/admin/audit/export`
- **Action**: Verify build passes, test manually

---

## 6. Load Testing
- Run: `npm run load-test` (uses `hey -n 100 -c 10`)
- Target: Deployed Vercel URL
- Measure: Response times, error rates

---

## Validation Gates (Run After Each Deliverable)
```bash
npm run type-check
npm run lint
npm run build
```

---

## Dependencies Between Deliverables
- Content Filter → Chat API (independent)
- Parent Portal → API routes (independent)
- Retention Cron → Database, service.ts (independent)
- PWA Polish → next.config, components (independent)
- Load Test → Deployed app (last)

---

## Priority Order (Parallelizable)
1. **Content Filter** + **Parent Portal** (both touch APIs)
2. **Retention Cron** (database logic)
3. **PWA Polish** (frontend)
4. **Verification & Load Test** (last)