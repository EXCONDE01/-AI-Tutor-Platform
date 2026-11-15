# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-chat-interventions.spec.ts >> Student Chat Interventions >> Student can see teacher interventions as amber bubbles
- Location: tests\student-chat-interventions.spec.ts:6:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/student\/chat\/8ffee8d2-f7d0-49c9-b1e8-e4b598e738f1/
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
  3  | test.describe('Student Chat Interventions', () => {
  4  |   const demoSessionId = '8ffee8d2-f7d0-49c9-b1e8-e4b598e738f1';
  5  |   
  6  |   test('Student can see teacher interventions as amber bubbles', async ({ studentPage }) => {
  7  |     await studentPage.goto(`/student/chat/${demoSessionId}`);
  8  |     
  9  |     // Wait for chat to load
  10 |     await studentPage.waitForLoadState('networkidle');
  11 |     
  12 |     // Verify we're on the chat page
> 13 |     await expect(studentPage).toHaveURL(new RegExp(`/student/chat/${demoSessionId}`));
     |                               ^ Error: expect(page).toHaveURL(expected) failed
  14 |     
  15 |     // Wait for messages to load - chat uses flex gap-3 for message bubbles
  16 |     await studentPage.waitForSelector('.flex.gap-3', { timeout: 15000 });
  17 |     
  18 |     // Find teacher intervention messages (amber bubbles) - they have bg-amber-50 / dark:bg-amber-900/20 styling
  19 |     // System messages with isIntervention=true have amber styling
  20 |     const interventions = studentPage.locator('div[class*="amber-50"], div[class*="amber-900"], div:has-text("Teacher Intervention")');
  21 |     
  22 |     // At least one intervention should be visible
  23 |     await expect(interventions.first()).toBeVisible({ timeout: 15000 });
  24 |     
  25 |     // Verify intervention content is present
  26 |     const interventionCount = await interventions.count();
  27 |     expect(interventionCount).toBeGreaterThan(0);
  28 |     
  29 |     console.log(`Found ${interventionCount} teacher intervention(s)`);
  30 |   });
  31 | });
```