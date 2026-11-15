# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: parent-portal.spec.ts >> Parent Portal: API Authorization >> studentApi GET /api/parent/children → 403
- Location: tests\parent-portal.spec.ts:49:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 200
```

# Test source

```ts
  1  | import { test, expect } from './fixtures';
  2  | 
  3  | test.describe('Parent Portal: Anonymous Access', () => {
  4  |   const parentPaths = ['/parent/children', '/parent/consent', '/parent/link-student'];
  5  | 
  6  |   for (const path of parentPaths) {
  7  |     test(`redirects ${path} to sign-in with callbackUrl`, async ({ page }) => {
  8  |       await page.goto(path);
  9  |       await expect(page).toHaveURL(/\/sign-in/);
  10 |       const url = new URL(page.url());
  11 |       expect(url.searchParams.get('callbackUrl')).toContain(path);
  12 |     });
  13 |   }
  14 | });
  15 | 
  16 | test.describe('Parent Portal: Student Role (wrong role)', () => {
  17 |   const parentPaths = ['/parent/children', '/parent/consent', '/parent/link-student'];
  18 | 
  19 |   for (const path of parentPaths) {
  20 |     test(`redirects ${path} to /unauthorized?requiredRole=parent`, async ({ studentPage }) => {
  21 |       await studentPage.goto(path);
  22 |       await expect(studentPage).toHaveURL(/\/unauthorized\?requiredRole=parent/);
  23 |     });
  24 |   }
  25 | });
  26 | 
  27 | test.describe('Parent Portal: Admin Role (wrong role)', () => {
  28 |   const parentPaths = ['/parent/children', '/parent/consent', '/parent/link-student'];
  29 | 
  30 |   for (const path of parentPaths) {
  31 |     test(`redirects ${path} to /unauthorized?requiredRole=parent`, async ({ adminPage }) => {
  32 |       await adminPage.goto(path);
  33 |       await expect(adminPage).toHaveURL(/\/unauthorized\?requiredRole=parent/);
  34 |     });
  35 |   }
  36 | });
  37 | 
  38 | test.describe('Parent Portal: API Authorization', () => {
  39 |   test('anonymousApi GET /api/parent/children → 401', async ({ anonymousApi }) => {
  40 |     const res = await anonymousApi.get('/api/parent/children', { maxRedirects: 0 });
  41 |     expect(res.status()).toBe(401);
  42 |   });
  43 | 
  44 |   test('anonymousApi GET /api/parent/consent → 401', async ({ anonymousApi }) => {
  45 |     const res = await anonymousApi.get('/api/parent/consent', { maxRedirects: 0 });
  46 |     expect(res.status()).toBe(401);
  47 |   });
  48 | 
  49 |   test('studentApi GET /api/parent/children → 403', async ({ studentApi }) => {
  50 |     const res = await studentApi.get('/api/parent/children', { maxRedirects: 0 });
> 51 |     expect(res.status()).toBe(403);
     |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  52 |   });
  53 | 
  54 |   test('adminApi GET /api/parent/children → 403', async ({ adminApi }) => {
  55 |     const res = await adminApi.get('/api/parent/children', { maxRedirects: 0 });
  56 |     expect(res.status()).toBe(403);
  57 |   });
  58 | });
  59 | 
  60 | test.describe('Parent Portal: UI Smoke', () => {
  61 |   test('/parent/consent loads or redirects (no 500)', async ({ page }) => {
  62 |     const res = await page.goto('/parent/consent', { waitUntil: 'domcontentloaded' });
  63 |     const status = res?.status() ?? 0;
  64 |     expect(status).toBeLessThan(500);
  65 |   });
  66 | });
  67 | 
```