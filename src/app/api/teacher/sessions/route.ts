/**
 * Teacher sessions list endpoint.
 * Returns all tutor sessions for classes taught by the authenticated teacher.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { sessionStatusEnum } from '@/db/schema/sessions';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  messages as messagesTable,
  students,
  teachers,
  tutorSessions,
  users,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    // Build where conditions (scoped to the teacher via a join, no extra lookup)
    const conditions = [
      eq(teachers.userId, appUser.user.id),
    ];

    if (status) {
      conditions.push(eq(tutorSessions.status, status as 'active' | 'paused' | 'completed' | 'abandoned' | 'error'));
    }
    if (classId && UUID_RE.test(classId)) {
      conditions.push(eq(tutorSessions.classId, classId));
    }
    if (studentId && UUID_RE.test(studentId)) {
      conditions.push(eq(tutorSessions.studentId, studentId));
    }

    // Sessions page + total count run together
    const [sessions, [{ count: total }]] = await Promise.all([
      database
        .select({
          id: tutorSessions.id,
          classId: tutorSessions.classId,
          className: classes.name,
          classSubject: classes.subject,
          studentId: tutorSessions.studentId,
          studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          studentEmail: users.email,
          status: tutorSessions.status,
          title: tutorSessions.title,
          messageCount: tutorSessions.messageCount,
          startedAt: tutorSessions.startedAt,
          endedAt: tutorSessions.endedAt,
          lastMessageAt: sql<Date>`(
            select max(m.created_at) from ${messagesTable} m
            where m.session_id = ${tutorSessions.id}
          )`,
          lastMessageContent: sql<string>`(
            select m.content from ${messagesTable} m
            where m.session_id = ${tutorSessions.id}
            order by m.sequence desc limit 1
          )`,
          lastMessageRole: sql<string>`(
            select m.role from ${messagesTable} m
            where m.session_id = ${tutorSessions.id}
            order by m.sequence desc limit 1
          )`,
        })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .innerJoin(teachers, eq(teachers.id, classes.teacherId))
        .innerJoin(students, eq(students.id, tutorSessions.studentId))
        .innerJoin(users, eq(users.id, students.userId))
        .where(and(...conditions))
        .orderBy(desc(tutorSessions.startedAt))
        .limit(limit)
        .offset(offset),

      database
        .select({ count: sql<number>`count(*)` })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .innerJoin(teachers, eq(teachers.id, classes.teacherId))
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        ...s,
        messageCount: Number(s.messageCount),
        lastMessageContent: s.lastMessageContent ?? '',
        lastMessageRole: s.lastMessageRole ?? '',
        lastMessageAt: s.lastMessageAt ?? null,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[teacher/sessions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}