/**
 * Teacher Class Detail API - Get a single class with its students
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { db } from '@/lib/db';
import { classes, classStudents, teachers, students, users } from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: classId } = await params;

    // Get teacher record
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, appUser.user.id))
      .limit(1);

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    // Get class with student count (active enrollments only)
    const [classData] = await db
      .select({
        id: classes.id,
        name: classes.name,
        subject: classes.subject,
        gradeLevel: classes.gradeLevel,
        status: classes.status,
        joinCode: classes.joinCode,
        description: classes.description,
        maxStudents: classes.maxStudents,
        term: classes.term,
        year: classes.year,
        createdAt: classes.createdAt,
        studentCount: count(classStudents.id),
      })
      .from(classes)
      .leftJoin(
        classStudents,
        and(
          eq(classStudents.classId, classes.id),
          eq(classStudents.isActive, true)
        )
      )
      .where(and(eq(classes.id, classId), eq(classes.teacherId, teacher.id)))
      .groupBy(
        classes.id,
        classes.name,
        classes.subject,
        classes.gradeLevel,
        classes.status,
        classes.joinCode,
        classes.description,
        classes.maxStudents,
        classes.term,
        classes.year,
        classes.createdAt
      )
      .limit(1);

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      );
    }

    // Get students for this class (all enrollments, active first then by name)
    const studentsData = await db
      .select({
        id: students.id,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
        email: users.email,
        gradeLevel: students.gradeLevel,
        enrolledAt: classStudents.enrolledAt,
        isActive: classStudents.isActive,
      })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(eq(classStudents.classId, classId))
      .orderBy(desc(classStudents.isActive), users.firstName, users.lastName);

    // Format students response
    const formattedStudents = studentsData.map((s) => {
      const fullName = `${s.firstName} ${s.lastName}`.trim();
      const name = fullName || s.displayName || s.email;
      return {
        id: s.id,
        name,
        email: s.email,
        gradeLevel: s.gradeLevel,
        enrolledAt: s.enrolledAt.toISOString(),
        isActive: s.isActive,
      };
    });

    return NextResponse.json({
      class: {
        ...classData,
        studentCount: Number(classData.studentCount) || 0,
      },
      students: formattedStudents,
    });
  } catch (error) {
    console.error('[Classes/[id] GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}