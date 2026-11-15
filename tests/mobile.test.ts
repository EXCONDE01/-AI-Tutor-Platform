/**
 * Mobile module unit tests (vitest).
 *
 * These tests run in jsdom and exercise pure logic. Capacitor plugins are
 * mocked via vitest so no native Android tooling is required.
 *
 * Note: @capacitor/* packages are NOT installed in this repo. The mobile
 * modules import them dynamically inside try/catch blocks and degrade
 * gracefully when absent. Tests therefore exercise the graceful-degradation
 * paths (PWA/web) plus pure logic functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Capacitor plugins globally so imports in mobile modules resolve.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@capacitor/secure-storage', () => ({
  SecureStorage: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    register: vi.fn(),
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
    vibrate: vi.fn(),
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
  },
}));

import { parseDeepLink, handleDeepLink, registerDeepLinkListener } from '@/lib/mobile/deeplinks';
import { registerPush } from '@/lib/mobile/push';
import { saveSession, loadSession, clearSession } from '@/lib/mobile/auth';
import { hapticImpact, hapticLight, hapticMedium, hapticHeavy, isHapticsAvailable } from '@/lib/mobile/haptics';

// Track localStorage state across tests
let localStorageStore: Record<string, string> = {};

function setupLocalStorageMock() {
  localStorageStore = {};
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
    return localStorageStore[key] ?? null;
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    localStorageStore[key] = value;
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
    delete localStorageStore[key];
  });
}

function teardownLocalStorageMock() {
  vi.restoreAllMocks();
}

beforeEach(() => {
  setupLocalStorageMock();
  vi.clearAllMocks();
});

afterEach(() => {
  teardownLocalStorageMock();
});

describe('parseDeepLink', () => {
  it('parses a valid custom-scheme LTI launch URL', () => {
    const result = parseDeepLink('aitutor://lti/launch?lti=abc123&deploy=def456');
    expect(result).not.toBeNull();
    expect(result!.path).toBe('/lti/launch');
    expect(result!.params.lti).toBe('abc123');
    expect(result!.params.deploy).toBe('def456');
  });

  it('parses a valid custom-scheme chat URL', () => {
    const result = parseDeepLink('aitutor://chat/sess_123');
    expect(result).not.toBeNull();
    expect(result!.path).toBe('/chat/sess_123');
    expect(result!.params).toEqual({});
  });

  it('parses an HTTPS App Links URL', () => {
    const result = parseDeepLink('https://aitutor.app/chat/sess_456?tab=messages');
    expect(result).not.toBeNull();
    expect(result!.path).toBe('/chat/sess_456');
    expect(result!.params.tab).toBe('messages');
  });

  it('parses root path', () => {
    const result = parseDeepLink('aitutor://');
    expect(result).not.toBeNull();
    expect(result!.path).toBe('/');
  });

  it('returns null for unknown paths', () => {
    expect(parseDeepLink('aitutor://unknown/path')).toBeNull();
  });

  it('returns null for non-aitutor HTTPS hosts', () => {
    expect(parseDeepLink('https://example.com/chat/123')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(parseDeepLink('not-a-url')).toBeNull();
    expect(parseDeepLink('')).toBeNull();
  });

  it('handles trailing slash normalization', () => {
    const result = parseDeepLink('aitutor://lti/launch/');
    expect(result).not.toBeNull();
    expect(result!.path).toBe('/lti/launch');
  });
});

describe('registerPush (PWA/web fallback)', () => {
  it('returns null when Capacitor is not available', async () => {
    const result = await registerPush();
    expect(result).toBeNull();
  });
});

describe('saveSession / loadSession round-trip (localStorage fallback)', () => {
  it('round-trips a session token via localStorage', async () => {
    await saveSession('session-token-abc');
    const loaded = await loadSession();
    expect(loaded).toBe('session-token-abc');
    expect(localStorageStore['neon_auth_session_token']).toBe('session-token-abc');
  });

  it('returns null when no session stored', async () => {
    const loaded = await loadSession();
    expect(loaded).toBeNull();
  });

  it('clearSession removes the token', async () => {
    localStorageStore['neon_auth_session_token'] = 'some-token';
    await clearSession();
    expect(localStorageStore['neon_auth_session_token']).toBeUndefined();
    const loaded = await loadSession();
    expect(loaded).toBeNull();
  });
});

describe('haptics graceful degradation', () => {
  it('returns false for availability when Capacitor not available', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    const available = await isHapticsAvailable();
    expect(available).toBe(false);
  });

  it('hapticImpact does not throw when plugin missing', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    await expect(hapticImpact('medium')).resolves.toBeUndefined();
  });

  it('hapticLight / hapticMedium / hapticHeavy do not throw', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    await expect(hapticLight()).resolves.toBeUndefined();
    await expect(hapticMedium()).resolves.toBeUndefined();
    await expect(hapticHeavy()).resolves.toBeUndefined();
  });
});

describe('registerDeepLinkListener graceful degradation', () => {
  it('does not throw when @capacitor/app missing', async () => {
    await expect(registerDeepLinkListener()).resolves.toBeUndefined();
  });
});

describe('handleDeepLink', () => {
  it('navigates via window.location.replace for recognized URL', () => {
    let calledUrl: string | null = null;
    const replaceMock = vi.fn((url: string) => { calledUrl = url; });
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, replace: replaceMock },
      configurable: true,
      writable: true,
    });
    handleDeepLink('aitutor://chat/sess_789');
    expect(calledUrl).toBe('/chat/sess_789');
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
    replaceMock.mockRestore();
  });

  it('does nothing for unrecognized URL', () => {
    let calledUrl: string | null = null;
    const replaceMock = vi.fn((url: string) => { calledUrl = url; });
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, replace: replaceMock },
      configurable: true,
      writable: true,
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    handleDeepLink('https://evil.com/x');
    expect(calledUrl).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
    replaceMock.mockRestore();
    errorSpy.mockRestore();
  });
});
