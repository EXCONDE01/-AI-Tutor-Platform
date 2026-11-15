/**
 * Google Classroom OAuth2 — Initiate authorization
 * GET /api/google-classroom/auth?platformId=...
 * Admin only. Returns an authorization URL (client-side redirect).
 * 503 if GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { GoogleClassroomClient, storeOAuthState } from '@/lib/google-classroom/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google Classroom OAuth not configured' },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get('platformId') || undefined;

    const redirectUri =
      process.env.NEXT_PUBLIC_APP_URL ??
      new URL(request.url).origin;
    const fullRedirectUri = `${redirectUri}/api/google-classroom/callback`;

    const state = GoogleClassroomClient.generateState();
    storeOAuthState(state, platformId);

    const authorizationUrl = GoogleClassroomClient.getAuthorizationUrl(
      state,
      fullRedirectUri,
    );

    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    console.error('[Google Classroom auth] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google Classroom authorization' },
      { status: 500 },
    );
  }
}
