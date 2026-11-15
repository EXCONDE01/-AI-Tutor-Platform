/**
 * Google OAuth - Check connection status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { googleTokenStore } from '@/lib/google/token-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ connected: false }, { status: 403 });
    }

    const connected = await googleTokenStore.hasConnectedGoogle(appUser.user.id);

    return NextResponse.json({ connected });
  } catch (error) {
    console.error('[Google OAuth status] Error:', error);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}