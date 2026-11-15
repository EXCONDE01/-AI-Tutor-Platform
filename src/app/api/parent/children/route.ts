/**
 * Parent children API endpoint.
 * Lists the authenticated parent's linked children with progress summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  classStudents,
  consentRecords,
  messages,
  parents,
  sessionSummaries,
  studentParents,
  students,
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

    const appUser = await ensureAppUser('parent', request);
    if (!appUser || appUser.role !== 'parent') {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const database = getDb();

    // Get parent record for the authenticated user
    const [parentRow] = await database
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.userId, appUser.user.id))
      .limit(1);

    if (!parentRow) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    // Fetch linked children with their user info, latest session summary, and consent status
    const childrenData = await database
      .select({
        // Student info
        studentId: students.id,
        studentNumber: students.studentNumber,
        gradeLevel: students.gradeLevel,
        dateOfBirth: students.dateOfBirth,
        // Child user info
        childUserId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        // Latest session summary
        lastSummary: sessionSummaries.summary,
        lastSummaryGeneratedAt: sessionSummaries.generatedAt,
        lastEngagementScore: sessionSummaries.engagementScore,
        lastKeyTopics: sessionSummaries.keyTopics,
        // Latest session info
        lastSessionId: tutorSessions.id,
        lastSessionStatus: tutorSessions.status,
        lastSessionStartedAt: tutorSessions.startedAt,
        lastSessionMessageCount: tutorSessions.messageCount,
        lastSessionDuration: tutorSessions.totalDurationSeconds,
        // Consent status for required types
        hasParentalConsent: sql<boolean>`exists(
          select 1 from ${consentRecords} cr
          where cr.student_id = ${students.id}
            and cr.type = 'parental_consent'
            and cr.status = 'granted'
        )`,
        hasCoppaConsent: sql<boolean>`exists(
          select 1 from ${consentRecords} cr
          where cr.student_id = ${students.id}
            and cr.type = 'coppa_consent'
            and cr.status = 'granted'
        )`,
        hasFerpaConsent: sql<boolean>`exists(
          select 1 from ${consentRecords} cr
          where cr.student_id = ${students.id}
            and cr.type = 'ferpa_consent'
            and cr.status = 'granted'
        )`,
        // Active class count
        activeClassCount: sql<number>`count(distinct ${classes.id})`,
      })
      .from(parents)
      .innerJoin(studentParents, eq(studentParents.parentId, parents.id))
      .innerJoin(students, eq(students.id, studentParents.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(
        tutorSessions,
        and(
          eq(tutorSessions.studentId, students.id),
          eq(tutorSessions.status, 'completed')
        )
      )
      .leftJoin(
        sessionSummaries,
        eq(sessionSummaries.sessionId, tutorSessions.id)
      )
      .leftJoin(
        classStudents,
        and(eq(classStudents.studentId, students.id), eq(classStudents.isActive, true))
      )
      .leftJoin(classes, eq(classes.id, classStudents.classId))
      .where(eq(parents.id, parentRow.id))
      .groupBy(
        students.id,
        students.studentNumber,
        students.gradeLevel,
        students.dateOfBirth,
        users.id,
        users.email,
        users.firstName,
        users.lastName,
        users.displayName,
        users.avatarUrl,
        sessionSummaries.summary,
        sessionSummaries.generatedAt,
        sessionSummaries.engagementScore,
        sessionSummaries.keyTopics,
        tutorSessions.id,
        tutorSessions.status,
        tutorSessions.startedAt,
        tutorSessions.messageCount,
        tutorSessions.totalDurationSeconds
      )
      .orderBy(desc(tutorSessions.startedAt));

    // Format the response
    const children = childrenData.map((child) => {
      const name = 
        `${child.firstName ?? ''} ${child.lastName ?? ''}`.trim() || 
        child.displayName || 
        'Unknown Student';

      const lastActivity = child.lastSessionStartedAt
        ? new Date(child.lastSessionStartedAt).toISOString()
        : null;

      // Build progress summary from latest session summary
      const progressSummary = child.lastSummary
        ? {
            summary: child.lastSummary,
            engagementScore: child.lastEngagementScore,
            keyTopics: child.lastKeyTopics,
            lastSessionDate: child.lastSummaryGeneratedAt,
          }
        : null;

      return {
        id: child.childUserId,
        studentId: child.studentId,
        name,
        email: child.email,
        gradeLevel: child.gradeLevel,
        studentNumber: child.studentNumber,
        dateOfBirth: child.dateOfBirth,
        avatarUrl: child.avatarUrl,
        lastActivity,
        progressSummary,
        consentStatus: {
          parentalConsent: child.hasParentalConsent,
          coppaConsent: child.hasCoppaConsent,
          ferpaConsent: child.hasFerpaConsent,
        },
        activeClasses: Number(child.activeClassCount ?? 0),
      };
    });

    return NextResponse.json({ children });
  } catch (error) {
    console.error('[parent/children] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}