/**
 * Teacher Classes API - Create and list classes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { db } from '@/lib/db';
import { classes, classStudents, schools, teachers, users, students } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

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

    const teacherClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        subject: classes.subject,
        gradeLevel: classes.gradeLevel,
        status: classes.status,
        joinCode: classes.joinCode,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .where(eq(classes.teacherId, teacher.id))
      .orderBy(desc(classes.createdAt));

    return NextResponse.json({ classes: teacherClasses });
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
    const { name, subject, gradeLevel, schoolId } = body;

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
        status: 'active',
        term: 'fall',
        year: new Date().getFullYear(),
        joinCode: generateJoinCode(),
      })
      .returning();

    return NextResponse.json({ class: newClass });
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
