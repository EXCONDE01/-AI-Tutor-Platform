import { test, expect } from './fixtures';

const GC_AUTH = '/api/google-classroom/auth';
const GC_COURSES = '/api/google-classroom/courses';
const GC_ROSTERS = '/api/google-classroom/rosters';
const GC_COURSEWORK = '/api/google-classroom/coursework';

test.describe('Google Classroom API — Graceful degradation (env missing)', () => {
  test('Admin: GET /api/google-classroom/auth → 503 or 200 depending on env', async ({ adminApi }) => {
    const res = await adminApi.get(GC_AUTH, { maxRedirects: 0 });
    // Either configured (200 with authorizationUrl) or not (503 with error)
    if (res.status() === 503) {
      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Google Classroom OAuth not configured');
    } else {
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('authorizationUrl');
      expect(typeof body.authorizationUrl).toBe('string');
      expect(body.authorizationUrl).toContain('accounts.google.com');
    }
  });

  test('Admin: GET /api/google-classroom/courses → < 500', async ({ adminApi }) => {
    const res = await adminApi.get(GC_COURSES, { maxRedirects: 0 });
    expect(res.status()).toBeLessThan(500);
  });

  test('Admin: GET /api/google-classroom/rosters?courseId=xyz → < 500', async ({ adminApi }) => {
    const res = await adminApi.get(`${GC_ROSTERS}?courseId=course-test-123`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('Admin: GET /api/google-classroom/coursework?courseId=xyz → < 500', async ({ adminApi }) => {
    const res = await adminApi.get(`${GC_COURSEWORK}?courseId=course-test-123`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('Anonymous: all four endpoints → 401/403', async ({ anonymousApi }) => {
    const endpoints = [GC_AUTH, GC_COURSES, `${GC_ROSTERS}?courseId=xyz`, `${GC_COURSEWORK}?courseId=xyz`];
    for (const ep of endpoints) {
      const res = await anonymousApi.get(ep, { maxRedirects: 0 });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('Student: all four endpoints → 401/403', async ({ studentApi }) => {
    const endpoints = [GC_AUTH, GC_COURSES, `${GC_ROSTERS}?courseId=xyz`, `${GC_COURSEWORK}?courseId=xyz`];
    for (const ep of endpoints) {
      const res = await studentApi.get(ep, { maxRedirects: 0 });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
  });
});

test.describe('Google Classroom UI Smoke', () => {
  test('/google-classroom page loads and shows Connect button', async ({ adminPage }) => {
    await adminPage.goto('/google-classroom', { waitUntil: 'domcontentloaded' });
    await expect(adminPage).toHaveURL(/\/google-classroom/);
    await expect(adminPage.getByRole('heading', { name: /Google Classroom/i })).toBeVisible({ timeout: 10000 });
    // Connect button visible when not connected
    await expect(adminPage.getByRole('button', { name: /Connect Google Classroom/i })).toBeVisible();
  });
});
