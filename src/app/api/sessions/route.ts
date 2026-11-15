/**
 * Creates a new tutoring session for the signed-in student.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import { students, tutorSessions } from '@/db/schema';
import { DEMO_CLASS_ID, DEMO_TUTOR_CONFIG_ID } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const appUser = await ensureAppUser('student', request);
    if (!appUser) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (appUser.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can start tutoring sessions' },
        { status: 403 }
      );
    }

    const database = getDb();
    const [studentRow] = await database
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, appUser.user.id))
      .limit(1);

    if (!studentRow) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 409 });
    }

    const [created] = await database
      .insert(tutorSessions)
      .values({
        classId: DEMO_CLASS_ID,
        studentId: studentRow.id,
        tutorConfigId: DEMO_TUTOR_CONFIG_ID,
        status: 'active',
        title: 'New tutoring session',
      })
      .returning({ id: tutorSessions.id });

    if (!created) {
      return NextResponse.json({ error: 'Could not create session' }, { status: 500 });
    }

    return NextResponse.json({ sessionId: created.id });
  } catch (error) {
    console.error('[sessions] Create failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
