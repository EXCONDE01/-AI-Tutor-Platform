import { test, expect } from './fixtures';

test.describe('NRPS API Authorization Matrix', () => {
  const endpoints = [
    { method: 'GET', path: '/api/lti/nrps/members' },
    { method: 'GET', path: '/api/lti/nrps/contexts' },
    { method: 'POST', path: '/api/lti/nrps/sync' },
  ];

  for (const { method, path } of endpoints) {
    test(`anonymous ${method} ${path} → 401`, async ({ anonymousApi }) => {
      const res = method === 'GET'
        ? await anonymousApi.get(path, { maxRedirects: 0 })
        : await anonymousApi.post(path, { data: { platformId: '00000000-0000-0000-0000-000000000001', deploymentId: '00000000-0000-0000-0000-000000000002' }, maxRedirects: 0 });
      expect(res.status()).toBe(401);
    });

    test(`student ${method} ${path} → 403`, async ({ studentApi }) => {
      const res = method === 'GET'
        ? await studentApi.get(path, { maxRedirects: 0 })
        : await studentApi.post(path, { data: { platformId: '00000000-0000-0000-0000-000000000001', deploymentId: '00000000-0000-0000-0000-000000000002' }, maxRedirects: 0 });
      expect(res.status()).toBe(403);
    });

    test(`admin ${method} ${path} → < 500`, async ({ adminApi }) => {
      const res = method === 'GET'
        ? await adminApi.get(path, { maxRedirects: 0 })
        : await adminApi.post(path, { data: { platformId: '00000000-0000-0000-0000-000000000001', deploymentId: '00000000-0000-0000-0000-000000000002' }, maxRedirects: 0 });
      expect(res.status()).toBeLessThan(500);
    });
  }
});

test.describe('NRPS Sync (admin)', () => {
  test('POST /api/lti/nrps/sync with invalid UUID platformId → 400', async ({ adminApi }) => {
    const res = await adminApi.post('/api/lti/nrps/sync', {
      data: { platformId: 'not-a-uuid', deploymentId: '00000000-0000-0000-0000-000000000002' },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/lti/nrps/sync with valid-format UUIDs (not in DB) → 404 or 400', async ({ adminApi }) => {
    const res = await adminApi.post('/api/lti/nrps/sync', {
      data: {
        platformId: '00000000-0000-4000-8000-000000000001',
        deploymentId: '00000000-0000-4000-8000-000000000002',
      },
      maxRedirects: 0,
    });
    expect(res.status()).toBeLessThan(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});

test.describe('NRPS Members & Contexts (admin)', () => {
  test('GET /api/lti/nrps/members → 200 with pagination shape', async ({ adminApi }) => {
    const res = await adminApi.get('/api/lti/nrps/members?page=1&pageSize=50', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toHaveProperty('page');
    expect(body.pagination).toHaveProperty('pageSize');
    expect(body.pagination).toHaveProperty('total');
    expect(body.pagination).toHaveProperty('totalPages');
  });

  test('GET /api/lti/nrps/contexts → 200', async ({ adminApi }) => {
    const res = await adminApi.get('/api/lti/nrps/contexts', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });
});

test.describe('NRPS UI Smoke (adminPage)', () => {
  test('/lti/nrps renders heading and sync button', async ({ adminPage }) => {
    await adminPage.goto('/lti/nrps');
    await expect(adminPage).toHaveURL(/\/lti\/nrps/);
    await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(adminPage.getByRole('button', { name: /Sync NRPS Roster/i })).toBeVisible();
  });

  test('/lti/nrps redirects student to unauthorized', async ({ studentPage }) => {
    await studentPage.goto('/lti/nrps');
    await expect(studentPage).toHaveURL(/\/unauthorized\?requiredRole=admin/);
  });

  test('/lti/nrps redirects anonymous to sign-in', async ({ page }) => {
    await page.goto('/lti/nrps');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
