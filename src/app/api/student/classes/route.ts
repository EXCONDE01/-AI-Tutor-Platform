/**
 * Student classes list endpoint.
 * Returns all active classes the authenticated student is enrolled in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql, desc, count, max } from 'drizzle-orm';
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
  tutorSessions,
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

    // Get the student record first
    const [student] = await database
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, appUser.user.id))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // First, get enrolled classes with enrollment timestamp
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
        enrolledAt: classStudents.enrolledAt,
      })
      .from(classStudents)
      .innerJoin(classes, eq(classes.id, classStudents.classId))
      .innerJoin(teachers, eq(teachers.id, classes.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .leftJoin(tutorConfigs, and(eq(tutorConfigs.classId, classes.id), eq(tutorConfigs.isActive, true)))
      .where(and(
        eq(classStudents.studentId, student.id),
        eq(classStudents.isActive, true),
        eq(classes.status, 'active')
      ))
      .orderBy(classes.name);

    if (enrolledClasses.length === 0) {
      return NextResponse.json({ classes: [] });
    }

    // Get class IDs for session aggregation
    const classIds = enrolledClasses.map((c) => c.id);

    // Aggregate session stats per class for this student
    // Using a single grouped query to avoid N+1
    const sessionStats = await database
      .select({
        classId: tutorSessions.classId,
        sessionCount: count(tutorSessions.id),
        lastSessionAt: max(tutorSessions.startedAt),
      })
      .from(tutorSessions)
      .where(and(
        eq(tutorSessions.studentId, student.id),
        sql`${tutorSessions.classId} IN (${sql.join(classIds.map(id => sql`${id}`), sql`, `)})`
      ))
      .groupBy(tutorSessions.classId);

    // Build a map for quick lookup
    const statsMap = new Map<string, { sessionCount: number; lastSessionAt: Date | null }>();
    for (const stat of sessionStats) {
      statsMap.set(stat.classId, {
        sessionCount: Number(stat.sessionCount),
        lastSessionAt: stat.lastSessionAt ? new Date(stat.lastSessionAt) : null,
      });
    }

    // Enrich classes with session stats
    const enrichedClasses = enrolledClasses.map((cls) => {
      const stats = statsMap.get(cls.id) || { sessionCount: 0, lastSessionAt: null };
      return {
        id: cls.id,
        name: cls.name,
        description: cls.description,
        subject: cls.subject,
        gradeLevel: cls.gradeLevel,
        term: cls.term,
        year: cls.year,
        status: cls.status,
        room: cls.room,
        teacherName: cls.teacherName,
        teacherEmail: cls.teacherEmail,
        hasTutorConfig: cls.hasTutorConfig,
        enrolledAt: cls.enrolledAt ? new Date(cls.enrolledAt).toISOString() : null,
        sessionCount: stats.sessionCount,
        lastSessionAt: stats.lastSessionAt ? stats.lastSessionAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      classes: enrichedClasses,
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

    if (!joinCode || typeof joinCode !== 'string') {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
    }

    // Normalize: trim whitespace, compare case-insensitive
    const normalizedCode = joinCode.trim().toUpperCase();

    // Find the class by join code (case-insensitive, trimmed)
    const [targetClass] = await database
      .select({
        id: classes.id,
        name: classes.name,
        subject: classes.subject,
      })
      .from(classes)
      .where(sql`UPPER(TRIM(${classes.joinCode})) = ${normalizedCode}`)
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

      return NextResponse.json({
        message: 'Re-joined class successfully',
        classId: targetClass.id,
        className: targetClass.name,
        subject: targetClass.subject,
      });
    }

    // Create new enrollment
    await database.insert(classStudents).values({
      classId: targetClass.id,
      studentId: student.id,
      isActive: true,
    });

    return NextResponse.json({
      message: 'Joined class successfully',
      classId: targetClass.id,
      className: targetClass.name,
      subject: targetClass.subject,
    });
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

    if (!classId || typeof classId !== 'string' || classId.trim() === '') {
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