/**
 * Teacher intervention endpoint.
 * Adds a system message to a student's tutoring session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  messages as messagesTable,
  teachers,
  tutorSessions,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const bodySchema = {
  message: (val: unknown) => {
    if (typeof val !== 'string' || !val.trim()) return 'Message is required';
    if (val.length > 4000) return 'Message too long (max 4000 chars)';
    return null;
  },
};

export async function POST(
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

    const body = await request.json().catch(() => null);
    console.log('[intervene] Body received:', body);
    console.log('[intervene] Body parsed:', body);
    const msgError = bodySchema.message(body?.message);
    if (msgError) {
      console.log('[intervene] Validation error:', msgError);
      return NextResponse.json({ error: msgError }, { status: 400 });
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

    // Verify ownership and get session
    const [session] = await database
      .select({
        id: tutorSessions.id,
        classId: tutorSessions.classId,
        studentId: tutorSessions.studentId,
        messageCount: tutorSessions.messageCount,
      })
      .from(tutorSessions)
      .innerJoin(classes, eq(classes.id, tutorSessions.classId))
      .where(and(eq(tutorSessions.id, sessionId), eq(classes.teacherId, teacherRow.id)))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get next sequence number
    const [{ value: maxSeq }] = await database
      .select({ value: sql<number>`coalesce(max(${messagesTable.sequence}), -1)` })
      .from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId));

    const nextSequence = Number(maxSeq ?? -1) + 1;

    // Insert teacher intervention as a system message
    const [newMessage] = await database
      .insert(messagesTable)
      .values({
        sessionId,
        role: 'system',
        content: `[Teacher intervention]: ${body.message.trim()}`,
        contentType: 'text',
        sequence: nextSequence,
        metadata: {
          teacherId: teacherRow.id,
          teacherUserId: appUser.user.id,
          isIntervention: true,
        },
      })
      .returning({ id: messagesTable.id, sequence: messagesTable.sequence, createdAt: messagesTable.createdAt });

    // Update session message count
    await database
      .update(tutorSessions)
      .set({
        messageCount: sql`${tutorSessions.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(tutorSessions.id, sessionId));

    return NextResponse.json({
      ok: true,
      message: {
        id: newMessage.id,
        sequence: Number(newMessage.sequence),
        createdAt: newMessage.createdAt,
      },
    });
  } catch (error) {
    console.error('[teacher/sessions/[id]/intervene] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}