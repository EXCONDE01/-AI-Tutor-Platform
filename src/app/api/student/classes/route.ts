/**
 * Student classes list endpoint.
 * Returns all active classes the authenticated student is enrolled in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  classStudents,
  students,
  teachers,
  users,
  tutorConfigs,
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

    // Enrolled classes scoped to the student via a join (single round trip)
    const enrolledClasses = await database
      .select({
        id: classes.id,
        name: classes.name,
        description: classes.description,
        subject: classes.subject,
        gradeLevel: classes.gradeLevel,
        term: classes.term,
        year: classes.year,
        status: classes.status,
        room: classes.room,
        teacherName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        teacherEmail: users.email,
        hasTutorConfig: sql<boolean>`${tutorConfigs.id} IS NOT NULL`,
      })
      .from(classStudents)
      .innerJoin(classes, eq(classes.id, classStudents.classId))
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .innerJoin(teachers, eq(teachers.id, classes.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .leftJoin(tutorConfigs, and(eq(tutorConfigs.classId, classes.id), eq(tutorConfigs.isActive, true)))
      .where(and(
        eq(students.userId, appUser.user.id),
        eq(classStudents.isActive, true),
        eq(classes.status, 'active')
      ))
      .orderBy(classes.name);

    return NextResponse.json({
      classes: enrolledClasses,
    });
  } catch (error) {
    console.error('[student/classes] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}