/**
 * Server-side push notification utilities
 * Handles VAPID configuration, subscription management, and notification sending
 */

import webpush from 'web-push';
import { getDb } from '@/lib/db';
import { pushSubscriptions } from '@/db/schema/push';
import { eq, and } from 'drizzle-orm';
import { users } from '@/db/schema/users';

// Lazy VAPID configuration - only configure when actually needed at runtime
let vapidConfigured = false;

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  platform?: 'web' | 'android';
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Save or update a push subscription for a user
 * Uses upsert to handle duplicate endpoints
 */
export async function saveSubscription(
  userId: string,
  subscription: PushSubscriptionData
): Promise<void> {
  const db = getDb();
  
  await db.insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: subscription.userAgent,
      platform: subscription.platform ?? 'web',
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
      set: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        userAgent: subscription.userAgent,
        platform: subscription.platform ?? 'web',
        updatedAt: new Date(),
      },
    });
}

/**
 * Get all push subscriptions for a user
 */
export async function getSubscriptions(userId: string): Promise<Array<{
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  platform: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}>> {
  const db = getDb();
  
  return await db.select({
    id: pushSubscriptions.id,
    endpoint: pushSubscriptions.endpoint,
    p256dh: pushSubscriptions.p256dh,
    auth: pushSubscriptions.auth,
    userAgent: pushSubscriptions.userAgent,
    platform: pushSubscriptions.platform,
    createdAt: pushSubscriptions.createdAt,
    updatedAt: pushSubscriptions.updatedAt,
  })
  .from(pushSubscriptions)
  .where(eq(pushSubscriptions.userId, userId));
}

/**
 * Delete a specific push subscription by endpoint
 */
export async function deleteSubscription(userId: string, endpoint: string): Promise<void> {
  const db = getDb();
  
  await db.delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, userId),
      eq(pushSubscriptions.endpoint, endpoint)
    ));
}

/**
 * Delete all push subscriptions for a user
 */
export async function deleteAllSubscriptions(userId: string): Promise<void> {
  const db = getDb();
  
  await db.delete(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

/**
 * Send a push notification to a single subscription
 * Handles 410 Gone (expired subscription) by deleting it
 * Returns error if VAPID not configured (doesn't throw)
 */
export async function sendNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  // Check VAPID config without throwing
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    return { success: false, error: 'VAPID not configured' };
  }
  
  try {
    webpush.setVapidDetails('mailto:admin@ai-tutor.com', publicKey, privateKey);
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error && error.statusCode === 410) {
      return { success: false, error: 'expired' };
    }
    console.error('Push notification error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a push notification to all subscriptions for a user
 * Returns count of successful/failed deliveries
 */
export async function sendToUser(
  userId: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number; expired: number }> {
  const subscriptions = await getSubscriptions(userId);
  
  let sent = 0;
  let failed = 0;
  let expired = 0;
  
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const result = await sendNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
      
      if (result.success) {
        sent++;
      } else if (result.error === 'expired') {
        expired++;
        // Clean up expired subscription
        await deleteSubscription(userId, sub.endpoint);
      } else {
        failed++;
      }
    })
  );
  
  // Count any rejected promises
  results.forEach((result) => {
    if (result.status === 'rejected') {
      failed++;
    }
  });
  
  return { sent, failed, expired };
}

/**
 * Broadcast a notification to all users with a specific role
 * Optionally filter by school ID
 */
export async function broadcastToRole(
  role: 'teacher' | 'student' | 'parent' | 'admin',
  payload: NotificationPayload,
  schoolId?: string
): Promise<{ sent: number; failed: number; expired: number; users: number }> {
  const db = getDb();
  
  // Get all users with the specified role
  const conditions = [eq(users.role, role)];
  if (schoolId) {
    conditions.push(eq(users.schoolId, schoolId));
  }
  
  const targetUsers = await db.select({ id: users.id })
    .from(users)
    .where(and(...conditions));
  
  let totalSent = 0;
  let totalFailed = 0;
  let totalExpired = 0;
  
  // Process in batches to avoid overwhelming the push service
  const batchSize = 50;
  for (let i = 0; i < targetUsers.length; i += batchSize) {
    const batch = targetUsers.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (user) => {
        const result = await sendToUser(user.id, payload);
        totalSent += result.sent;
        totalFailed += result.failed;
        totalExpired += result.expired;
      })
    );
    
    batchResults.forEach((result) => {
      if (result.status === 'rejected') {
        // Each user in the batch could fail
        totalFailed += batch.length;
      }
    });
  }
  
  return {
    sent: totalSent,
    failed: totalFailed,
    expired: totalExpired,
    users: targetUsers.length,
  };
}

/**
 * Get the VAPID public key for client-side subscription
 * Returns undefined during build if not configured (for static analysis)
 */
export function getVapidPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}