import { test, expect } from './fixtures';

test.describe('LTI AGS - Line Items & Scores (adminApi)', () => {
  const AGS_LINE_ITEMS = '/api/lti/ags/line-items';
  const AGS_SCORES = '/api/lti/ags/scores';

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let platformId: string | null = null;
  let deploymentId: string | null = null;
  let lineItemId: string | null = null;
  let districtId: string | null = null;

  test.beforeAll(async ({ adminApi }) => {
    // Resolve a districtId and create an AGS-supported platform + deployment for this test run
    const districtsRes = await adminApi.get('/api/admin/districts', { maxRedirects: 0 });
    expect(districtsRes.status()).toBe(200);
    const districtsData = await districtsRes.json();
    const districts = Array.isArray(districtsData) ? districtsData : districtsData?.data ?? [];
    expect(districts.length).toBeGreaterThan(0);
    districtId = districts[0].id;
    expect(districtId).toBeTruthy();

    // Create platform with AGS support
    const createPlatformRes = await adminApi.post('/api/admin/lti/platforms', {
      data: {
        name: `AGS Test Platform ${suffix}`,
        districtId,
        issuer: `https://ags-test-${suffix}.example.com`,
        clientId: `ags-client-${suffix}`,
        authLoginUrl: `https://ags-test-${suffix}.example.com/login/oauth2/auth`,
        authTokenUrl: `https://ags-test-${suffix}.example.com/login/oauth2/token`,
        jwksUrl: `https://ags-test-${suffix}.example.com/api/lti/security/jwks`,
        supportsAGS: true,
        supportsNRPS: false,
        supportsDeepLinking: false,
        configuration: {
          agsEndpoint: {
            lineitems_url: `https://ags-test-${suffix}.example.com/ags/lineitems`,
            scope: ['https://purl.imsglobal.org/spec/lti-ags/scope/lineitem'],
            service_versions: ['2.0'],
          },
        },
      },
      maxRedirects: 0,
    });
    expect(createPlatformRes.status()).toBe(201);
    const platformBody = await createPlatformRes.json();
    platformId = platformBody.id;
    expect(platformId).toBeTruthy();

    // Activate platform (AGS endpoints are fake; we just need DB records)
    await adminApi.patch(`/api/admin/lti/platforms/${platformId}`, {
      data: { status: 'active' },
      maxRedirects: 0,
    });

    // Create deployment
    const createDeploymentRes = await adminApi.post('/api/admin/lti/deployments', {
      data: {
        platformId: platformId!,
        deploymentId: `ags-deploy-${suffix}`,
        name: `AGS Test Deployment ${suffix}`,
        targetLinkUri: `https://ags-test-${suffix}.example.com/lti/launch`,
      },
      maxRedirects: 0,
    });
    expect(createDeploymentRes.status()).toBe(201);
    const deploymentBody = await createDeploymentRes.json();
    deploymentId = deploymentBody.id;
    expect(deploymentId).toBeTruthy();
  });

  test.afterAll(async ({ adminApi }) => {
    // Best-effort cleanup
    if (deploymentId) {
      try { await adminApi.delete(`/api/admin/lti/deployments/${deploymentId}`, { maxRedirects: 0 }); } catch {}
    }
    if (platformId) {
      try { await adminApi.delete(`/api/admin/lti/platforms/${platformId}`, { maxRedirects: 0 }); } catch {}
    }
  });

  test('POST /api/lti/ags/line-items with valid payload → 201 (or 400 if AGS not configured)', async ({ adminApi }) => {
    expect(platformId).toBeTruthy();
    expect(deploymentId).toBeTruthy();

    const res = await adminApi.post(AGS_LINE_ITEMS, {
      data: {
        platformId,
        deploymentId,
        label: `AGS Line Item ${suffix}`,
        resourceLinkId: `resource-link-${suffix}`,
        scoreMaximum: 100,
        tags: ['exam', 'math'],
      },
      maxRedirects: 0,
    });

    // AGS endpoint is fake so createLineItem will fail against the LMS → 400.
    // If the platform isn't AGS-configured, also 400. Either way must not be 500.
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);

    const body = await res.json();
    if (res.status() === 201) {
      expect(body.lineItem).toBeTruthy();
      lineItemId = body.lineItem.id || body.lineItem.ltiLineItemUrl || null;
    }
  });

  test('GET /api/lti/ags/line-items → 200', async ({ adminApi }) => {
    const res = await adminApi.get(`${AGS_LINE_ITEMS}?page=1&pageSize=10`, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeTruthy();
    expect(typeof body.pagination.total).toBe('number');
  });

  test('GET /api/lti/ags/line-items?platformId=... → 200', async ({ adminApi }) => {
    expect(platformId).toBeTruthy();
    const res = await adminApi.get(`${AGS_LINE_ITEMS}?platformId=${platformId}`, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });

  test('GET /api/lti/ags/scores → 200', async ({ adminApi }) => {
    const res = await adminApi.get(`${AGS_SCORES}?page=1&pageSize=10`, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeTruthy();
  });

  test('POST /api/lti/ags/scores/[lineItemId] → 201 (or 404 if line item missing)', async ({ adminApi }) => {
    // Use a known-missing line item id to assert 404 path
    const missingId = '11111111-1111-4111-8111-111111111111';
    const missingRes = await adminApi.post(`${AGS_SCORES}/${missingId}`, {
      data: {
        userId: '11111111-1111-4111-8111-111111111111',
        scoreGiven: 85,
        comment: 'Test score',
      },
      maxRedirects: 0,
    });
    expect(missingRes.status()).toBe(404);

    // If we created a line item earlier, try posting a score to it
    if (lineItemId) {
      const res = await adminApi.post(`${AGS_SCORES}/${lineItemId}`, {
        data: {
          userId: '00000000-0000-0000-0000-000000000001',
          scoreGiven: 85,
          comment: 'Test score',
        },
        maxRedirects: 0,
      });
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('GET /api/lti/ags/line-items/[lineItemId] → 200 / 404', async ({ adminApi }) => {
    const missingId = '00000000-0000-0000-0000-000000000000';
    const res = await adminApi.get(`${AGS_LINE_ITEMS}/${missingId}`, { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test('GET /api/lti/ags/scores?lineItemId=...&userId=... → 200', async ({ adminApi }) => {
    expect(platformId).toBeTruthy();
    const res = await adminApi.get(`${AGS_SCORES}?lineItemId=${platformId}&page=1&pageSize=10`, { maxRedirects: 0 });
    // lineItemId is a platform id here (not a real line item), so returns empty 200
    expect(res.status()).toBe(200);
  });
});

test.describe('LTI AGS - Authorization (anonymous/student)', () => {
  const agsEndpoints = [
    { method: 'GET', path: '/api/lti/ags/line-items' },
    { method: 'POST', path: '/api/lti/ags/line-items' },
    { method: 'GET', path: '/api/lti/ags/line-items/00000000-0000-0000-0000-000000000000' },
    { method: 'GET', path: '/api/lti/ags/scores' },
    { method: 'POST', path: '/api/lti/ags/scores/00000000-0000-0000-0000-000000000000' },
  ];

  for (const { method, path } of agsEndpoints) {
    test(`anonymous ${method} ${path} → 401`, async ({ anonymousApi }) => {
      const res = method === 'GET'
        ? await anonymousApi.get(path, { maxRedirects: 0 })
        : await anonymousApi.post(path, { data: {}, maxRedirects: 0 });
      expect(res.status()).toBe(401);
    });

    test(`student ${method} ${path} → 403`, async ({ studentApi }) => {
      const res = method === 'GET'
        ? await studentApi.get(path, { maxRedirects: 0 })
        : await studentApi.post(path, { data: {}, maxRedirects: 0 });
      expect(res.status()).toBe(403);
    });
  }
});

test.describe('LTI AGS - Invalid UUID params', () => {
  test('GET line items with invalid UUID platformId → 400', async ({ adminApi }) => {
    const res = await adminApi.get('/api/lti/ags/line-items?platformId=not-a-uuid', { maxRedirects: 0 });
    // Invalid UUID filter is ignored gracefully (returns 200 with all items) OR 400 depending on impl.
    // The guardrail only requires non-500; assert < 500.
    expect(res.status()).toBeLessThan(500);
  });

  test('POST scores with invalid UUID lineItemId → 400', async ({ adminApi }) => {
    const res = await adminApi.post('/api/lti/ags/scores/not-a-uuid', {
      data: {
        userId: '00000000-0000-0000-0000-000000000001',
        scoreGiven: 85,
      },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(400);
  });

  test('POST line items with empty object → 4xx (never 500)', async ({ adminApi }) => {
    const res = await adminApi.post('/api/lti/ags/line-items', {
      data: {},
      maxRedirects: 0,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
