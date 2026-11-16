/**
 * Microsoft OAuth - Initiate connection
 * Teacher clicks "Connect Microsoft" → redirected to Microsoft consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { microsoftOAuth } from '@/lib/microsoft/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const state = crypto.randomUUID();
    const scopes = [
      'https://graph.microsoft.com/Files.ReadWrite.All',
      'https://graph.microsoft.com/User.Read',
      'offline_access',
    ];

    const authUrl = microsoftOAuth.getAuthorizationUrl(state, scopes);

    const response = NextResponse.redirect(authUrl);

    // Set state cookie (httpOnly, secure) for CSRF protection
    response.cookies.set('microsoft_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Microsoft OAuth connect] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}