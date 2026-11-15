/**
 * Session Summarization API Endpoint
 * 
 * POST /api/chat/summarize
 * Body: { sessionId: string }
 * 
 * Triggers AI summarization for a completed/ended session.
 * Persists summary to sessionSummaries table and stores misconception/strength embeddings.
 * Can be triggered by teacher or student (owner) or auto-triggered on session completion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  tutorSessions,
  messages as messagesTable,
  sessionSummaries,
  tutorConfigs,
  classes,
  students,
  teachers,
} from '@/db/schema';
import { generateSessionSummary, storeSessionLearningEmbeddings, type SessionSummaryData } from '@/lib/ai/summarize';
import type { ModelMessage } from 'ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('student', request);
    if (!appUser) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const { sessionId } = parsed.data;
    const database = getDb();

    // Resolve caller's profile
    const [studentRow] = await database
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, appUser.user.id))
      .limit(1);

    const [teacherRow] = await database
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, appUser.user.id))
      .limit(1);

    if (!studentRow && !teacherRow) {
      return NextResponse.json(
        { error: 'No student or teacher profile for this account' },
        { status: 403 }
      );
    }

    // Fetch session with ownership check
    const [tutorSession] = await database
      .select({
        id: tutorSessions.id,
        classId: tutorSessions.classId,
        studentId: tutorSessions.studentId,
        tutorConfigId: tutorSessions.tutorConfigId,
        status: tutorSessions.status,
        title: tutorSessions.title,
        startedAt: tutorSessions.startedAt,
        endedAt: tutorSessions.endedAt,
        totalDurationSeconds: tutorSessions.totalDurationSeconds,
        messageCount: tutorSessions.messageCount,
        tokenUsage: tutorSessions.tokenUsage,
      })
      .from(tutorSessions)
      .where(eq(tutorSessions.id, sessionId))
      .limit(1);

    if (!tutorSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check ownership
    const isOwner =
      (studentRow && tutorSession.studentId === studentRow.id) ||
      (teacherRow &&
        (await database
          .select({ id: classes.id })
          .from(classes)
          .where(and(eq(classes.id, tutorSession.classId), eq(classes.teacherId, teacherRow.id)))
          .limit(1)).length > 0);

    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if summary already exists
    const [existingSummary] = await database
      .select({ id: sessionSummaries.id })
      .from(sessionSummaries)
      .where(eq(sessionSummaries.sessionId, sessionId))
      .limit(1);

    if (existingSummary) {
      return NextResponse.json(
        { error: 'Summary already exists for this session', summaryId: existingSummary.id },
        { status: 409 }
      );
    }

    // Only summarize completed/ended sessions (or allow manual override for teachers)
    const isTeacher = !!teacherRow;
    if (!isTeacher && tutorSession.status !== 'completed' && tutorSession.status !== 'abandoned') {
      return NextResponse.json(
        { error: 'Session must be completed or abandoned to summarize' },
        { status: 400 }
      );
    }

    // Fetch all messages for the session
    const allMessages = await database
      .select({
        role: messagesTable.role,
        content: messagesTable.content,
      })
      .from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId))
      .orderBy(messagesTable.sequence);

    if (allMessages.length === 0) {
      return NextResponse.json({ error: 'No messages to summarize' }, { status: 400 });
    }

    // Fetch tutor config for context
    const [configRow] = await database
      .select({ config: tutorConfigs.config })
      .from(tutorConfigs)
      .where(eq(tutorConfigs.id, tutorSession.tutorConfigId))
      .limit(1);

    const config = (configRow?.config ?? null) as typeof tutorConfigs.$inferSelect['config'] | null;

    // Convert to ModelMessage format
    const modelMessages: ModelMessage[] = allMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Generate summary
    const summaryData = await generateSessionSummary(modelMessages, config);

    // Calculate duration
    const durationSeconds = tutorSession.endedAt
      ? Math.round((new Date(tutorSession.endedAt).getTime() - new Date(tutorSession.startedAt).getTime()) / 1000)
      : tutorSession.totalDurationSeconds;

    // Persist summary to sessionSummaries
    const [insertedSummary] = await database
      .insert(sessionSummaries)
      .values({
        sessionId: tutorSession.id,
        studentId: tutorSession.studentId,
        classId: tutorSession.classId,
        summary: summaryData.summary,
        keyTopics: summaryData.keyTopics,
        learningProgress: summaryData.learningProgress,
        misconceptions: summaryData.misconceptions.map(m => m.text),
        strengths: summaryData.strengths.map(s => s.text),
        areasForImprovement: summaryData.areasForImprovement,
        engagementScore: summaryData.engagementScore,
        messageCount: summaryData.messageCount,
        durationSeconds,
        tokenUsage: summaryData.tokenUsage,
      })
      .returning({ id: sessionSummaries.id });

    if (!insertedSummary) {
      return NextResponse.json({ error: 'Failed to persist summary' }, { status: 500 });
    }

    // Store misconception and strength embeddings for future similarity detection
    await storeSessionLearningEmbeddings(
      tutorSession.studentId,
      tutorSession.classId,
      tutorSession.id,
      summaryData
    );

    // Update tutor session with summary reference
    await database
      .update(tutorSessions)
      .set({
        summary: summaryData.summary,
        updatedAt: new Date(),
      })
      .where(eq(tutorSessions.id, tutorSession.id));

    return NextResponse.json({
      success: true,
      summaryId: insertedSummary.id,
      summary: summaryData,
    });
  } catch (error) {
    console.error('[chat/summarize] Request failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}