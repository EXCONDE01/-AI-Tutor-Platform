/**
 * API route to provide sealed Neon Realtime live queries for teacher session monitoring
 * The client fetches a sealed query and subscribes via @neon/realtime/react
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import { classes, teachers, tutorSessions, users } from '@/db/schema';
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
      console.log('[realtime/teacher-sessions] Unauthenticated request');
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      console.log('[realtime/teacher-sessions] Not a teacher:', appUser?.role);
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId'); // This is the user ID from auth
    const sessionId = searchParams.get('sessionId');
    const type = searchParams.get('type') || 'sessions';

    // Debug: Check if NEON_REALTIME_SECRET is available
    const hasRealtimeSecret = !!process.env.NEON_REALTIME_SECRET;
    const hasNextAuthSecret = !!process.env.NEXT_AUTH_SECRET;
    console.log('[realtime/teacher-sessions] Debug:', {
      hasRealtimeSecret,
      hasNextAuthSecret,
      realtimeSecretPrefix: process.env.NEON_REALTIME_SECRET?.substring(0, 10),
      nextAuthSecretPrefix: process.env.NEXT_AUTH_SECRET?.substring(0, 10),
      realtimeEndpoint: process.env.NEON_REALTIME_ENDPOINT,
      realtimeUrl: process.env.NEON_REALTIME_URL,
      teacherId,
      type,
      userId: appUser.user.id,
      userRole: appUser.role
    });

    // Look up the teacher profile ID from the user ID
    const database = getDb();
    console.log('[realtime/teacher-sessions] Looking up teacher profile for userId:', appUser.user.id);
    const [teacherRow] = await database
      .select({ id: teachers.id, userId: teachers.userId })
      .from(teachers)
      .where(eq(teachers.userId, appUser.user.id))
      .limit(1);

    console.log('[realtime/teacher-sessions] Teacher row:', teacherRow);

    if (!teacherRow) {
      // Check if the user exists
      const [userRow] = await database
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, appUser.user.id))
        .limit(1);
      console.log('[realtime/teacher-sessions] User row:', userRow);
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const teacherProfileId = teacherRow.id;

    if (type === 'messages' && sessionId) {
      // Shadow tables bypass RLS, so verify the session belongs to this teacher
      // before exposing its messages.
      const [ownedSession] = await database
        .select({ id: tutorSessions.id })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .where(
          and(
            eq(tutorSessions.id, sessionId),
            eq(classes.teacherId, teacherProfileId)
          )
        )
        .limit(1);

      if (!ownedSession) {
        console.log(
          '[realtime/teacher-sessions] Session not owned by teacher:',
          sessionId
        );
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 403 }
        );
      }

      console.log('[realtime/teacher-sessions] Creating session messages sealed query for:', sessionId);
      const sealed = await createSessionMessagesSealedQuery(sessionId);
      console.log('[realtime/teacher-sessions] Session messages sealed query created:', !!sealed);
      return NextResponse.json({ sealedQuery: sealed });
    }

    if (type === 'sessions') {
      console.log('[realtime/teacher-sessions] Creating teacher sessions sealed query for teacherProfileId:', teacherProfileId);
      try {
        const sealed = await createTeacherSessionsSealedQuery(teacherProfileId);
        console.log('[realtime/teacher-sessions] Teacher sessions sealed query created:', !!sealed);
        return NextResponse.json({ sealedQuery: sealed });
      } catch (sealError) {
        console.error('[realtime/teacher-sessions] Seal error:', sealError);
        return NextResponse.json({ 
          error: 'Failed to create sealed query', 
          details: sealError instanceof Error ? sealError.message : String(sealError) 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  } catch (error) {
    console.error('[api/realtime/teacher-sessions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}