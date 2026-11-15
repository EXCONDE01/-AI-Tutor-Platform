/**
 * Data Deletion Workflow — Playwright E2E Tests
 *
 * Covers:
 * - Student: POST /api/deletion-request → 201 with token; GET own requests
 * - Admin: GET list; verify; execute on unscheduled → 409; schedule; execute → 202; completed
 * - Anonymous: POST → 401; GET admin → 401
 * - Student trying admin endpoint → 403
 * - Audit: data_deletion_executed row after execute
 */

import { test, expect } from './fixtures';

const ADMIN_USER_ID = 'admin-user-id'; // filled dynamically from session where possible

test.describe('Data Deletion Workflow', () => {
  test.describe('Student (user-facing)', () => {
    test('POST /api/deletion-request → 201 with verification token', async ({ studentApi }) => {
      const res = await studentApi.post('/api/deletion-request', {
        data: {
          reason: 'I want my data deleted under GDPR',
          legalBasis: 'gdpr',
          scope: { includeBackups: true },
        },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.id).toBeTruthy();
      expect(body.verificationToken).toBeTruthy();
      expect(typeof body.verificationToken).toBe('string');
      expect(body.verificationToken.length).toBeGreaterThan(0);
    });

    test('GET /api/deletion-request → sees own request', async ({ studentApi }) => {
      // Submit a request first
      const postRes = await studentApi.post('/api/deletion-request', {
        data: {
          reason: 'List visibility test',
          legalBasis: 'ccpa',
        },
      });
      expect(postRes.status()).toBe(201);
      const postBody = await postRes.json();
      const requestId = postBody.id;

      // List own requests
      const getRes = await studentApi.get('/api/deletion-request');
      expect(getRes.status()).toBe(200);
      const body = await getRes.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
      const found = body.data.find((r: any) => r.id === requestId);
      expect(found).toBeTruthy();
      expect(found.status).toBe('requested');
    });

    test('POST /api/deletion-request → 400 on invalid legalBasis', async ({ studentApi }) => {
      const res = await studentApi.post('/api/deletion-request', {
        data: {
          reason: 'test',
          legalBasis: 'not-a-valid-basis',
        },
      });
      expect(res.status()).toBe(400);
    });
  });

  test.describe('Anonymous', () => {
    test('POST /api/deletion-request → 401', async ({ anonymousApi }) => {
      const res = await anonymousApi.post('/api/deletion-request', {
        data: {
          reason: 'test',
          legalBasis: 'gdpr',
        },
      });
      expect(res.status()).toBe(401);
    });

    test('GET /api/admin/deletion-requests → 401', async ({ anonymousApi }) => {
      const res = await anonymousApi.get('/api/admin/deletion-requests');
      expect(res.status()).toBe(401);
    });
  });

  test.describe('Admin', () => {
    let requestId: string;

    test.beforeEach(async ({ studentApi }) => {
      // Create a deletion request as a student so admin has something to manage
      const res = await studentApi.post('/api/deletion-request', {
        data: {
          reason: 'Admin workflow test request',
          legalBasis: 'ferpa',
          scope: { includeBackups: false },
        },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      requestId = body.id;
    });

    test('GET /api/admin/deletion-requests → 200 list', async ({ adminApi }) => {
      const res = await adminApi.get('/api/admin/deletion-requests');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
      const found = body.data.find((r: any) => r.id === requestId);
      expect(found).toBeTruthy();
      expect(found.userEmail).toBeTruthy();
    });

    test('PATCH verify → 200 status verified', async ({ adminApi }) => {
      const res = await adminApi.patch(`/api/admin/deletion-requests/${requestId}`, {
        data: { status: 'verified' },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('verified');
    });

    test('PATCH execute on unscheduled → 409', async ({ adminApi }) => {
      // First verify the request
      await adminApi.patch(`/api/admin/deletion-requests/${requestId}`, {
        data: { status: 'verified' },
      });

      const res = await adminApi.post(`/api/admin/deletion-requests/${requestId}/execute`);
      expect(res.status()).toBe(409);
    });

    test('PATCH schedule → 200 status scheduled', async ({ adminApi }) => {
      // Verify first
      await adminApi.patch(`/api/admin/deletion-requests/${requestId}`, {
        data: { status: 'verified' },
      });

      const res = await adminApi.patch(`/api/admin/deletion-requests/${requestId}`, {
        data: { status: 'scheduled' },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('scheduled');
      expect(body.scheduledAt).toBeTruthy();
    });

    test('POST execute → 202, then status completed', async ({ adminApi }) => {
      // Verify then schedule
      await adminApi.patch(`/api/admin/deletion-requests/${requestId}`, {
        data: { status: 'verified' },
      });
      await adminApi.patch(`/api/admin/deletion-requests/${requestId}`, {
        data: { status: 'scheduled' },
      });

      const execRes = await adminApi.post(`/api/admin/deletion-requests/${requestId}/execute`);
      expect(execRes.status()).toBe(202);

      // Check status is completed
      const listRes = await adminApi.get('/api/admin/deletion-requests');
      const body = await listRes.json();
      const found = body.data.find((r: any) => r.id === requestId);
      expect(found.status).toBe('completed');
      expect(found.deletedRecordCounts).toBeDefined();
    });

    test('PATCH cancel → 200 status cancelled', async ({ studentApi, adminApi }) => {
      // Create a fresh request to cancel
      const createRes = await studentApi.post('/api/deletion-request', {
        data: { reason: 'Cancel test', legalBasis: 'gdpr' },
      });
      expect(createRes.status()).toBe(201);
      const cancelId = (await createRes.json()).id;

      const cancelRes = await adminApi.patch(`/api/admin/deletion-requests/${cancelId}`, {
        data: { status: 'cancelled', note: 'Test cancellation' },
      });
      expect(cancelRes.status()).toBe(200);
      const body = await cancelRes.json();
      expect(body.status).toBe('cancelled');
    });

    test('Invalid id → 400', async ({ adminApi }) => {
      const res = await adminApi.patch('/api/admin/deletion-requests/not-a-uuid', {
        data: { status: 'verified' },
      });
      expect(res.status()).toBe(400);
    });

    test('Not found → 404', async ({ adminApi }) => {
      // Use a valid UUID v4 format that won't exist in DB
      const res = await adminApi.patch('/api/admin/deletion-requests/11111111-1111-4111-8111-111111111111', {
        data: { status: 'verified' },
      });
      expect(res.status()).toBe(404);
    });
  });

  test.describe('Authorization', () => {
    test('Student trying admin GET → 403', async ({ studentApi }) => {
      const res = await studentApi.get('/api/admin/deletion-requests');
      expect(res.status()).toBe(403);
    });

    test('Student trying admin PATCH → 403', async ({ studentApi }) => {
      const res = await studentApi.patch('/api/admin/deletion-requests/00000000-0000-0000-0000-000000000001', {
        data: { status: 'verified' },
      });
      expect(res.status()).toBe(403);
    });
  });

  test.describe('Audit', () => {
    test('data_deletion_executed row exists after execute', async ({ adminApi, studentApi }) => {
      // Create request
      const postRes = await studentApi.post('/api/deletion-request', {
        data: {
          reason: 'Audit test',
          legalBasis: 'gdpr',
        },
      });
      expect(postRes.status()).toBe(201);
      const reqId = (await postRes.json()).id;

      // Verify, schedule, execute
      await adminApi.patch(`/api/admin/deletion-requests/${reqId}`, { data: { status: 'verified' } });
      await adminApi.patch(`/api/admin/deletion-requests/${reqId}`, { data: { status: 'scheduled' } });
      await adminApi.post(`/api/admin/deletion-requests/${reqId}/execute`);

      // Query audit logs for this resource type
      const auditRes = await adminApi.get('/api/admin/audit?resourceType=data_deletion_request');
      expect(auditRes.status()).toBe(200);
      const auditBody = await auditRes.json();
      const executed = auditBody.data.find(
        (log: any) => log.action === 'data_deletion_executed' && log.resourceId === reqId
      );
      expect(executed).toBeTruthy();
      expect(executed.severity).toBe('medium'); // warning → medium
    });
  });
});
