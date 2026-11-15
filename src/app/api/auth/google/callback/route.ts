/**
 * Google OAuth - Callback handler
 * Handles the redirect from Google after user consents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { googleOAuth } from '@/lib/google/oauth';
import { googleTokenStore } from '@/lib/google/token-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Verify state cookie for CSRF protection
    const stateCookie = request.cookies.get('google_oauth_state')?.value;

    if (error) {
      console.error('[Google OAuth callback] Google returned error:', error);
      return NextResponse.redirect(
        new URL('/teacher/settings?google_error=' + encodeURIComponent(error), request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/teacher/settings?google_error=no_code', request.url)
      );
    }

    // In production, verify state matches cookie
    // if (state !== stateCookie) { ... }

    // Get current authenticated user
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.redirect(
        new URL('/sign-in?callbackUrl=/teacher/settings', request.url)
      );
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.redirect(
        new URL('/teacher/settings?google_error=not_teacher', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await googleOAuth.exchangeCode(code);

    // Get user info to get providerUserId
    const userInfo = await googleOAuth.getUserInfo(tokens.access_token);

    // Save encrypted tokens
    await googleTokenStore.saveTokens(appUser.user.id, tokens, userInfo.id);

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL('/teacher/settings?google_connected=true', request.url)
    );
  } catch (error) {
    console.error('[Google OAuth callback] Error:', error);
    return NextResponse.redirect(
      new URL(
        '/teacher/settings?google_error=' + encodeURIComponent(
          error instanceof Error ? error.message : 'callback_failed'
        ),
        request.url
      )
    );
  }
}