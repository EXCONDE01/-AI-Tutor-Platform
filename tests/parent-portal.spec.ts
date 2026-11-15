import { test, expect } from './fixtures';

test.describe('Parent Portal: Anonymous Access', () => {
  const parentPaths = ['/parent/children', '/parent/consent', '/parent/link-student'];

  for (const path of parentPaths) {
    test(`redirects ${path} to sign-in with callbackUrl`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in/);
      const url = new URL(page.url());
      expect(url.searchParams.get('callbackUrl')).toContain(path);
    });
  }
});

test.describe('Parent Portal: Student Role (wrong role)', () => {
  const parentPaths = ['/parent/children', '/parent/consent', '/parent/link-student'];

  for (const path of parentPaths) {
    test(`redirects ${path} to /unauthorized?requiredRole=parent`, async ({ studentPage }) => {
      await studentPage.goto(path);
      await expect(studentPage).toHaveURL(/\/unauthorized\?requiredRole=parent/);
    });
  }
});

test.describe('Parent Portal: Admin Role (wrong role)', () => {
  const parentPaths = ['/parent/children', '/parent/consent', '/parent/link-student'];

  for (const path of parentPaths) {
    test(`redirects ${path} to /unauthorized?requiredRole=parent`, async ({ adminPage }) => {
      await adminPage.goto(path);
      await expect(adminPage).toHaveURL(/\/unauthorized\?requiredRole=parent/);
    });
  }
});

test.describe('Parent Portal: API Authorization', () => {
  test('anonymousApi GET /api/parent/children → 401', async ({ anonymousApi }) => {
    const res = await anonymousApi.get('/api/parent/children', { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });

  test('anonymousApi GET /api/parent/consent → 401', async ({ anonymousApi }) => {
    const res = await anonymousApi.get('/api/parent/consent', { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });

  test('studentApi GET /api/parent/children → 403', async ({ studentApi }) => {
    const res = await studentApi.get('/api/parent/children', { maxRedirects: 0 });
    expect(res.status()).toBe(403);
  });

  test('adminApi GET /api/parent/children → 403', async ({ adminApi }) => {
    const res = await adminApi.get('/api/parent/children', { maxRedirects: 0 });
    expect(res.status()).toBe(403);
  });
});

test.describe('Parent Portal: UI Smoke', () => {
  test('/parent/consent loads or redirects (no 500)', async ({ page }) => {
    const res = await page.goto('/parent/consent', { waitUntil: 'domcontentloaded' });
    const status = res?.status() ?? 0;
    expect(status).toBeLessThan(500);
  });
});
