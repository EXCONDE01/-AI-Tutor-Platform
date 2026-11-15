/**
 * Teacher dashboard data endpoint.
 * Returns stats, recent sessions, and classes for the authenticated teacher.
 *
 * The data is fetched with a small, fixed number of batched queries instead of
 * per-session lookups so the endpoint stays fast as classes grow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  classStudents,
  messages as messagesTable,
  students,
  teachers,
  tutorSessions,
  users,
} from '@/db/schema';

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

    const database = getDb();

    // Teacher + classes in one round trip
    const teacherClasses = await database
      .select({
        id: classes.id,
        name: classes.name,
        subject: classes.subject,
        teacherId: classes.teacherId,
      })
      .from(classes)
      .innerJoin(teachers, eq(teachers.id, classes.teacherId))
      .where(and(eq(teachers.userId, appUser.user.id), eq(classes.status, 'active')))
      .orderBy(classes.name);

    // If teacher has no classes, return empty data
    if (teacherClasses.length === 0) {
      const [teacherRow] = await database
        .select({ id: teachers.id })
        .from(teachers)
        .where(eq(teachers.userId, appUser.user.id))
        .limit(1);

      if (!teacherRow) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }

      return NextResponse.json({
        stats: {
          activeClasses: 0,
          activeSessions: 0,
          interventionsToday: 0,
          artifactsGenerated: 0,
        },
        recentSessions: [],
        classes: [],
      });
    }

    const teacherId = teacherClasses[0].teacherId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Everything below is independent: run it concurrently.
    const [
      [activeSessionsCount],
      [interventionsTodayCount],
      [artifactsGeneratedCount],
      recentSessionsData,
      classStats,
    ] = await Promise.all([
      // Active sessions across the teacher's classes
      database
        .select({ value: count() })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .where(and(eq(classes.teacherId, teacherId), eq(tutorSessions.status, 'active'))),

      // Interventions today (system messages from this teacher today)
      database
        .select({ value: count() })
        .from(messagesTable)
        .innerJoin(tutorSessions, eq(tutorSessions.id, messagesTable.sessionId))
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .where(
          and(
            eq(classes.teacherId, teacherId),
            eq(messagesTable.role, 'system'),
            sql`(${messagesTable.metadata}->>'isIntervention') = 'true'`,
            sql`${messagesTable.createdAt} >= ${todayStart.toISOString()}`
          )
        ),

      // Artifacts generated
      database
        .select({ value: count() })
        .from(messagesTable)
        .innerJoin(tutorSessions, eq(tutorSessions.id, messagesTable.sessionId))
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .where(
          and(
            eq(classes.teacherId, teacherId),
            sql`(${messagesTable.metadata}->>'type') = 'artifact'`
          )
        ),

      // Recent sessions (last 10) with student, class, and last message
      database
        .select({
          id: tutorSessions.id,
          status: tutorSessions.status,
          messageCount: tutorSessions.messageCount,
          startedAt: tutorSessions.startedAt,
          studentFirstName: users.firstName,
          studentLastName: users.lastName,
          className: classes.name,
          lastMessageContent: sql<string | null>`(
            select m.content from ${messagesTable} m
            where m.session_id = ${tutorSessions.id}
            order by m.sequence desc limit 1
          )`,
          lastMessageAt: sql<Date | null>`(
            select m.created_at from ${messagesTable} m
            where m.session_id = ${tutorSessions.id}
            order by m.sequence desc limit 1
          )`,
        })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .innerJoin(students, eq(students.id, tutorSessions.studentId))
        .innerJoin(users, eq(users.id, students.userId))
        .where(eq(classes.teacherId, teacherId))
        .orderBy(desc(tutorSessions.startedAt))
        .limit(10),

      // Student + active-session counts for every class in one grouped query
      database
        .select({
          classId: classes.id,
          studentCount: sql<number>`count(distinct ${classStudents.id})`,
          activeSessions: sql<number>`count(distinct case when ${tutorSessions.status} = 'active' then ${tutorSessions.id} end)`,
        })
        .from(classes)
        .leftJoin(
          classStudents,
          and(eq(classStudents.classId, classes.id), eq(classStudents.isActive, true))
        )
        .leftJoin(tutorSessions, eq(tutorSessions.classId, classes.id))
        .where(and(eq(classes.teacherId, teacherId), eq(classes.status, 'active')))
        .groupBy(classes.id),
    ]);

    const recentSessions = recentSessionsData.map((session) => {
      const startedAt = session.startedAt;
      const lastMessageAt = session.lastMessageAt ?? null;

      return {
        id: session.id,
        student:
          `${session.studentFirstName ?? ''} ${session.studentLastName ?? ''}`.trim() ||
          'Unknown Student',
        class: session.className || 'Unknown Class',
        status: session.status,
        duration:
          lastMessageAt && startedAt
            ? `${Math.floor(
                (new Date(lastMessageAt).getTime() - new Date(startedAt).getTime()) / 60000
              )} min`
            : '0 min',
        lastMessage: session.lastMessageContent || 'No messages yet',
      };
    });

    // Merge the grouped counts back onto the ordered class list
    const classStatsById = new Map(classStats.map((row) => [row.classId, row]));

    const classesData = teacherClasses.map((cls) => {
      const stats = classStatsById.get(cls.id);
      return {
        id: cls.id,
        name: cls.name,
        students: Number(stats?.studentCount ?? 0),
        activeSessions: Number(stats?.activeSessions ?? 0),
        progress: 0, // TODO: calculate from artifacts/completion
      };
    });

    return NextResponse.json({
      stats: {
        activeClasses: teacherClasses.length,
        activeSessions: Number(activeSessionsCount?.value ?? 0),
        interventionsToday: Number(interventionsTodayCount?.value ?? 0),
        artifactsGenerated: Number(artifactsGeneratedCount?.value ?? 0),
      },
      recentSessions,
      classes: classesData,
    });
  } catch (error) {
    console.error('[teacher/dashboard] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
