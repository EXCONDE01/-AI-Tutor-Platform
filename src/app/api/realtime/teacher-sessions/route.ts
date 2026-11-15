/**
 * API route to provide sealed Neon Realtime live queries for teacher session monitoring
 * The client fetches a sealed query and subscribes via @neon/realtime/react
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import {
  createTeacherSessionsSealedQuery,
  createSessionMessagesSealedQuery,
} from '@/lib/realtime/server';

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

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const sessionId = searchParams.get('sessionId');
    const type = searchParams.get('type') || 'sessions';

    if (type === 'messages' && sessionId) {
      const sealed = await createSessionMessagesSealedQuery(sessionId);
      return NextResponse.json({ sealedQuery: sealed });
    }

    if (type === 'sessions' && teacherId) {
      const sealed = await createTeacherSessionsSealedQuery(teacherId);
      return NextResponse.json({ sealedQuery: sealed });
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  } catch (error) {
    console.error('[api/realtime/teacher-sessions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}