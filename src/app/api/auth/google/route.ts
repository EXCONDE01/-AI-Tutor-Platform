/**
 * Google OAuth - Initiate connection
 * Teacher clicks "Connect Google" → redirected to Google consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { googleOAuth } from '@/lib/google/oauth';

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
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/forms.body',
      'https://www.googleapis.com/auth/presentations',
      'https://www.googleapis.com/auth/classroom.coursework.students',
    ];

    const authUrl = googleOAuth.getAuthorizationUrl(state, scopes);

    // Store state in session/cookie for verification in callback
    // For now, pass userId as state so we know which user to save tokens for
    const response = NextResponse.redirect(authUrl);

    // Set state cookie (httpOnly, secure) for CSRF protection
    response.cookies.set('google_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Google OAuth connect] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}