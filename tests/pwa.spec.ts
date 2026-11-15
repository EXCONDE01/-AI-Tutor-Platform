import { test, expect } from './fixtures';

test.describe('PWA Features', () => {
  test('manifest.json loads and is valid', async ({ anonymousApi }) => {
    const response = await anonymousApi.get('/manifest.json', { maxRedirects: 0 });
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest).toBeDefined();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/?source=pwa');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Verify 192 and 512 icons present
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');

    // Verify display_override and launch_handler present
    expect(manifest.display_override).toContain('standalone');
    expect(manifest.launch_handler?.client_mode).toContain('navigate-existing');
  });

  test('sw.js is accessible and contains install + fetch listeners', async ({ anonymousApi }) => {
    const response = await anonymousApi.get('/sw.js', { maxRedirects: 0 });
    expect(response.status()).toBe(200);

    const swContent = await response.text();
    expect(swContent).toContain("addEventListener('install'");
    expect(swContent).toContain("addEventListener('fetch'");
    expect(swContent).toContain('skipWaiting()');
    expect(swContent).toContain('clients.claim()');
  });

  test('Push subscribe works for authenticated student', async ({ studentApi }) => {
    const payload = {
      action: 'subscribe',
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-student',
        keys: {
          p256dh: 'test-p256dh-key-student',
          auth: 'test-auth-key-student',
        },
        platform: 'web',
      },
    };

    const response = await studentApi.post('/api/push/subscribe', {
      data: payload,
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
  });

  test('Push subscribe rejects anonymous requests', async ({ anonymousApi }) => {
    const payload = {
      action: 'subscribe',
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-anon',
        keys: {
          p256dh: 'test-p256dh-key-anon',
          auth: 'test-auth-key-anon',
        },
        platform: 'web',
      },
    };

    const response = await anonymousApi.post('/api/push/subscribe', {
      data: payload,
      maxRedirects: 0,
    });
    expect(response.status()).toBe(401);
  });
});
