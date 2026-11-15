/**
 * Teacher session analytics endpoint.
 * Returns aggregated analytics for teacher dashboard charts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, avg, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  interventions,
  sessionSummaries,
  teachers,
  tutorSessions,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface AnalyticsQueryParams {
  teacherId: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
  granularity?: 'day' | 'week' | 'month';
}

function parseDateParam(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function getDateTrunc(granularity: 'day' | 'week' | 'month') {
  switch (granularity) {
    case 'day':
      return sql`date_trunc('day', ${sessionSummaries.generatedAt})`;
    case 'week':
      return sql`date_trunc('week', ${sessionSummaries.generatedAt})`;
    case 'month':
      return sql`date_trunc('month', ${sessionSummaries.generatedAt})`;
  }
}

// Fix for date_trunc with literal granularity
function dateTruncExpr(granularity: 'day' | 'week' | 'month', column: string) {
  return sql`date_trunc(${sql.raw(`'${granularity}'`)}, ${sql.raw(column)})`;
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
    const classId = searchParams.get('classId');
    const startDate = parseDateParam(searchParams.get('startDate'));
    const endDate = parseDateParam(searchParams.get('endDate'));
    const granularity = (searchParams.get('granularity') as 'day' | 'week' | 'month') ?? 'week';

    const database = getDb();

    // Get teacher ID and their classes
    const teacherClasses = await database
      .select({ id: classes.id, teacherId: classes.teacherId })
      .from(classes)
      .innerJoin(teachers, eq(teachers.id, classes.teacherId))
      .where(and(eq(teachers.userId, appUser.user.id), eq(classes.status, 'active')));

    if (teacherClasses.length === 0) {
      return NextResponse.json({
        masteryTrends: [],
        interventionFrequency: [],
        timeOnTask: [],
        summaryCards: {
          totalSessions: 0,
          avgEngagement: 0,
          totalInterventions: 0,
          totalHours: 0,
        },
      });
    }

    const teacherId = teacherClasses[0].teacherId;
    const classIds = teacherClasses.map((c) => c.id);
    const targetClassIds = classId && UUID_RE.test(classId) && classIds.includes(classId)
      ? [classId]
      : classIds;

    // Build base conditions for date filtering
    const dateConditions = [];
    if (startDate) dateConditions.push(gte(sessionSummaries.generatedAt, startDate));
    if (endDate) dateConditions.push(lte(sessionSummaries.generatedAt, endDate));

    const summaryConditions = [
      sql`${sessionSummaries.classId} IN (${sql.join(targetClassIds.map(id => sql`${id}`), sql`, `)})`,
      ...dateConditions,
    ];

    const interventionConditions = [
      sql`${interventions.classId} IN (${sql.join(targetClassIds.map(id => sql`${id}`), sql`, `)})`,
      ...(startDate ? [gte(interventions.createdAt, startDate)] : []),
      ...(endDate ? [lte(interventions.createdAt, endDate)] : []),
    ];

    const sessionConditions = [
      sql`${tutorSessions.classId} IN (${sql.join(targetClassIds.map(id => sql`${id}`), sql`, `)})`,
      ...(startDate ? [gte(tutorSessions.startedAt, startDate)] : []),
      ...(endDate ? [lte(tutorSessions.startedAt, endDate)] : []),
    ];

    // Run all queries concurrently
    const [
      masteryTrendsData,
      interventionFrequencyData,
      timeOnTaskData,
      summaryStats,
    ] = await Promise.all([
      // 1. Mastery trends - engagement score over time
      database
        .select({
          period: getDateTrunc(granularity),
          avgEngagement: avg(sessionSummaries.engagementScore),
          sessionCount: count(),
        })
        .from(sessionSummaries)
        .where(and(...summaryConditions))
        .groupBy(getDateTrunc(granularity))
        .orderBy(getDateTrunc(granularity)),

      // 2. Intervention frequency - count by period
      database
        .execute(sql`
          WITH severity_counts AS (
            SELECT 
              date_trunc(${sql.raw(`'${granularity}'`)}, created_at) as period,
              severity,
              count(*) as cnt
            FROM interventions
            WHERE class_id IN (${sql.join(targetClassIds.map(id => sql`${id}`), sql`, `)})
            ${startDate ? sql`AND created_at >= ${startDate}` : sql``}
            ${endDate ? sql`AND created_at <= ${endDate}` : sql``}
            GROUP BY date_trunc(${sql.raw(`'${granularity}'`)}, created_at), severity
          )
          SELECT 
            period,
            sum(cnt) as count,
            jsonb_object_agg(severity, cnt) as by_severity
          FROM severity_counts
          GROUP BY period
          ORDER BY period
        `),

      // 3. Time on task - hours per period
      database
        .execute(sql`
          SELECT 
            date_trunc(${sql.raw(`'${granularity}'`)}, started_at) as period,
            sum(total_duration_seconds) / 60 as total_minutes,
            count(*) as session_count
          FROM tutor_sessions
          WHERE class_id IN (${sql.join(targetClassIds.map(id => sql`${id}`), sql`, `)})
          ${startDate ? sql`AND started_at >= ${startDate}` : sql``}
          ${endDate ? sql`AND started_at <= ${endDate}` : sql``}
          GROUP BY date_trunc(${sql.raw(`'${granularity}'`)}, started_at)
          ORDER BY date_trunc(${sql.raw(`'${granularity}'`)}, started_at)
        `),

      // 4. Summary cards - totals
      database
        .select({
          totalSessions: count(tutorSessions.id),
          avgEngagement: avg(sessionSummaries.engagementScore),
          totalInterventions: count(interventions.id),
          totalDurationSeconds: sum(tutorSessions.totalDurationSeconds),
        })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .leftJoin(sessionSummaries, eq(sessionSummaries.sessionId, tutorSessions.id))
        .leftJoin(interventions, eq(interventions.sessionId, tutorSessions.id))
        .where(and(eq(classes.teacherId, teacherId), ...dateConditions)),
    ]);

    // Process mastery trends
    const masteryTrends = masteryTrendsData.map((row) => {
      const period = row.period as Date | null;
      return {
        period: period?.toISOString().split('T')[0] ?? '',
        engagementScore: Number(row.avgEngagement ?? 0),
        sessionCount: Number(row.sessionCount ?? 0),
      };
    });

    // Process intervention frequency
    const interventionFrequency = (interventionFrequencyData?.rows as Array<{ period: Date | string; count: string | number; by_severity: Record<string, number> }> ?? []).map((row) => {
      const period = row.period ? new Date(row.period) : null;
      return {
        period: period?.toISOString().split('T')[0] ?? '',
        count: Number(row.count ?? 0),
        bySeverity: row.by_severity ?? {},
      };
    });

    // Process time on task
    const timeOnTask = (timeOnTaskData?.rows as Array<{ period: Date | string; total_minutes: string | number; session_count: string | number }> ?? []).map((row) => {
      const period = row.period ? new Date(row.period) : null;
      return {
        period: period?.toISOString().split('T')[0] ?? '',
        hours: Number(row.total_minutes ?? 0) / 60,
        sessionCount: Number(row.session_count ?? 0),
      };
    });

    // Process summary cards
    const stats = summaryStats[0];
    const summaryCards = {
      totalSessions: Number(stats?.totalSessions ?? 0),
      avgEngagement: Math.round(Number(stats?.avgEngagement ?? 0)),
      totalInterventions: Number(stats?.totalInterventions ?? 0),
      totalHours: Math.round(Number(stats?.totalDurationSeconds ?? 0) / 3600 * 10) / 10,
    };

    return NextResponse.json({
      masteryTrends,
      interventionFrequency,
      timeOnTask,
      summaryCards,
    });
  } catch (error) {
    console.error('[teacher/analytics/sessions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}