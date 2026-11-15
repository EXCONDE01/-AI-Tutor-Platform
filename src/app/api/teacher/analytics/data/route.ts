/**
 * Analytics API - Session duration, topics, struggle areas, token usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { db } from '@/lib/db';
import { tutorSessions, messages, students, users, classes, sessionSummaries, interventions, teachers, classStudents } from '@/db/schema';
import { eq, and, gte, lte, sql, desc, count, sum, avg, inArray } from 'drizzle-orm';

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

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get teacher's class IDs
    const teacherClasses = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.teacherId, appUser.user.id));
    
    const teacherClassIds = teacherClasses.map(c => c.id);
    if (teacherClassIds.length === 0) {
      return NextResponse.json({
        overview: { total: 0, active: 0, completed: 0, avgDuration: null, totalDuration: null },
        sessionsByDay: [],
        studentEngagement: [],
        topics: [],
        struggles: [],
        interventions: [],
        tokens: { totalTokens: null, avgTokensPerMessage: null, messageCount: 0 },
        weeklyProgress: [],
      });
    }

    // Build base conditions - filter by teacher's classes
    const baseConditions = [inArray(tutorSessions.classId, teacherClassIds)];
    if (classId) baseConditions.push(eq(tutorSessions.classId, classId));

    // 1. Session Overview Stats
    const sessionStats = await db
      .select({
        total: count(),
        active: count(sql`case when ${tutorSessions.status} = 'active' then 1 end`),
        completed: count(sql`case when ${tutorSessions.status} = 'completed' then 1 end`),
        avgDuration: avg(sql`EXTRACT(EPOCH FROM (${tutorSessions.endedAt} - ${tutorSessions.createdAt}))`),
        totalDuration: sum(sql`EXTRACT(EPOCH FROM (${tutorSessions.endedAt} - ${tutorSessions.createdAt}))`),
      })
      .from(tutorSessions)
      .where(and(...baseConditions, gte(tutorSessions.createdAt, startDate)));

    // 2. Sessions by Day (for chart)
    const sessionsByDay = await db
      .select({
        date: sql<string>`DATE(${tutorSessions.createdAt})`,
        count: count(),
        avgDuration: avg(sql`EXTRACT(EPOCH FROM (${tutorSessions.endedAt} - ${tutorSessions.createdAt}))`),
      })
      .from(tutorSessions)
      .where(and(...baseConditions, gte(tutorSessions.createdAt, startDate)))
      .groupBy(sql`DATE(${tutorSessions.createdAt})`)
      .orderBy(sql`DATE(${tutorSessions.createdAt})`);

    // 3. Student Engagement - join with users table for names/emails
    // Students are enrolled via class_students join table
    const studentEngagement = await db
      .select({
        studentId: students.id,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        studentEmail: users.email,
        sessionCount: count(tutorSessions.id),
        totalDuration: sum(sql`EXTRACT(EPOCH FROM (${tutorSessions.endedAt} - ${tutorSessions.createdAt}))`),
        avgDuration: avg(sql`EXTRACT(EPOCH FROM (${tutorSessions.endedAt} - ${tutorSessions.createdAt}))`),
        lastSession: sql<string>`MAX(${tutorSessions.createdAt})`,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(classStudents, eq(classStudents.studentId, students.id))
      .leftJoin(tutorSessions, and(
        eq(tutorSessions.studentId, students.id),
        ...baseConditions,
        gte(tutorSessions.createdAt, startDate)
      ))
      .where(inArray(classStudents.classId, teacherClassIds))
      .groupBy(students.id, users.firstName, users.lastName, users.email)
      .orderBy(desc(count(tutorSessions.id)))
      .limit(20);

    // 4. Topics Covered (from session summaries)
    const topicStats = await db
      .select({
        topic: sql<string>`unnest(${sessionSummaries.keyTopics})`,
        count: count(),
      })
      .from(sessionSummaries)
      .innerJoin(tutorSessions, eq(sessionSummaries.sessionId, tutorSessions.id))
      .where(and(...baseConditions, gte(sessionSummaries.createdAt, startDate)))
      .groupBy(sql`unnest(${sessionSummaries.keyTopics})`)
      .orderBy(desc(count()))
      .limit(20);

    // 5. Struggle Areas (from session summaries)
    const struggleStats = await db
      .select({
        struggle: sql<string>`unnest(${sessionSummaries.areasForImprovement})`,
        count: count(),
      })
      .from(sessionSummaries)
      .innerJoin(tutorSessions, eq(sessionSummaries.sessionId, tutorSessions.id))
      .where(and(...baseConditions, gte(sessionSummaries.createdAt, startDate)))
      .groupBy(sql`unnest(${sessionSummaries.areasForImprovement})`)
      .orderBy(desc(count()))
      .limit(20);

    // 6. Intervention Stats
    const interventionStats = await db
      .select({
        type: interventions.type,
        severity: interventions.severity,
        status: interventions.status,
        count: count(),
      })
      .from(interventions)
      .innerJoin(tutorSessions, eq(interventions.sessionId, tutorSessions.id))
      .where(and(...baseConditions, gte(interventions.createdAt, startDate)))
      .groupBy(interventions.type, interventions.severity, interventions.status)
      .orderBy(desc(count()));

    // 7. Token Usage (from messages)
    const tokenStats = await db
      .select({
        totalTokens: sum(sql`(${messages.metadata}->>'tokens')::int`),
        avgTokensPerMessage: avg(sql`(${messages.metadata}->>'tokens')::int`),
        messageCount: count(),
      })
      .from(messages)
      .innerJoin(tutorSessions, eq(messages.sessionId, tutorSessions.id))
      .where(and(...baseConditions, gte(messages.createdAt, startDate), eq(messages.role, 'assistant')));

    // 8. Progress Over Time (weekly aggregates)
    const weeklyProgress = await db
      .select({
        week: sql<string>`DATE_TRUNC('week', ${tutorSessions.createdAt})`,
        sessions: count(),
        avgDuration: avg(sql`EXTRACT(EPOCH FROM (${tutorSessions.endedAt} - ${tutorSessions.createdAt}))`),
        completedSessions: count(sql`case when ${tutorSessions.status} = 'completed' then 1 end`),
      })
      .from(tutorSessions)
      .where(and(...baseConditions, gte(tutorSessions.createdAt, startDate)))
      .groupBy(sql`DATE_TRUNC('week', ${tutorSessions.createdAt})`)
      .orderBy(sql`DATE_TRUNC('week', ${tutorSessions.createdAt})`);

    return NextResponse.json({
      overview: sessionStats[0],
      sessionsByDay,
      studentEngagement,
      topics: topicStats,
      struggles: struggleStats,
      interventions: interventionStats,
      tokens: tokenStats[0],
      weeklyProgress,
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}