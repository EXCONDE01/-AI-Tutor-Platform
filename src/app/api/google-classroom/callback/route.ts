/**
 * Google Classroom OAuth2 — Callback handler
 * GET /api/google-classroom/callback?code=...&state=...
 * Public endpoint (Google redirects here). Exchanges code for tokens,
 * stores tokens keyed by user (from id_token) + platformId, audits connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { createAuditLog } from '@/lib/compliance/audit';
import {
  GoogleClassroomClient,
  GoogleClassroomError,
  consumeOAuthState,
  storeTokens,
} from '@/lib/google-classroom/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 },
      );
    }

    // Validate and consume state
    const stateData = consumeOAuthState(state);
    if (!stateData) {
      return NextResponse.json(
        { error: 'Invalid or expired state parameter' },
        { status: 400 },
      );
    }
    const { platformId } = stateData;

    // Verify user session (Neon Auth)
    const session = await getSession(request);
    if (!session.data?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: no active session' },
        { status: 401 },
      );
    }

    const authUser = session.data.user;
    const email = authUser.email;
    if (!email) {
      return NextResponse.json(
        { error: 'Auth user has no email' },
        { status: 400 },
      );
    }

    // Ensure app user exists (provision if needed)
    const appUser = await ensureAppUser('admin', request);
    if (!appUser) {
      return NextResponse.json(
        { error: 'Could not provision app user' },
        { status: 500 },
      );
    }
    const userId = appUser.user.id;

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/api/google-classroom/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google Classroom OAuth not configured' },
        { status: 503 },
      );
    }

    const client = new GoogleClassroomClient(
      { accessToken: '', expiryDate: 0 },
      clientId,
      clientSecret,
      redirectUri,
    );

    let tokens: { accessToken: string; refreshToken?: string; expiryDate: number };
    try {
      tokens = await client.exchangeCode(code);
    } catch (err) {
      if (err instanceof GoogleClassroomError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    // Store tokens keyed by userId + platformId
    storeTokens(userId, tokens, platformId);

    // Audit the connection
    await createAuditLog({
      action: 'google_classroom_connected',
      resourceType: 'google_classroom',
      resourceId: userId,
      userId,
      severity: 'info',
      description: `Connected Google Classroom account${
        platformId ? ` to LTI platform ${platformId}` : ''
      }`,
      metadata: { platformId, email: authUser.email },
    });

    return NextResponse.json({ connected: true, platformId: platformId ?? null });
  } catch (error) {
    console.error('[Google Classroom callback] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to complete Google Classroom authorization' },
      { status: 500 },
    );
  }
}
