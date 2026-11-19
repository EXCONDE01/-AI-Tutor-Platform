/**
 * Teacher Analytics Data API
 * Returns comprehensive analytics for a teacher's classes over a date range.
 *
 * Conventions:
 * - All numbers in the response are real JS numbers (never strings/null).
 * - Dates are UTC and serialised as `YYYY-MM-DD` strings.
 * - Time series are dense-filled so charts always get a continuous axis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, avg, count, desc, eq, gte, inArray, lte, sql, sum } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  classStudents,
  interventions,
  messages,
  sessionSummaries,
  students,
  teachers,
  tutorSessions,
  users,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Total seconds a session lasted, preferring the stored duration. */
const DURATION_SQL = sql`
  coalesce(
    nullif(${tutorSessions.totalDurationSeconds}, 0),
    extract(epoch from (${tutorSessions.endedAt} - ${tutorSessions.startedAt})),
    0
  )
`;

function clampDays(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.max(1, Math.min(3650, Math.floor(value)));
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

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
    const rawClassId = searchParams.get('classId');
    const days = clampDays(parseInt(searchParams.get('days') ?? '30', 10));

    const todayStart = startOfDayUTC(new Date());
    const startDate = addDaysUTC(todayStart, -(days - 1));
    const rangeEnd = new Date(addDaysUTC(todayStart, 1).getTime() - 1);

    const database = getDb();

    // classes.teacher_id -> teachers.id, teachers.user_id = appUser.user.id
    const teacherClasses = await database
      .select({ id: classes.id, name: classes.name, subject: classes.subject })
      .from(classes)
      .innerJoin(teachers, eq(teachers.id, classes.teacherId))
      .where(eq(teachers.userId, appUser.user.id))
      .orderBy(classes.name);

    const teacherClassIds = teacherClasses.map((row) => row.id);

    const selectedClassId =
      rawClassId && UUID_RE.test(rawClassId) && teacherClassIds.includes(rawClassId)
        ? rawClassId
        : null;
    const targetClassIds = selectedClassId ? [selectedClassId] : teacherClassIds;

    const range = {
      days,
      start: formatDateUTC(startDate),
      end: formatDateUTC(todayStart),
      classId: selectedClassId,
    };

    const emptyResponse = {
      range,
      classes: teacherClasses.map((row) => ({ id: row.id, name: row.name, subject: row.subject ?? '' })),
      overview: {
        total: 0,
        active: 0,
        paused: 0,
        completed: 0,
        abandoned: 0,
        error: 0,
        students: 0,
        messages: 0,
        interventions: 0,
        avgDuration: 0,
        totalDuration: 0,
        completedRate: 0,
      },
      sessionsByDay: [] as Array<{ date: string; count: number; messages: number; avgDuration: number }>,
      recentSessions: [] as unknown[],
      studentEngagement: [] as unknown[],
      topics: [] as Array<{ topic: string; count: number }>,
      struggles: [] as Array<{ struggle: string; count: number }>,
      interventions: [] as Array<{ type: string; severity: string; status: string; count: number }>,
      tokens: { totalTokens: 0, avgTokensPerMessage: 0, messageCount: 0, hasTokenData: false },
      weeklyProgress: [] as Array<{
        week: string;
        sessions: number;
        avgDuration: number;
        completedSessions: number;
      }>,
    };

    if (targetClassIds.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    const sessionScope = inArray(tutorSessions.classId, targetClassIds);
    const sessionRange = and(
      sessionScope,
      gte(tutorSessions.startedAt, startDate),
      lte(tutorSessions.startedAt, rangeEnd)
    );

    // 1. Overview aggregates -------------------------------------------------
    const [
      overviewRows,
      studentCountRows,
      messageCountRows,
      interventionRows,
      sessionsByDayRows,
      messagesByDayRows,
      recentSessionRows,
      studentRows,
      studentMessageRows,
      topicRows,
      struggleRows,
      interventionGroupRows,
      tokenRows,
      weeklyRows,
    ] = await Promise.all([
      database
        .select({
          total: count(),
          active: count(sql`case when ${tutorSessions.status} = 'active' then 1 end`),
          paused: count(sql`case when ${tutorSessions.status} = 'paused' then 1 end`),
          completed: count(sql`case when ${tutorSessions.status} = 'completed' then 1 end`),
          abandoned: count(sql`case when ${tutorSessions.status} = 'abandoned' then 1 end`),
          error: count(sql`case when ${tutorSessions.status} = 'error' then 1 end`),
          avgDuration: avg(DURATION_SQL),
          totalDuration: sum(DURATION_SQL),
        })
        .from(tutorSessions)
        .where(sessionRange),

      database
        .select({ total: count(sql`distinct ${tutorSessions.studentId}`) })
        .from(tutorSessions)
        .where(sessionRange),

      database
        .select({ total: count() })
        .from(messages)
        .innerJoin(tutorSessions, eq(tutorSessions.id, messages.sessionId))
        .where(sessionRange),

      database
        .select({ total: count() })
        .from(interventions)
        .where(
          and(
            inArray(interventions.classId, targetClassIds),
            gte(interventions.createdAt, startDate),
            lte(interventions.createdAt, rangeEnd)
          )
        ),

      // Sessions per day (grouped on session start date)
      database
        .select({
          date: sql<string>`to_char(${tutorSessions.startedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          total: count(),
          avgDuration: avg(DURATION_SQL),
        })
        .from(tutorSessions)
        .where(sessionRange)
        .groupBy(sql`to_char(${tutorSessions.startedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`),

      // Messages per day (grouped on message creation date)
      database
        .select({
          date: sql<string>`to_char(${messages.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          total: count(),
        })
        .from(messages)
        .innerJoin(tutorSessions, eq(tutorSessions.id, messages.sessionId))
        .where(
          and(
            sessionScope,
            gte(messages.createdAt, startDate),
            lte(messages.createdAt, rangeEnd)
          )
        )
        .groupBy(sql`to_char(${messages.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`),

      // Recent sessions
      database
        .select({
          id: tutorSessions.id,
          title: tutorSessions.title,
          status: tutorSessions.status,
          messageCount: tutorSessions.messageCount,
          startedAt: tutorSessions.startedAt,
          studentFirstName: users.firstName,
          studentLastName: users.lastName,
          className: classes.name,
          lastMessageAt: sql<Date | null>`(
            select max(m.created_at) from ${messages} m where m.session_id = ${tutorSessions.id}
          )`,
        })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .innerJoin(students, eq(students.id, tutorSessions.studentId))
        .innerJoin(users, eq(users.id, students.userId))
        .where(sessionRange)
        .orderBy(desc(tutorSessions.startedAt))
        .limit(8),

      // Enrolled students + their in-range session stats
      database
        .select({
          studentId: students.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          sessionCount: count(tutorSessions.id),
          totalDuration: sum(DURATION_SQL),
          avgDuration: avg(DURATION_SQL),
          lastSession: sql<Date | null>`max(${tutorSessions.startedAt})`,
        })
        .from(students)
        .innerJoin(users, eq(users.id, students.userId))
        .innerJoin(classStudents, eq(classStudents.studentId, students.id))
        .leftJoin(
          tutorSessions,
          and(
            eq(tutorSessions.studentId, students.id),
            sessionScope,
            gte(tutorSessions.startedAt, startDate),
            lte(tutorSessions.startedAt, rangeEnd)
          )
        )
        .where(inArray(classStudents.classId, targetClassIds))
        .groupBy(students.id, users.firstName, users.lastName, users.email)
        .orderBy(desc(count(tutorSessions.id)))
        .limit(25),

      // Messages per student (separate aggregate, no join multiplication)
      database
        .select({
          studentId: tutorSessions.studentId,
          total: count(),
        })
        .from(messages)
        .innerJoin(tutorSessions, eq(tutorSessions.id, messages.sessionId))
        .where(sessionRange)
        .groupBy(tutorSessions.studentId),

      // Topics
      database
        .select({
          topic: sql<string>`unnest(${sessionSummaries.keyTopics})`,
          total: count(),
        })
        .from(sessionSummaries)
        .innerJoin(tutorSessions, eq(tutorSessions.id, sessionSummaries.sessionId))
        .where(
          and(
            inArray(tutorSessions.classId, targetClassIds),
            gte(sessionSummaries.createdAt, startDate),
            lte(sessionSummaries.createdAt, rangeEnd)
          )
        )
        .groupBy(sql`unnest(${sessionSummaries.keyTopics})`)
        .orderBy(desc(count()))
        .limit(20),

      // Struggles
      database
        .select({
          struggle: sql<string>`unnest(${sessionSummaries.areasForImprovement})`,
          total: count(),
        })
        .from(sessionSummaries)
        .innerJoin(tutorSessions, eq(tutorSessions.id, sessionSummaries.sessionId))
        .where(
          and(
            inArray(tutorSessions.classId, targetClassIds),
            gte(sessionSummaries.createdAt, startDate),
            lte(sessionSummaries.createdAt, rangeEnd)
          )
        )
        .groupBy(sql`unnest(${sessionSummaries.areasForImprovement})`)
        .orderBy(desc(count()))
        .limit(20),

      // Intervention breakdown
      database
        .select({
          type: interventions.type,
          severity: interventions.severity,
          status: interventions.status,
          total: count(),
        })
        .from(interventions)
        .where(
          and(
            inArray(interventions.classId, targetClassIds),
            gte(interventions.createdAt, startDate),
            lte(interventions.createdAt, rangeEnd)
          )
        )
        .groupBy(interventions.type, interventions.severity, interventions.status)
        .orderBy(desc(count())),

      // Token usage: session-level first, message-level fallback
      Promise.all([
        database
          .select({
            total: sum(sql`
              case when (${tutorSessions.tokenUsage}->>'total') ~ '^[0-9]+$'
                then (${tutorSessions.tokenUsage}->>'total')::bigint else 0 end
            `),
          })
          .from(tutorSessions)
          .where(sessionRange),
        database
          .select({
            total: sum(sql`
              case when (${messages.metadata}->>'tokens') ~ '^[0-9]+$'
                then (${messages.metadata}->>'tokens')::bigint else 0 end
            `),
          })
          .from(messages)
          .innerJoin(tutorSessions, eq(tutorSessions.id, messages.sessionId))
          .where(and(sessionRange, eq(messages.role, 'assistant'))),
        database
          .select({ total: count() })
          .from(messages)
          .innerJoin(tutorSessions, eq(tutorSessions.id, messages.sessionId))
          .where(and(sessionRange, eq(messages.role, 'assistant'))),
      ]),

      // Weekly progress
      database
        .select({
          week: sql<string>`to_char(date_trunc('week', ${tutorSessions.startedAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
          sessions: count(),
          avgDuration: avg(DURATION_SQL),
          completedSessions: count(sql`case when ${tutorSessions.status} = 'completed' then 1 end`),
        })
        .from(tutorSessions)
        .where(sessionRange)
        .groupBy(sql`date_trunc('week', ${tutorSessions.startedAt} AT TIME ZONE 'UTC')`),
    ]);

    // ---- Overview ---------------------------------------------------------
    const overviewRow = overviewRows[0] ?? {};
    const totalSessions = toNumber(overviewRow.total);
    const completedSessions = toNumber(overviewRow.completed);

    const overview = {
      total: totalSessions,
      active: toNumber(overviewRow.active),
      paused: toNumber(overviewRow.paused),
      completed: completedSessions,
      abandoned: toNumber(overviewRow.abandoned),
      error: toNumber(overviewRow.error),
      students: toNumber(studentCountRows[0]?.total),
      messages: toNumber(messageCountRows[0]?.total),
      interventions: toNumber(interventionRows[0]?.total),
      avgDuration: Math.round(toNumber(overviewRow.avgDuration)),
      totalDuration: Math.round(toNumber(overviewRow.totalDuration)),
      completedRate:
        totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    };

    // ---- Dense daily series ----------------------------------------------
    const sessionDayMap = new Map<string, { count: number; avgDuration: number }>();
    for (const row of sessionsByDayRows) {
      sessionDayMap.set(String(row.date), {
        count: toNumber(row.total),
        avgDuration: Math.round(toNumber(row.avgDuration)),
      });
    }

    const messageDayMap = new Map<string, number>();
    for (const row of messagesByDayRows) {
      messageDayMap.set(String(row.date), toNumber(row.total));
    }

    const sessionsByDay: Array<{
      date: string;
      count: number;
      messages: number;
      avgDuration: number;
    }> = [];
    for (let cursor = startDate; cursor <= todayStart; cursor = addDaysUTC(cursor, 1)) {
      const key = formatDateUTC(cursor);
      const sessions = sessionDayMap.get(key);
      sessionsByDay.push({
        date: key,
        count: sessions?.count ?? 0,
        messages: messageDayMap.get(key) ?? 0,
        avgDuration: sessions?.avgDuration ?? 0,
      });
    }

    // ---- Recent sessions -------------------------------------------------
    const recentSessions = recentSessionRows.map((row) => ({
      id: row.id,
      title: row.title ?? null,
      studentName:
        [row.studentFirstName, row.studentLastName].filter(Boolean).join(' ').trim() ||
        'Unknown student',
      className: row.className ?? 'Unknown class',
      status: row.status,
      messageCount: toNumber(row.messageCount),
      startedAt: toIsoString(row.startedAt),
      lastMessageAt: toIsoString(row.lastMessageAt),
    }));

    // ---- Student engagement ---------------------------------------------
    const studentMessageMap = new Map<string, number>();
    for (const row of studentMessageRows) {
      studentMessageMap.set(row.studentId, toNumber(row.total));
    }

    const studentEngagement = studentRows.map((row) => ({
      studentId: row.studentId,
      studentName:
        [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || 'Unknown student',
      studentEmail: row.email ?? '',
      sessionCount: toNumber(row.sessionCount),
      messageCount: studentMessageMap.get(row.studentId) ?? 0,
      totalDuration: Math.round(toNumber(row.totalDuration)),
      avgDuration: Math.round(toNumber(row.avgDuration)),
      lastSession: toIsoString(row.lastSession),
    }));

    // ---- Content ---------------------------------------------------------
    const topics = topicRows.map((row) => ({
      topic: row.topic,
      count: toNumber(row.total),
    }));

    const struggles = struggleRows.map((row) => ({
      struggle: row.struggle,
      count: toNumber(row.total),
    }));

    const interventionList = interventionGroupRows.map((row) => ({
      type: row.type,
      severity: row.severity,
      status: row.status,
      count: toNumber(row.total),
    }));

    // ---- Tokens ----------------------------------------------------------
    const [sessionTokenRows, messageTokenRows, assistantMessageRows] = tokenRows;
    const sessionTokens = toNumber(sessionTokenRows[0]?.total);
    const messageTokens = toNumber(messageTokenRows[0]?.total);
    const totalTokens = sessionTokens > 0 ? sessionTokens : messageTokens;
    const assistantMessages = toNumber(assistantMessageRows[0]?.total);

    const tokens = {
      totalTokens,
      avgTokensPerMessage:
        totalTokens > 0 && assistantMessages > 0
          ? Math.round(totalTokens / assistantMessages)
          : 0,
      messageCount: assistantMessages,
      hasTokenData: totalTokens > 0,
    };

    // ---- Weekly progress (dense) ----------------------------------------
    const weekMap = new Map<string, { sessions: number; avgDuration: number; completed: number }>();
    for (const row of weeklyRows) {
      weekMap.set(String(row.week), {
        sessions: toNumber(row.sessions),
        avgDuration: Math.round(toNumber(row.avgDuration)),
        completed: toNumber(row.completedSessions),
      });
    }

    const firstWeek = startOfDayUTC(new Date(startDate));
    firstWeek.setUTCDate(firstWeek.getUTCDate() - firstWeek.getUTCDay());
    const lastWeek = startOfDayUTC(todayStart);
    lastWeek.setUTCDate(lastWeek.getUTCDate() - lastWeek.getUTCDay());

    const weeklyProgress: Array<{
      week: string;
      sessions: number;
      avgDuration: number;
      completedSessions: number;
    }> = [];
    for (let cursor = firstWeek; cursor <= lastWeek; cursor = addDaysUTC(cursor, 7)) {
      const key = formatDateUTC(cursor);
      const week = weekMap.get(key);
      weeklyProgress.push({
        week: key,
        sessions: week?.sessions ?? 0,
        avgDuration: week?.avgDuration ?? 0,
        completedSessions: week?.completed ?? 0,
      });
    }

    return NextResponse.json({
      range,
      classes: teacherClasses.map((row) => ({
        id: row.id,
        name: row.name,
        subject: row.subject ?? '',
      })),
      overview,
      sessionsByDay,
      recentSessions,
      studentEngagement,
      topics,
      struggles,
      interventions: interventionList,
      tokens,
      weeklyProgress,
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
