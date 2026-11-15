/**
 * Teacher session detail endpoint.
 * Returns full transcript for a specific tutor session (teacher must own the class).
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
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

// Build the JSON aggregation subquery as a raw SQL string to avoid TS template literal issues
const MESSAGES_AGG_SQL = sql`
  coalesce((
    select json_agg(json_build_object(
      'id', m.id,
      'role', m.role,
      'content', m.content,
      'contentType', m.content_type,
      'sequence', m.sequence,
      'metadata', m.metadata,
      'createdAt', m.created_at
    ) order by m.sequence)
    from ${messagesTable} m
    where m.session_id = ${tutorSessions.id}
  ), '[]'::json)
`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { sessionId } = await params;
    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const database = getDb();

    // Single query: session + aggregated transcript (1 round trip instead of 2)
    const sessionQuery = database
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
        totalDurationSeconds: tutorSessions.totalDurationSeconds,
        tokenUsage: tutorSessions.tokenUsage,
        metadata: tutorSessions.metadata,
        summary: tutorSessions.summary,
        messages: MESSAGES_AGG_SQL,
      })
      .from(tutorSessions)
      .innerJoin(classes, eq(classes.id, tutorSessions.classId))
      .innerJoin(teachers, eq(teachers.id, classes.teacherId))
      .innerJoin(students, eq(students.id, tutorSessions.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(and(eq(tutorSessions.id, sessionId), eq(teachers.userId, appUser.user.id)))
      .limit(1);

    const [session] = await sessionQuery;

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const messages = (session.messages as Array<{
      id: string;
      role: string;
      content: string;
      contentType: string;
      sequence: number;
      metadata: Record<string, unknown>;
      createdAt: Date;
    }>).map((m) => ({
      ...m,
      sequence: Number(m.sequence),
    }));

    return NextResponse.json({
      session: {
        ...session,
        messageCount: Number(session.messageCount),
        totalDurationSeconds: Number(session.totalDurationSeconds),
        messages: undefined,
      },
      messages,
    });
  } catch (error) {
    console.error('[teacher/sessions/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}