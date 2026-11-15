/**
 * Student sessions endpoint.
 * Returns all sessions for the authenticated student.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  messages as messagesTable,
  students,
  tutorSessions,
  users,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('student', request);
    if (!appUser || appUser.role !== 'student') {
      return NextResponse.json({ error: 'Student access required' }, { status: 403 });
    }

    const database = getDb();

    // Get student profile
    const [studentRow] = await database
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, appUser.user.id))
      .limit(1);

    if (!studentRow) {
      return NextResponse.json({ sessions: [] });
    }

    // Fetch all sessions for this student with class info and message counts
    const sessions = await database
      .select({
        id: tutorSessions.id,
        title: tutorSessions.title,
        className: classes.name,
        classSubject: classes.subject,
        status: tutorSessions.status,
        startedAt: tutorSessions.startedAt,
        endedAt: tutorSessions.endedAt,
        messageCount: tutorSessions.messageCount,
        totalDurationSeconds: tutorSessions.totalDurationSeconds,
        summary: tutorSessions.summary,
      })
      .from(tutorSessions)
      .innerJoin(classes, eq(classes.id, tutorSessions.classId))
      .where(eq(tutorSessions.studentId, studentRow.id))
      .orderBy(desc(tutorSessions.startedAt));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[student/sessions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}