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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { joinCode } = body;

    if (!joinCode) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
    }

    // Find the class by join code
    const [targetClass] = await database
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.joinCode, joinCode))
      .limit(1);

    if (!targetClass) {
      return NextResponse.json({ error: 'Invalid join code' }, { status: 404 });
    }

    // Get the student record
    const [student] = await database
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, appUser.user.id))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Check if already enrolled
    const [existingEnrollment] = await database
      .select({ id: classStudents.id, isActive: classStudents.isActive })
      .from(classStudents)
      .where(and(eq(classStudents.classId, targetClass.id), eq(classStudents.studentId, student.id)))
      .limit(1);

    if (existingEnrollment && existingEnrollment.isActive) {
      return NextResponse.json({ error: 'Already enrolled in this class' }, { status: 400 });
    }

    if (existingEnrollment && !existingEnrollment.isActive) {
      // Re-enroll
      await database
        .update(classStudents)
        .set({ isActive: true, droppedAt: null })
        .where(eq(classStudents.id, existingEnrollment.id));

      return NextResponse.json({ message: 'Re-joined class successfully', classId: targetClass.id });
    }

    // Create new enrollment
    await database.insert(classStudents).values({
      classId: targetClass.id,
      studentId: student.id,
      isActive: true,
    });

    return NextResponse.json({ message: 'Joined class successfully', classId: targetClass.id });
  } catch (error) {
    console.error('[student/classes POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('id');

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Get the student record
    const [student] = await database
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, appUser.user.id))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Verify enrollment exists and is active
    const [enrollment] = await database
      .select({ id: classStudents.id })
      .from(classStudents)
      .where(and(
        eq(classStudents.classId, classId),
        eq(classStudents.studentId, student.id),
        eq(classStudents.isActive, true)
      ))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this class' }, { status: 404 });
    }

    // Mark as dropped (soft delete)
    await database
      .update(classStudents)
      .set({ isActive: false, droppedAt: new Date() })
      .where(eq(classStudents.id, enrollment.id));

    return NextResponse.json({ success: true, message: 'Left class successfully' });
  } catch (error) {
    console.error('[student/classes DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}