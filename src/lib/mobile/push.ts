/**
 * Mobile (Capacitor Android) push notification registration and handling.
 *
 * This module gracefully degrades when running outside of Capacitor
 * (e.g., in a PWA or standard web context). All Capacitor imports are
 * dynamic and wrapped in try/catch.
 */

export interface MobilePushToken {
  token: string;
  platform: 'android';
}

export interface PushNotificationPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  clickAction?: string;
}

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
 * Dynamically import @capacitor/push-notifications.
 * Returns null if not available.
 */
async function getPushNotificationsPlugin() {
  try {
    const mod = await import('@capacitor/push-notifications');
    return mod.PushNotifications;
  } catch {
    return null;
  }
}

/**
 * Request push notification permissions and register for FCM token.
 * Returns the FCM token or null if unavailable.
 */
export async function registerPush(): Promise<MobilePushToken | null> {
  const available = await isCapacitorAvailable();
  if (!available) {
    return null;
  }

  const PushNotifications = await getPushNotificationsPlugin();
  if (!PushNotifications) {
    return null;
  }

  try {
    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive === 'denied') {
      console.error('[Mobile Push] Permission denied for push notifications');
      return null;
    }

    // Register with FCM/APNs
    await PushNotifications.register();

    // Listen for registration
    return new Promise((resolve) => {
      const handleRegistration = (data: unknown) => {
        const token = (data as { value: string }).value;
        registrationRemove();
        errorRemove();
        resolve({ token, platform: 'android' });
      };

      const handleError = (data: unknown) => {
        const error = (data as { message: string }).message;
        registrationRemove();
        errorRemove();
        console.error('[Mobile Push] Registration error:', error);
        resolve(null);
      };

      const registrationRemove = PushNotifications.addListener(
        'registration',
        handleRegistration
      ).remove;
      const errorRemove = PushNotifications.addListener(
        'registrationError',
        handleError
      ).remove;

      // Safety timeout
      setTimeout(() => {
        registrationRemove();
        errorRemove();
        resolve(null);
      }, 15000);
    });
  } catch (error) {
    console.error('[Mobile Push] Failed to register:', error);
    return null;
  }
}

/**
 * Sync the FCM token to the backend via /api/push/subscribe.
 * The backend accepts platform: 'android' and stores it with empty p256dh/auth.
 */
export async function syncPushToken(token: string, userId: string): Promise<void> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'subscribe',
        subscription: {
          endpoint: token,
          keys: {
            p256dh: '',
            auth: '',
          },
          platform: 'android',
          userAgent: 'capacitor-android',
        },
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Mobile Push] Failed to sync token:', error);
      throw new Error(error.error || 'Failed to sync push token');
    }
  } catch (error) {
    console.error('[Mobile Push] Network error syncing token:', error);
    throw error;
  }
}

/**
 * Set up a listener for incoming push notifications.
 * The callback receives the notification payload.
 */
export async function onPushNotification(
  callback: (payload: PushNotificationPayload) => void
): Promise<void> {
  const available = await isCapacitorAvailable();
  if (!available) {
    return;
  }

  const PushNotifications = await getPushNotificationsPlugin();
  if (!PushNotifications) {
    return;
  }

  try {
    // Listen for push notifications received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (data: unknown) => {
      const notification = data as { title?: string; body?: string; data?: unknown; clickAction?: string };
      callback({
        title: notification.title,
        body: notification.body,
        data: notification.data as Record<string, unknown> | undefined,
        clickAction: notification.clickAction,
      });
    });

    // Listen for push notifications opened by user (app was in background/closed)
    PushNotifications.addListener('pushNotificationActionPerformed', (data: unknown) => {
      const action = data as { notification: { title?: string; body?: string; data?: unknown }; actionId?: string };
      const notification = action.notification;
      callback({
        title: notification.title,
        body: notification.body,
        data: notification.data as Record<string, unknown> | undefined,
        clickAction: action.actionId,
      });
    });
  } catch (error) {
    console.error('[Mobile Push] Failed to add push listeners:', error);
  }
}

/**
 * Remove all push notification listeners (cleanup on logout).
 */
export async function removePushListeners(): Promise<void> {
  const available = await isCapacitorAvailable();
  if (!available) {
    return;
  }

  const PushNotifications = await getPushNotificationsPlugin();
  if (!PushNotifications) {
    return;
  }

  try {
    await PushNotifications.removeAllListeners();
  } catch (error) {
    console.error('[Mobile Push] Failed to remove listeners:', error);
  }
}

/**
 * Get the current FCM token (if already registered).
 */
export async function getCurrentToken(): Promise<string | null> {
  const available = await isCapacitorAvailable();
  if (!available) {
    return null;
  }

  const PushNotifications = await getPushNotificationsPlugin();
  if (!PushNotifications) {
    return null;
  }

  try {
    const result = await PushNotifications.getDeliveredNotifications();
    // Note: getDeliveredNotifications doesn't return the token directly.
    // The token is typically obtained during registration.
    // This is a placeholder for any future API that might provide it.
    return null;
  } catch {
    return null;
  }
}