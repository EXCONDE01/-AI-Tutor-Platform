import { NextRequest, NextResponse } from "next/server";
import {
  saveSubscription,
  getSubscriptions,
  deleteSubscription,
  sendToUser,
  broadcastToRole,
  getVapidPublicKey,
} from "@/lib/push/server";
import { getSession } from "@/lib/auth/server";
import { getAppUser } from "@/lib/auth/provision";
import { createAuditLog } from "@/lib/compliance/audit";

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Get app-level user ID for foreign key constraints
    const appUser = await getAppUser(request);
    if (!appUser) {
      return NextResponse.json({ error: "App user not found" }, { status: 404 });
    }
    const userId = appUser.user.id;
    const body = await request.json();
    const { action, subscription } = body;

    switch (action) {
      case "subscribe": {
        if (!subscription) {
          return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
        }

        // Validate subscription structure
        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
          return NextResponse.json({ error: "Invalid subscription format" }, { status: 400 });
        }

        // Accept platform field (defaults to 'web')
        const platform = subscription.platform === 'android' ? 'android' : 'web';

        // Save subscription to database
        await saveSubscription(userId, {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: request.headers.get("user-agent") || undefined,
          platform,
        });

        // Audit log the subscription
        try {
          await createAuditLog({
            action: 'consent_granted',
            resourceType: 'push_subscription',
            resourceId: subscription.endpoint,
            userId,
            severity: 'info',
            description: 'Push notification subscription created',
            newValues: { endpoint: subscription.endpoint, platform },
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
            userAgent: request.headers.get("user-agent") || undefined,
            metadata: { platform },
          });
        } catch (auditError) {
          console.error('[Push API] Failed to create audit log:', auditError);
        }

        // Send welcome notification (optional, don't fail subscription if VAPID not configured)
        try {
          await sendToUser(userId, {
            title: "AI Tutor Notifications Enabled",
            body: "You'll now receive real-time updates about sessions, grades, and announcements.",
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-72.png",
          });
        } catch (pushError) {
          console.warn("Failed to send welcome notification (VAPID may not be configured):", pushError);
        }

        return NextResponse.json({ success: true });
      }

      case "unsubscribe": {
        if (!subscription?.endpoint) {
          return NextResponse.json({ error: "Missing subscription endpoint" }, { status: 400 });
        }

        await deleteSubscription(userId, subscription.endpoint);

        // Audit log the unsubscription
        try {
          await createAuditLog({
            action: 'consent_withdrawn',
            resourceType: 'push_subscription',
            resourceId: subscription.endpoint,
            userId,
            severity: 'info',
            description: 'Push notification subscription deleted',
            oldValues: { endpoint: subscription.endpoint },
            metadata: {},
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
            userAgent: request.headers.get("user-agent") || undefined,
          });
        } catch (auditError) {
          console.error('[Push API] Failed to create audit log:', auditError);
        }

        return NextResponse.json({ success: true });
      }

      case "send": {
        const { targetUserId, payload } = body;

        if (!targetUserId || !payload) {
          return NextResponse.json({ error: "Missing targetUserId or payload" }, { status: 400 });
        }

        const result = await sendToUser(targetUserId, payload);

        if (result.sent === 0 && result.expired === 0) {
          return NextResponse.json({ error: "User not subscribed or all subscriptions expired" }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          sent: result.sent,
          failed: result.failed,
          expired: result.expired,
        });
      }

      case "broadcast": {
        const { payload, role, schoolId } = body;

        if (!payload) {
          return NextResponse.json({ error: "Missing payload" }, { status: 400 });
        }

        if (!role || !["teacher", "student", "parent", "admin"].includes(role)) {
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        const result = await broadcastToRole(role, payload, schoolId);

        return NextResponse.json({
          success: true,
          sent: result.sent,
          failed: result.failed,
          expired: result.expired,
          users: result.users,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Push API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const userId = authSession.data.user.id;
    const subscriptions = await getSubscriptions(userId);
    const publicKey = getVapidPublicKey();

    return NextResponse.json({
      subscribed: subscriptions.length > 0,
      subscriptionCount: subscriptions.length,
      publicKey: publicKey || null,
      subscriptions: subscriptions.map(s => ({
        endpoint: s.endpoint,
        platform: s.platform,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("Push API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}