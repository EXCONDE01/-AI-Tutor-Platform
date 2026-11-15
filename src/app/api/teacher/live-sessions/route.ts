/**
 * Teacher live sessions endpoint.
 * Returns active sessions for the authenticated teacher with real-time data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  classStudents,
  messages as messagesTable,
  students,
  teachers,
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

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const database = getDb();

    // Get teacher profile
    const [teacherRow] = await database
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, appUser.user.id))
      .limit(1);

    if (!teacherRow) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const teacherId = teacherRow.id;

    // Get active sessions for this teacher's classes with student and class info
    const sessionsData = await database
      .select({
        id: tutorSessions.id,
        studentId: tutorSessions.studentId,
        studentFirstName: users.firstName,
        studentLastName: users.lastName,
        studentEmail: users.email,
        classId: classes.id,
        className: classes.name,
        classSubject: classes.subject,
        status: tutorSessions.status,
        title: tutorSessions.title,
        messageCount: tutorSessions.messageCount,
        startedAt: tutorSessions.startedAt,
        endedAt: tutorSessions.endedAt,
        pausedAt: tutorSessions.pausedAt,
        totalDurationSeconds: tutorSessions.totalDurationSeconds,
        updatedAt: tutorSessions.updatedAt,
        lastMessageContent: sql<string | null>`(
          select m.content from ${messagesTable} m
          where m.session_id = ${tutorSessions.id}
          order by m.sequence desc limit 1
        )`,
        lastMessageAt: sql<string | null>`(
          select m.created_at from ${messagesTable} m
          where m.session_id = ${tutorSessions.id}
          order by m.sequence desc limit 1
        )`,
      })
      .from(tutorSessions)
      .innerJoin(classes, eq(classes.id, tutorSessions.classId))
      .innerJoin(students, eq(students.id, tutorSessions.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(and(eq(classes.teacherId, teacherId), eq(tutorSessions.status, 'active')))
      .orderBy(desc(tutorSessions.startedAt));

    const sessions = sessionsData.map((session) => ({
      id: session.id,
      studentId: session.studentId,
      studentName:
        `${session.studentFirstName ?? ''} ${session.studentLastName ?? ''}`.trim() ||
        'Unknown Student',
      studentEmail: session.studentEmail,
      classId: session.classId,
      className: session.className || 'Unknown Class',
      classSubject: session.classSubject || 'Unknown Subject',
      status: session.status,
      title: session.title,
      messageCount: Number(session.messageCount),
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      pausedAt: session.pausedAt?.toISOString() ?? null,
      totalDurationSeconds: Number(session.totalDurationSeconds),
      lastMessageContent: session.lastMessageContent,
      lastMessageAt: session.lastMessageAt ?? null,
      updatedAt: session.updatedAt.toISOString(),
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[teacher/live-sessions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}