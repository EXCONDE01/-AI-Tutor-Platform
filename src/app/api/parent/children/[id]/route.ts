/**
 * Parent API - Child progress summary.
 * GET /api/parent/children/[id]/progress — read-only progress for a linked child.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import {
  consentRecords,
  generatedArtifacts,
  parents,
  sessionSummaries,
  studentParents,
  students,
  tutorSessions,
  users,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProgressSummary {
  studentId: string;
  studentName: string;
  gradeLevel: number | null;
  totalSessions: number;
  completedSessions: number;
  totalDurationMinutes: number;
  averageEngagementScore: number | null;
  lastSessionDate: string | null;
  recentTopics: string[];
  recentArtifacts: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  consentStatus: {
    parentalConsent: boolean;
    coppaConsent: boolean;
    ferpaConsent: boolean;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const database = getDb();

    // Get parent record for the authenticated user
    const [parentRow] = await database
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.userId, authSession.data.user.id))
      .limit(1);

    if (!parentRow) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    // Verify the child is linked to this parent (FERPA)
    const [link] = await database
      .select({ studentId: studentParents.studentId })
      .from(studentParents)
      .where(
        and(
          eq(studentParents.parentId, parentRow.id),
          eq(studentParents.studentId, studentId)
        )
      )
      .limit(1);

    if (!link) {
      return NextResponse.json(
        { error: 'Child not found or not linked to this parent' },
        { status: 404 }
      );
    }

    // Fetch student info
    const [student] = await database
      .select({
        studentId: students.id,
        gradeLevel: students.gradeLevel,
        dateOfBirth: students.dateOfBirth,
        childUserId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const name =
      `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() ||
      student.displayName ||
      'Unknown Student';

    // Session stats
    const sessions = await database
      .select({
        id: tutorSessions.id,
        status: tutorSessions.status,
        startedAt: tutorSessions.startedAt,
        totalDurationSeconds: tutorSessions.totalDurationSeconds,
        summary: sessionSummaries.summary,
        engagementScore: sessionSummaries.engagementScore,
        keyTopics: sessionSummaries.keyTopics,
        generatedAt: sessionSummaries.generatedAt,
      })
      .from(tutorSessions)
      .leftJoin(sessionSummaries, eq(sessionSummaries.sessionId, tutorSessions.id))
      .where(eq(tutorSessions.studentId, studentId))
      .orderBy(desc(tutorSessions.startedAt));

    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalDurationSeconds = sessions.reduce(
      (acc, s) => acc + Number(s.totalDurationSeconds || 0),
      0
    );
    const totalDurationMinutes = Math.round(totalDurationSeconds / 60);

    const engagementScores = completedSessions
      .map(s => s.engagementScore)
      .filter((s): s is number => s !== null);
    const averageEngagementScore =
      engagementScores.length > 0
        ? Math.round(engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length)
        : null;

    const lastSession = sessions[0];
    const lastSessionDate = lastSession?.startedAt
      ? new Date(lastSession.startedAt).toISOString()
      : null;

    // Recent topics from summaries
    const recentTopics: string[] = [];
    completedSessions.forEach(s => {
      if (s.keyTopics) {
        const topics = Array.isArray(s.keyTopics) ? s.keyTopics : [];
        topics.forEach(t => {
          if (typeof t === 'string' && !recentTopics.includes(t)) {
            recentTopics.push(t);
          }
        });
      }
    });

    // Recent artifacts for this student
    const artifacts = await database
      .select({
        id: generatedArtifacts.id,
        title: generatedArtifacts.title,
        type: generatedArtifacts.type,
        status: generatedArtifacts.status,
        createdAt: generatedArtifacts.createdAt,
      })
      .from(generatedArtifacts)
      .where(eq(generatedArtifacts.studentId, studentId))
      .orderBy(desc(generatedArtifacts.createdAt))
      .limit(5);

    const recentArtifacts = artifacts.map(a => ({
      id: a.id,
      title: a.title,
      type: a.type,
      status: a.status,
      createdAt: a.createdAt?.toISOString() ?? '',
    }));

    // Consent status
    const consentChecks = await database
      .select({
        type: consentRecords.type,
        status: consentRecords.status,
      })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.studentId, studentId),
          eq(consentRecords.status, 'granted')
        )
      );

    const grantedTypes = new Set(consentChecks.map(c => c.type));

    const progress: ProgressSummary = {
      studentId: student.studentId,
      studentName: name,
      gradeLevel: student.gradeLevel ?? null,
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalDurationMinutes,
      averageEngagementScore,
      lastSessionDate,
      recentTopics: recentTopics.slice(0, 10),
      recentArtifacts,
      consentStatus: {
        parentalConsent: grantedTypes.has('parental_consent'),
        coppaConsent: grantedTypes.has('coppa_consent'),
        ferpaConsent: grantedTypes.has('ferpa_consent'),
      },
    };

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('[parent/children/[id]/progress] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
