import { test, expect } from './fixtures';

test.describe('Authorization: Anonymous', () => {
  const adminPaths = ['/admin', '/admin/audit', '/admin/lti/platforms'];
  const teacherPaths = ['/teacher/dashboard'];
  const studentPaths = ['/student/sessions'];

  for (const path of [...adminPaths, ...teacherPaths, ...studentPaths]) {
    test(`redirects ${path} to sign-in with callbackUrl`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in/);
      const url = new URL(page.url());
      expect(url.searchParams.get('callbackUrl')).toContain(path);
    });
  }

  test('/unauthorized loads without redirect (public)', async ({ page }) => {
    await page.goto('/unauthorized');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('/ (home) loads without redirect', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Authorization: Student', () => {
  test('/student/sessions stays on page', async ({ studentPage }) => {
    await studentPage.goto('/student/sessions');
    await expect(studentPage).toHaveURL(/\/student\/sessions/);
    // Verify page content loads (heading visible)
    await expect(studentPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  });

  for (const path of ['/admin', '/admin/audit', '/admin/lti/platforms']) {
    test(`redirects ${path} to /unauthorized?requiredRole=admin`, async ({ studentPage }) => {
      await studentPage.goto(path);
      await expect(studentPage).toHaveURL(/\/unauthorized\?requiredRole=admin/);
    });
  }

  test('redirects /teacher/dashboard to /unauthorized?requiredRole=teacher', async ({ studentPage }) => {
    await studentPage.goto('/teacher/dashboard');
    await expect(studentPage).toHaveURL(/\/unauthorized\?requiredRole=teacher/);
  });
});

test.describe('Authorization: Teacher', () => {
  test('/teacher/dashboard stays on page', async ({ teacherPage }) => {
    await teacherPage.goto('/teacher/dashboard');
    await expect(teacherPage).toHaveURL(/\/teacher\/dashboard/);
    await expect(teacherPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  });

  for (const path of ['/admin/lti/platforms', '/admin/audit']) {
    test(`redirects ${path} to /unauthorized?requiredRole=admin`, async ({ teacherPage }) => {
      await teacherPage.goto(path);
      await expect(teacherPage).toHaveURL(/\/unauthorized\?requiredRole=admin/);
    });
  }

  test('redirects /student/classes to /unauthorized?requiredRole=student', async ({ teacherPage }) => {
    await teacherPage.goto('/student/classes');
    await expect(teacherPage).toHaveURL(/\/unauthorized\?requiredRole=student/);
  });
});

test.describe('Authorization: Admin', () => {
  test('/admin lands on /admin/lti/platforms (index redirect)', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage).toHaveURL(/\/admin\/lti\/platforms/);
    await expect(adminPage.getByRole('heading', { name: /LTI Platforms/i })).toBeVisible({ timeout: 10000 });
  });

  test('/admin/lti/platforms returns 200 with heading', async ({ adminPage }) => {
    await adminPage.goto('/admin/lti/platforms');
    await expect(adminPage).toHaveURL(/\/admin\/lti\/platforms/);
    await expect(adminPage.getByRole('heading', { name: /LTI Platforms/i })).toBeVisible();
  });

  test('/admin/lti/deployments returns 200', async ({ adminPage }) => {
    await adminPage.goto('/admin/lti/deployments');
    await expect(adminPage).toHaveURL(/\/admin\/lti\/deployments/);
    await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('/admin/audit returns 200', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await expect(adminPage).toHaveURL(/\/admin\/audit/);
    await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('redirects /teacher/dashboard to /unauthorized?requiredRole=teacher (admin is not a teacher)', async ({ adminPage }) => {
    await adminPage.goto('/teacher/dashboard');
    await expect(adminPage).toHaveURL(/\/unauthorized\?requiredRole=teacher/);
  });
});

test.describe('API Authorization Matrix', () => {
  const adminEndpoints = [
    '/api/admin/districts',
    '/api/admin/audit',
    '/api/admin/lti/platforms',
    '/api/admin/lti/deployments',
  ];

  for (const endpoint of adminEndpoints) {
    test(`anonymousApi GET ${endpoint} → 401`, async ({ anonymousApi }) => {
      const res = await anonymousApi.get(endpoint, { maxRedirects: 0 });
      expect(res.status()).toBe(401);
    });

    test(`studentApi GET ${endpoint} → 403`, async ({ studentApi }) => {
      const res = await studentApi.get(endpoint, { maxRedirects: 0 });
      expect(res.status()).toBe(403);
    });

    test(`adminApi GET ${endpoint} → 200`, async ({ adminApi }) => {
      const res = await adminApi.get(endpoint, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
    });
  }

  test('guard: student GET /api/admin/audit?... returns 403 (not 200-with-data)', async ({ studentApi }) => {
    const res = await studentApi.get('/api/admin/audit?resourceType=lti_platform&pageSize=50', { maxRedirects: 0 });
    expect(res.status()).toBe(403);
  });
});