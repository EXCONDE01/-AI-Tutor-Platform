import { test, expect } from './fixtures';

test.describe('LTI Platform CRUD (adminApi)', () => {
  const adminEndpoints = {
    districts: '/api/admin/districts',
    platforms: '/api/admin/lti/platforms',
    deployments: '/api/admin/lti/deployments',
    audit: '/api/admin/audit',
  };

  test('Full lifecycle: create → update → rotate-keys → create deployment → update deployment → delete deployment → delete platform', async ({ adminApi }) => {
    // Generate unique suffix for this test run
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const platformName = `Test Platform ${suffix}`;
    const deploymentName = `Test Deployment ${suffix}`;

    let platformId: string | null = null;
    let deploymentId: string | null = null;
    let districtId: string | null = null;

    try {
      // 1. Resolve a districtId from GET /api/admin/districts
      const districtsRes = await adminApi.get(adminEndpoints.districts, { maxRedirects: 0 });
      expect(districtsRes.status()).toBe(200);
      const districtsData = await districtsRes.json();
      const districts = Array.isArray(districtsData) ? districtsData : districtsData?.data ?? [];
      expect(districts.length).toBeGreaterThan(0);
      districtId = districts[0].id;
      expect(districtId).toBeTruthy();

      // 2. POST /api/admin/lti/platforms with a valid payload → 201, capture id; assert status is pending
      const createPlatformRes = await adminApi.post(adminEndpoints.platforms, {
        data: {
          name: platformName,
          districtId,
          issuer: 'https://canvas.example.com',
          clientId: `test-client-${suffix}`,
          deploymentId: `test-deployment-${suffix}`,
          authLoginUrl: 'https://canvas.example.com/login/oauth2/auth',
          authTokenUrl: 'https://canvas.example.com/login/oauth2/token',
          jwksUrl: 'https://canvas.example.com/api/lti/security/jwks',
          scopes: [
            'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
            'https://purl.imsglobal.org/spec/lti-ags/scope/score',
            'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
            'openid',
          ],
          supportsNRPS: true,
          supportsAGS: true,
          supportsDeepLinking: false,
          supportsAssignmentSelection: false,
          supportsResourceLinkMessage: true,
        },
        maxRedirects: 0,
      });
      expect(createPlatformRes.status()).toBe(201);
      const createPlatformBody = await createPlatformRes.json();
      platformId = createPlatformBody.id;
      expect(platformId).toBeTruthy();
      expect(createPlatformBody.status).toBe('pending');
      expect(createPlatformBody.name).toBe(platformName);

      // 3. PATCH /api/admin/lti/platforms/{id} { name: ..., status: 'active' } → 200
      const updatedName = `Updated ${platformName}`;
      const updatePlatformRes = await adminApi.patch(`${adminEndpoints.platforms}/${platformId}`, {
        data: { name: updatedName, status: 'active' },
        maxRedirects: 0,
      });
      expect(updatePlatformRes.status()).toBe(200);
      const updatePlatformBody = await updatePlatformRes.json();
      expect(updatePlatformBody.name).toBe(updatedName);
      expect(updatePlatformBody.status).toBe('active');

      // 4. POST /api/admin/lti/platforms/{id}/rotate-keys → 200; assert body has publicKey and does NOT contain privateKey
      const rotateKeysRes = await adminApi.post(`${adminEndpoints.platforms}/${platformId}/rotate-keys`, {
        maxRedirects: 0,
      });
      expect(rotateKeysRes.status()).toBe(200);
      const rotateKeysBody = await rotateKeysRes.json();
      expect(rotateKeysBody.publicKey).toBeTruthy();
      expect(rotateKeysBody.privateKey).toBeUndefined();
      // Also assert on raw text to ensure private key never appears
      const rawText = JSON.stringify(rotateKeysBody);
      expect(rawText).not.toContain('PRIVATE KEY');
      expect(rawText).not.toContain('privateKey');

      // 5. POST /api/admin/lti/deployments { platformId, deploymentId, name, targetLinkUri } → 201
      const createDeploymentRes = await adminApi.post(adminEndpoints.deployments, {
        data: {
          platformId: platformId!,
          deploymentId: `deploy-${suffix}`,
          name: deploymentName,
          targetLinkUri: 'https://canvas.example.com/lti/launch',
        },
        maxRedirects: 0,
      });
      expect(createDeploymentRes.status()).toBe(201);
      const createDeploymentBody = await createDeploymentRes.json();
      deploymentId = createDeploymentBody.id;
      expect(deploymentId).toBeTruthy();
      expect(createDeploymentBody.name).toBe(deploymentName);

      // 6. PATCH /api/admin/lti/deployments/{id} { name, status: 'inactive' } → 200
      const updatedDeploymentName = `Updated ${deploymentName}`;
      const updateDeploymentRes = await adminApi.patch(`${adminEndpoints.deployments}/${deploymentId}`, {
        data: { name: updatedDeploymentName, status: 'inactive' },
        maxRedirects: 0,
      });
      expect(updateDeploymentRes.status()).toBe(200);
      const updateDeploymentBody = await updateDeploymentRes.json();
      expect(updateDeploymentBody.name).toBe(updatedDeploymentName);
      expect(updateDeploymentBody.status).toBe('inactive');

      // 7. DELETE /api/admin/lti/deployments/{id} → 200
      const deleteDeploymentRes = await adminApi.delete(`${adminEndpoints.deployments}/${deploymentId}`, {
        maxRedirects: 0,
      });
      expect(deleteDeploymentRes.status()).toBe(200);

      // 8. DELETE /api/admin/lti/platforms/{id} → 200
      const deletePlatformRes = await adminApi.delete(`${adminEndpoints.platforms}/${platformId}`, {
        maxRedirects: 0,
      });
      expect(deletePlatformRes.status()).toBe(200);

      // 9. Audit assertion: GET /api/admin/audit?resourceType=lti_platform&pageSize=50
      // Assert at least one row exists whose description contains the platform id we deleted
      const auditPlatformRes = await adminApi.get(`${adminEndpoints.audit}?resourceType=lti_platform&pageSize=50`, {
        maxRedirects: 0,
      });
      expect(auditPlatformRes.status()).toBe(200);
      const auditPlatformBody = await auditPlatformRes.json();
      const auditPlatformData = auditPlatformBody.data ?? [];
      const platformAuditEntry = auditPlatformData.find((row: any) => 
        row.description && row.description.includes(platformId!)
      );
      expect(platformAuditEntry).toBeTruthy();

      // Same for lti_deployment
      const auditDeploymentRes = await adminApi.get(`${adminEndpoints.audit}?resourceType=lti_deployment&pageSize=50`, {
        maxRedirects: 0,
      });
      expect(auditDeploymentRes.status()).toBe(200);
      const auditDeploymentBody = await auditDeploymentRes.json();
      const auditDeploymentData = auditDeploymentBody.data ?? [];
      const deploymentAuditEntry = auditDeploymentData.find((row: any) =>
        row.description && row.description.includes(deploymentId!)
      );
      expect(deploymentAuditEntry).toBeTruthy();

    } finally {
      // Cleanup: best-effort DELETE of both ids, ignoring non-2xx
      if (deploymentId) {
        try {
          await adminApi.delete(`${adminEndpoints.deployments}/${deploymentId}`, { maxRedirects: 0 });
        } catch {}
      }
      if (platformId) {
        try {
          await adminApi.delete(`${adminEndpoints.platforms}/${platformId}`, { maxRedirects: 0 });
        } catch {}
      }
    }
  });

  test('PATCH /api/admin/lti/platforms/not-a-uuid → 400', async ({ adminApi }) => {
    const res = await adminApi.patch('/api/admin/lti/platforms/not-a-uuid', {
      data: { name: 'test' },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(400);
  });

  test('PATCH /api/admin/lti/platforms/00000000-0000-0000-0000-000000000000 → 404', async ({ adminApi }) => {
    const res = await adminApi.patch('/api/admin/lti/platforms/00000000-0000-0000-0000-000000000000', {
      data: { name: 'test' },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(404);
  });

  test('DELETE /api/admin/lti/deployments/00000000-0000-0000-0000-000000000000 → 404', async ({ adminApi }) => {
    const res = await adminApi.delete('/api/admin/lti/deployments/00000000-0000-0000-0000-000000000000', {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(404);
  });

  test('POST /api/admin/lti/platforms with empty object → 4xx (never 500)', async ({ adminApi }) => {
    const res = await adminApi.post('/api/admin/lti/platforms', {
      data: {},
      maxRedirects: 0,
    });
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('LTI Platforms UI Smoke (adminPage)', () => {
  test('/admin/lti/platforms renders heading and create action', async ({ adminPage }) => {
    await adminPage.goto('/admin/lti/platforms');
    await expect(adminPage).toHaveURL(/\/admin\/lti\/platforms/);
    await expect(adminPage.getByRole('heading', { name: /LTI Platforms/i })).toBeVisible({ timeout: 10000 });
    // "Add Platform" button (from LTIPlatformsClient.tsx line 246-249)
    await expect(adminPage.getByRole('button', { name: /Add Platform/i })).toBeVisible();
  });

  test('/admin/lti/deployments renders heading', async ({ adminPage }) => {
    await adminPage.goto('/admin/lti/deployments');
    await expect(adminPage).toHaveURL(/\/admin\/lti\/deployments/);
    await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  });
});