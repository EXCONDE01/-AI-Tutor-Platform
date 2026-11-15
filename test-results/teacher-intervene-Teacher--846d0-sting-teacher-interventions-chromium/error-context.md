# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teacher-intervene.spec.ts >> Teacher Intervention Flow >> Student can see existing teacher interventions
- Location: tests\teacher-intervene.spec.ts:66:3

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
  3  | test.describe('Teacher Intervention Flow', () => {
  4  |   const demoSessionId = '8ffee8d2-f7d0-49c9-b1e8-e4b598e738f1';
  5  |   
  6  |   test('Teacher can access intervention panel on session detail page', async ({ teacherPage }) => {
  7  |     // Teacher navigates to session detail
  8  |     await teacherPage.goto(`/teacher/sessions/${demoSessionId}`);
  9  |     await teacherPage.waitForLoadState('networkidle');
  10 |     
  11 |     // Verify we're on teacher session detail page
  12 |     await expect(teacherPage).toHaveURL(new RegExp(`/teacher/sessions/${demoSessionId}`));
  13 |     
  14 |     // The intervention panel is on the right side (w-96) of the teacher session detail page
  15 |     // Look for the intervention textarea
  16 |     const interventionTextarea = teacherPage.locator('textarea[placeholder*="Type your message"], textarea[aria-label="Intervention message"]').first();
  17 |     await expect(interventionTextarea).toBeVisible({ timeout: 30000 });
  18 |     
  19 |     // Verify the "Send to Student" button exists
  20 |     const sendButton = teacherPage.locator('button:has-text("Send to Student")').first();
  21 |     await expect(sendButton).toBeVisible({ timeout: 10000 });
  22 |     
  23 |     console.log('Teacher intervention panel accessible');
  24 |   });
  25 | 
  26 |   test('Teacher can send intervention from session detail page (chromium)', async ({ teacherPage, browserName }) => {
  27 |     // Only run on chromium where it works reliably
  28 |     test.skip(browserName !== 'chromium', 'Intervention sending test runs on chromium only');
  29 |     
  30 |     // Teacher navigates to session detail
  31 |     await teacherPage.goto(`/teacher/sessions/${demoSessionId}`);
  32 |     await teacherPage.waitForLoadState('networkidle');
  33 |     
  34 |     // Verify we're on teacher session detail page
  35 |     await expect(teacherPage).toHaveURL(new RegExp(`/teacher/sessions/${demoSessionId}`));
  36 |     
  37 |     // The intervention panel is on the right side (w-96) of the teacher session detail page
  38 |     // Look for the intervention textarea and send button
  39 |     const interventionTextarea = teacherPage.locator('textarea[placeholder*="Type your message"], textarea[aria-label="Intervention message"]').first();
  40 |     await expect(interventionTextarea).toBeVisible({ timeout: 30000 });
  41 |     
  42 |     // Fill in intervention message
  43 |     const interventionMessage = `Teacher intervention at ${new Date().toISOString()}`;
  44 |     await interventionTextarea.fill(interventionMessage);
  45 |     
  46 |     // Click the "Send to Student" button - wait for it to be enabled first
  47 |     const sendButton = teacherPage.locator('button:has-text("Send to Student")').first();
  48 |     await expect(sendButton).toBeVisible({ timeout: 10000 });
  49 |     
  50 |     // Wait for button to be enabled (not disabled)
  51 |     await expect(sendButton).toBeEnabled({ timeout: 10000 });
  52 |     await sendButton.click();
  53 |     
  54 |     // Wait for intervention to be sent (pending state clears)
  55 |     await teacherPage.waitForLoadState('networkidle');
  56 |     await teacherPage.waitForTimeout(3000); // Give time for the message to be sent
  57 |     
  58 |     // Verify the intervention appears in the transcript (optimistic message shown)
  59 |     // The transcript is on the left side (flex-1) - target the message bubble area specifically
  60 |     const teacherIntervention = teacherPage.locator('.flex.gap-3:has-text("Teacher intervention"), div[class*="amber"]:has-text("Teacher intervention"), p:has-text("Teacher intervention")').first();
  61 |     await expect(teacherIntervention).toBeVisible({ timeout: 20000 });
  62 |     
  63 |     console.log('Teacher intervention successfully sent');
  64 |   });
  65 | 
  66 |   test('Student can see existing teacher interventions', async ({ studentPage }) => {
  67 |     await studentPage.goto(`/student/chat/${demoSessionId}`);
  68 |     await studentPage.waitForLoadState('networkidle');
  69 |     
  70 |     // Verify we're on the chat page
> 71 |     await expect(studentPage).toHaveURL(new RegExp(`/student/chat/${demoSessionId}`));
     |                               ^ Error: expect(page).toHaveURL(expected) failed
  72 |     
  73 |     // Wait for messages to load
  74 |     await studentPage.waitForSelector('.flex.gap-3', { timeout: 15000 });
  75 |     
  76 |     // Find teacher intervention messages (amber bubbles) - they have bg-amber-50 / dark:bg-amber-900/20 styling
  77 |     const interventions = studentPage.locator('div[class*="amber-50"], div[class*="amber-900"], div:has-text("Teacher Intervention")');
  78 |     
  79 |     // At least one intervention should be visible (from demo seed data)
  80 |     await expect(interventions.first()).toBeVisible({ timeout: 15000 });
  81 |     
  82 |     // Verify intervention content is present
  83 |     const interventionCount = await interventions.count();
  84 |     expect(interventionCount).toBeGreaterThan(0);
  85 |     
  86 |     console.log(`Student can see ${interventionCount} existing teacher intervention(s)`);
  87 |   });
  88 | });
```