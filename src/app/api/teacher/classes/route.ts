/**
 * Teacher Classes API - Create and list classes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { db } from '@/lib/db';
import { classes, classStudents, teachers, users } from '@/db/schema';
import { eq, desc, and, count } from 'drizzle-orm';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

    // Get teacher record
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, appUser.user.id))
      .limit(1);

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    // Get classes with student count (active enrollments only)
    const teacherClasses = await db
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
      .where(eq(classes.teacherId, teacher.id))
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
      .orderBy(desc(classes.createdAt));

    // Coerce studentCount to number (drizzle count returns string/number depending on driver)
    const formattedClasses = teacherClasses.map((cls) => ({
      ...cls,
      studentCount: Number(cls.studentCount) || 0,
    }));

    return NextResponse.json({ classes: formattedClasses });
  } catch (error) {
    console.error('[Classes GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, gradeLevel, schoolId, description, maxStudents, term, year, status } = body;

    if (!name || !subject || gradeLevel === undefined) {
      return NextResponse.json(
        { error: 'name, subject, and gradeLevel are required' },
        { status: 400 }
      );
    }

    // Get teacher record
    const [teacher] = await db
      .select({
        id: teachers.id,
        schoolId: users.schoolId,
      })
      .from(teachers)
      .innerJoin(users, eq(teachers.userId, users.id))
      .where(eq(teachers.userId, appUser.user.id))
      .limit(1);

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    // Use provided schoolId or fall back to teacher's school
    const targetSchoolId = schoolId || teacher.schoolId;

    const [newClass] = await db
      .insert(classes)
      .values({
        schoolId: targetSchoolId,
        teacherId: teacher.id,
        name,
        subject,
        gradeLevel: parseInt(gradeLevel),
        description: description ?? null,
        maxStudents: maxStudents ?? 30,
        status: status ?? 'active',
        term: term ?? 'fall',
        year: year ?? new Date().getFullYear(),
        joinCode: generateJoinCode(),
      })
      .returning();

    // Return class with studentCount: 0 to match the GET response shape
    return NextResponse.json({
      class: {
        ...newClass,
        studentCount: 0,
      },
    });
  } catch (error) {
    console.error('[Classes POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, appUser.user.id))
      .limit(1);

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('id');

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Verify the class belongs to this teacher
    const [existingClass] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacherId, teacher.id)))
      .limit(1);

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 });
    }

    // Delete all student enrollments for this class first
    await db.delete(classStudents).where(eq(classStudents.classId, classId));

    // Delete the class
    await db.delete(classes).where(eq(classes.id, classId));

    return NextResponse.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    console.error('[Classes DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
