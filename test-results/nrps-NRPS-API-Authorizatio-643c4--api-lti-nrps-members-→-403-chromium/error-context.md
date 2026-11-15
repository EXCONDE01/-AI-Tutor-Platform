# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nrps.spec.ts >> NRPS API Authorization Matrix >> student GET /api/lti/nrps/members → 403
- Location: tests\nrps.spec.ts:18:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 401
```

# Test source

```ts
  1  | import { test, expect } from './fixtures';
  2  | 
  3  | test.describe('NRPS API Authorization Matrix', () => {
  4  |   const endpoints = [
  5  |     { method: 'GET', path: '/api/lti/nrps/members' },
  6  |     { method: 'GET', path: '/api/lti/nrps/contexts' },
  7  |     { method: 'POST', path: '/api/lti/nrps/sync' },
  8  |   ];
  9  | 
  10 |   for (const { method, path } of endpoints) {
  11 |     test(`anonymous ${method} ${path} → 401`, async ({ anonymousApi }) => {
  12 |       const res = method === 'GET'
  13 |         ? await anonymousApi.get(path, { maxRedirects: 0 })
  14 |         : await anonymousApi.post(path, { data: { platformId: '00000000-0000-0000-0000-000000000001', deploymentId: '00000000-0000-0000-0000-000000000002' }, maxRedirects: 0 });
  15 |       expect(res.status()).toBe(401);
  16 |     });
  17 | 
  18 |     test(`student ${method} ${path} → 403`, async ({ studentApi }) => {
  19 |       const res = method === 'GET'
  20 |         ? await studentApi.get(path, { maxRedirects: 0 })
  21 |         : await studentApi.post(path, { data: { platformId: '00000000-0000-0000-0000-000000000001', deploymentId: '00000000-0000-0000-0000-000000000002' }, maxRedirects: 0 });
> 22 |       expect(res.status()).toBe(403);
     |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  23 |     });
  24 | 
  25 |     test(`admin ${method} ${path} → < 500`, async ({ adminApi }) => {
  26 |       const res = method === 'GET'
  27 |         ? await adminApi.get(path, { maxRedirects: 0 })
  28 |         : await adminApi.post(path, { data: { platformId: '00000000-0000-0000-0000-000000000001', deploymentId: '00000000-0000-0000-0000-000000000002' }, maxRedirects: 0 });
  29 |       expect(res.status()).toBeLessThan(500);
  30 |     });
  31 |   }
  32 | });
  33 | 
  34 | test.describe('NRPS Sync (admin)', () => {
  35 |   test('POST /api/lti/nrps/sync with invalid UUID platformId → 400', async ({ adminApi }) => {
  36 |     const res = await adminApi.post('/api/lti/nrps/sync', {
  37 |       data: { platformId: 'not-a-uuid', deploymentId: '00000000-0000-0000-0000-000000000002' },
  38 |       maxRedirects: 0,
  39 |     });
  40 |     expect(res.status()).toBe(400);
  41 |     const body = await res.json();
  42 |     expect(body.error).toBeTruthy();
  43 |   });
  44 | 
  45 |   test('POST /api/lti/nrps/sync with valid-format UUIDs (not in DB) → 404 or 400', async ({ adminApi }) => {
  46 |     const res = await adminApi.post('/api/lti/nrps/sync', {
  47 |       data: {
  48 |         platformId: '00000000-0000-4000-8000-000000000001',
  49 |         deploymentId: '00000000-0000-4000-8000-000000000002',
  50 |       },
  51 |       maxRedirects: 0,
  52 |     });
  53 |     expect(res.status()).toBeLessThan(500);
  54 |     const body = await res.json();
  55 |     expect(body.error).toBeTruthy();
  56 |   });
  57 | });
  58 | 
  59 | test.describe('NRPS Members & Contexts (admin)', () => {
  60 |   test('GET /api/lti/nrps/members → 200 with pagination shape', async ({ adminApi }) => {
  61 |     const res = await adminApi.get('/api/lti/nrps/members?page=1&pageSize=50', { maxRedirects: 0 });
  62 |     expect(res.status()).toBe(200);
  63 |     const body = await res.json();
  64 |     expect(body).toHaveProperty('data');
  65 |     expect(Array.isArray(body.data)).toBe(true);
  66 |     expect(body).toHaveProperty('pagination');
  67 |     expect(body.pagination).toHaveProperty('page');
  68 |     expect(body.pagination).toHaveProperty('pageSize');
  69 |     expect(body.pagination).toHaveProperty('total');
  70 |     expect(body.pagination).toHaveProperty('totalPages');
  71 |   });
  72 | 
  73 |   test('GET /api/lti/nrps/contexts → 200', async ({ adminApi }) => {
  74 |     const res = await adminApi.get('/api/lti/nrps/contexts', { maxRedirects: 0 });
  75 |     expect(res.status()).toBe(200);
  76 |     const body = await res.json();
  77 |     expect(Array.isArray(body.data)).toBe(true);
  78 |   });
  79 | });
  80 | 
  81 | test.describe('NRPS UI Smoke (adminPage)', () => {
  82 |   test('/lti/nrps renders heading and sync button', async ({ adminPage }) => {
  83 |     await adminPage.goto('/lti/nrps');
  84 |     await expect(adminPage).toHaveURL(/\/lti\/nrps/);
  85 |     await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  86 |     await expect(adminPage.getByRole('button', { name: /Sync NRPS Roster/i })).toBeVisible();
  87 |   });
  88 | 
  89 |   test('/lti/nrps redirects student to unauthorized', async ({ studentPage }) => {
  90 |     await studentPage.goto('/lti/nrps');
  91 |     await expect(studentPage).toHaveURL(/\/unauthorized\?requiredRole=admin/);
  92 |   });
  93 | 
  94 |   test('/lti/nrps redirects anonymous to sign-in', async ({ page }) => {
  95 |     await page.goto('/lti/nrps');
  96 |     await expect(page).toHaveURL(/\/sign-in/);
  97 |   });
  98 | });
  99 | 
```