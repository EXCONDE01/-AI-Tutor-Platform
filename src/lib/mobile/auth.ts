/**
 * Mobile (Capacitor Android) session persistence.
 *
 * Stores the Neon Auth session token in Capacitor Preferences, with a
 * localStorage fallback for PWA/web contexts. All Capacitor imports are
 * dynamic and wrapped in try/catch for graceful degradation.
 *
 * The token stored here is the session_token from Neon Auth's
 * `neon-auth.session_token` cookie, which can be sent with subsequent
 * requests to authenticate on the mobile WebView.
 */

const SESSION_KEY = 'neon_auth_session_token';

/**
 * Check if we're running inside a Capacitor environment.
 */
async function isCapacitorAvailable(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Dynamically import @capacitor/preferences.
 * Returns null if not available.
 */
async function getPreferencesPlugin() {
  try {
    const mod = await import('@capacitor/preferences');
    return mod.Preferences;
  } catch {
    return null;
  }
}

/**
 * Dynamically import @capacitor/secure-storage (community plugin, may not exist).
 * Returns null if not available.
 */
async function getSecureStoragePlugin() {
  try {
    const mod = await import('@capacitor/secure-storage');
    return mod.SecureStorage;
  } catch {
    return null;
  }
}

/**
 * Save the Neon Auth session token to Capacitor Preferences (and Secure
 * Storage when available), with localStorage fallback for PWA/web.
 */
export async function saveSession(token: string): Promise<void> {
  if (!token || typeof token !== 'string') {
    throw new Error('saveSession requires a non-empty token string');
  }

  const available = await isCapacitorAvailable();
  const Preferences = available ? await getPreferencesPlugin() : null;
  const SecureStorage = available ? await getSecureStoragePlugin() : null;

  // Prefer Secure Storage if available (encrypted at rest on device)
  if (SecureStorage) {
    try {
      await SecureStorage.set({ key: SESSION_KEY, value: token });
    } catch (error) {
      console.error('[Mobile Auth] SecureStorage save failed:', error);
      // Fall through to Preferences fallback
    }
  }

  // Preferences as primary/fallback
  if (Preferences) {
    try {
      await Preferences.set({ key: SESSION_KEY, value: token });
      return;
    } catch (error) {
      console.error('[Mobile Auth] Preferences save failed:', error);
    }
  }

  // PWA/web fallback: localStorage
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch (error) {
    console.error('[Mobile Auth] localStorage save failed:', error);
    throw error;
  }
}

/**
 * Load the Neon Auth session token from Capacitor Preferences (preferred)
 * or Secure Storage, with localStorage fallback.
 *
 * Returns null if no token is stored.
 */
export async function loadSession(): Promise<string | null> {
  const available = await isCapacitorAvailable();
  const Preferences = available ? await getPreferencesPlugin() : null;
  const SecureStorage = available ? await getSecureStoragePlugin() : null;

  // Prefer Secure Storage if available
  if (SecureStorage) {
    try {
      const result = await SecureStorage.get({ key: SESSION_KEY });
      if (result.value) {
        return result.value;
      }
    } catch (error) {
      console.error('[Mobile Auth] SecureStorage load failed:', error);
      // Fall through to Preferences
    }
  }

  // Preferences
  if (Preferences) {
    try {
      const result = await Preferences.get({ key: SESSION_KEY });
      if (result.value) {
        return result.value;
      }
    } catch (error) {
      console.error('[Mobile Auth] Preferences load failed:', error);
    }
  }

  // PWA/web fallback: localStorage
  try {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) {
      return token;
    }
  } catch (error) {
    console.error('[Mobile Auth] localStorage load failed:', error);
  }

  return null;
}

/**
 * Clear the Neon Auth session token from all storage locations.
 */
export async function clearSession(): Promise<void> {
  const available = await isCapacitorAvailable();
  const Preferences = available ? await getPreferencesPlugin() : null;
  const SecureStorage = available ? await getSecureStoragePlugin() : null;

  if (SecureStorage) {
    try {
      await SecureStorage.remove({ key: SESSION_KEY });
    } catch (error) {
      console.error('[Mobile Auth] SecureStorage clear failed:', error);
    }
  }

  if (Preferences) {
    try {
      await Preferences.remove({ key: SESSION_KEY });
    } catch (error) {
      console.error('[Mobile Auth] Preferences clear failed:', error);
    }
  }

  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('[Mobile Auth] localStorage clear failed:', error);
  }
}

/**
 * Restore session on app launch. Returns the token if one exists.
 *
 * This is intended to be called when the mobile app initializes, e.g.
 * inside the root layout or app component:
 *
 *   const token = await restoreSession();
 *   if (token) { /* set auth state / redirect to dashboard *\/
 */
export async function restoreSession(): Promise<string | null> {
  return loadSession();
}
