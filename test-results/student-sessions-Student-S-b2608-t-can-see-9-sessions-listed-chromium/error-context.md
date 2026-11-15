# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-sessions.spec.ts >> Student Sessions >> Student can see 9 sessions listed
- Location: tests\student-sessions.spec.ts:4:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/student\/sessions/
Received string:  "http://localhost:3000/unauthorized?requiredRole=student"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × locator resolved to <html lang="en" class="light" data-scroll-behavior="smooth">…</html>
       - unexpected value "http://localhost:3000/unauthorized?requiredRole=student"

```

```yaml
- main:
  - heading "Access denied" [level=3]
  - paragraph: You don't have access to this area. This section requires an student account.
  - link "Go to parent dashboard":
    - /url: /parent/children
  - link "Sign in as a different user":
    - /url: /sign-in
- region "Notifications (F8)":
  - list
- button "Open Tanstack query devtools":
  - img
- alert
```

# Test source

```ts
  1  | import { test, expect } from './fixtures';
  2  | 
  3  | test.describe('Student Sessions', () => {
  4  |   test('Student can see 9 sessions listed', async ({ studentPage }) => {
  5  |     await studentPage.goto('/student/sessions');
  6  |     
  7  |     // Wait for sessions to load
  8  |     await studentPage.waitForLoadState('networkidle');
  9  |     
  10 |     // Verify we're on the student sessions page
> 11 |     await expect(studentPage).toHaveURL(/\/student\/sessions/);
     |                               ^ Error: expect(page).toHaveURL(expected) failed
  12 |     
  13 |     // Find session cards - SessionCard component renders as Card elements in a grid
  14 |     const sessionCards = studentPage.locator('.card-elevated.card-hover').first();
  15 |     await expect(sessionCards).toBeVisible({ timeout: 15000 });
  16 |     
  17 |     // Count sessions - expecting 9
  18 |     const sessions = studentPage.locator('.card-elevated.card-hover');
  19 |     await expect(sessions).toHaveCount(9);
  20 |   });
  21 | });
```