/**
 * Creates a new tutoring session for the signed-in student.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import { classes, classStudents, students, tutorConfigs, tutorSessions } from '@/db/schema';

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

    // Find an active enrollment for this student
    const [enrollment] = await database
      .select({
        classId: classStudents.classId,
        tutorConfigId: tutorConfigs.id,
      })
      .from(classStudents)
      .innerJoin(classes, eq(classes.id, classStudents.classId))
      .leftJoin(tutorConfigs, eq(tutorConfigs.classId, classes.id))
      .where(and(
        eq(classStudents.studentId, studentRow.id),
        eq(classStudents.isActive, true)
      ))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in any class with tutoring enabled' },
        { status: 404 }
      );
    }

    if (!enrollment.tutorConfigId) {
      return NextResponse.json(
        { error: 'No tutor configuration found for this class. Please contact your teacher.' },
        { status: 404 }
      );
    }

    const [created] = await database
      .insert(tutorSessions)
      .values({
        classId: enrollment.classId,
        studentId: studentRow.id,
        tutorConfigId: enrollment.tutorConfigId,
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
