/**
 * Teacher sessions list endpoint.
 * Returns all tutor sessions for classes taught by the authenticated teacher.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { sessionStatusEnum } from '@/db/schema/sessions';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  classes,
  classStudents,
  messages as messagesTable,
  students,
  teachers,
  tutorConfigs,
  tutorSessions,
  users,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_STATUSES = ['active', 'paused', 'completed', 'abandoned', 'error'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status');
    const status = rawStatus && VALID_STATUSES.includes(rawStatus as ValidStatus)
      ? (rawStatus as ValidStatus)
      : undefined;
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');
    const search = searchParams.get('search');
    const limitRaw = parseInt(searchParams.get('limit') ?? '50', 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 100)
      : 50;
    const offsetRaw = parseInt(searchParams.get('offset') ?? '0', 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    // Build where conditions (scoped to the teacher via a join, no extra lookup)
    const conditions = [
      eq(teachers.userId, appUser.user.id),
    ];

    if (status) {
      conditions.push(eq(tutorSessions.status, status));
    }
    if (classId && UUID_RE.test(classId)) {
      conditions.push(eq(tutorSessions.classId, classId));
    }
    if (studentId && UUID_RE.test(studentId)) {
      conditions.push(eq(tutorSessions.studentId, studentId));
    }
    if (search) {
      const escapedSearch = `%${search}%`;
      conditions.push(
        sql`(
          coalesce(${users.firstName} || ' ' || ${users.lastName}, '') ILIKE ${escapedSearch}
          OR ${users.email} ILIKE ${escapedSearch}
          OR ${classes.name} ILIKE ${escapedSearch}
          OR coalesce(${tutorSessions.title}, '') ILIKE ${escapedSearch}
        )`
      );
    }

    // Build conditions for counts (same as above but WITHOUT status filter)
    const countConditions = [
      eq(teachers.userId, appUser.user.id),
    ];
    if (classId && UUID_RE.test(classId)) {
      countConditions.push(eq(tutorSessions.classId, classId));
    }
    if (studentId && UUID_RE.test(studentId)) {
      countConditions.push(eq(tutorSessions.studentId, studentId));
    }
    if (search) {
      const escapedSearch = `%${search}%`;
      countConditions.push(
        sql`(
          coalesce(${users.firstName} || ' ' || ${users.lastName}, '') ILIKE ${escapedSearch}
          OR ${users.email} ILIKE ${escapedSearch}
          OR ${classes.name} ILIKE ${escapedSearch}
          OR coalesce(${tutorSessions.title}, '') ILIKE ${escapedSearch}
        )`
      );
    }

    // Sessions page + total count + status counts run together
    const [sessions, [{ count: total }], countsRows] = await Promise.all([
      database
        .select({
          id: tutorSessions.id,
          classId: tutorSessions.classId,
          className: classes.name,
          classSubject: classes.subject,
          studentId: tutorSessions.studentId,
          studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          studentEmail: users.email,
          status: tutorSessions.status,
          title: tutorSessions.title,
          messageCount: tutorSessions.messageCount,
          startedAt: tutorSessions.startedAt,
          endedAt: tutorSessions.endedAt,
          totalDurationSeconds: tutorSessions.totalDurationSeconds,
          lastMessageAt: sql<Date>`(
            select max(m.created_at) from ${messagesTable} m
            where m.session_id = ${tutorSessions.id}
          )`,
          lastMessageContent: sql<string>`(
            select m.content from ${messagesTable} m
            where m.session_id = ${tutorSessions.id}
            order by m.sequence desc limit 1
          )`,
          lastMessageRole: sql<string>`(
            select m.role from ${messagesTable} m
            where m.session_id = ${tutorSessions.id}
            order by m.sequence desc limit 1
          )`,
        })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .innerJoin(teachers, eq(teachers.id, classes.teacherId))
        .innerJoin(students, eq(students.id, tutorSessions.studentId))
        .innerJoin(users, eq(users.id, students.userId))
        .where(and(...conditions))
        .orderBy(desc(tutorSessions.startedAt))
        .limit(limit)
        .offset(offset),

      database
        .select({ count: sql<number>`count(*)` })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .innerJoin(teachers, eq(teachers.id, classes.teacherId))
        .innerJoin(students, eq(students.id, tutorSessions.studentId))
        .innerJoin(users, eq(users.id, students.userId))
        .where(and(...conditions)),

      database
        .select({
          status: tutorSessions.status,
          count: sql<number>`count(*)`,
        })
        .from(tutorSessions)
        .innerJoin(classes, eq(classes.id, tutorSessions.classId))
        .innerJoin(teachers, eq(teachers.id, classes.teacherId))
        .innerJoin(students, eq(students.id, tutorSessions.studentId))
        .innerJoin(users, eq(users.id, students.userId))
        .where(and(...countConditions))
        .groupBy(tutorSessions.status),
    ]);

    // Build counts object
    const counts = {
      all: 0,
      active: 0,
      paused: 0,
      completed: 0,
      abandoned: 0,
      error: 0,
    };
    for (const row of countsRows) {
      const n = Number(row.count);
      if (row.status === 'active') counts.active = n;
      else if (row.status === 'paused') counts.paused = n;
      else if (row.status === 'completed') counts.completed = n;
      else if (row.status === 'abandoned') counts.abandoned = n;
      else if (row.status === 'error') counts.error = n;
    }
    counts.all = counts.active + counts.paused + counts.completed + counts.abandoned + counts.error;

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        ...s,
        messageCount: Number(s.messageCount),
        totalDurationSeconds: Number(s.totalDurationSeconds) || 0,
        lastMessageContent: s.lastMessageContent ?? '',
        lastMessageRole: s.lastMessageRole ?? '',
        lastMessageAt: s.lastMessageAt ?? null,
      })),
      total: Number(total),
      counts,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[teacher/sessions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const database = getDb();

    // Parse request body
    let body: { classId?: string; studentId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { classId, studentId } = body;

    // Validate required fields
    if (!classId || !studentId) {
      return NextResponse.json(
        { error: 'classId and studentId are required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    if (!UUID_RE.test(classId) || !UUID_RE.test(studentId)) {
      return NextResponse.json(
        { error: 'classId and studentId must be valid UUIDs' },
        { status: 400 }
      );
    }

    // Resolve teacher record
    const teacher = await database
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, appUser.user.id))
      .limit(1);

    if (!teacher[0]) {
      return NextResponse.json(
        { error: 'Teacher record not found' },
        { status: 404 }
      );
    }
    const teacherId = teacher[0].id;

    // Check class ownership
    const classRow = await database
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)))
      .limit(1);

    if (!classRow[0]) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check active enrollment
    const enrollment = await database
      .select({ id: classStudents.id })
      .from(classStudents)
      .where(
        and(
          eq(classStudents.classId, classId),
          eq(classStudents.studentId, studentId),
          eq(classStudents.isActive, true)
        )
      )
      .limit(1);

    if (!enrollment[0]) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this class' },
        { status: 400 }
      );
    }

    // Ensure an active tutor config exists for the class; auto-provision a default if missing.
    let [tutorConfig] = await database
      .select({ id: tutorConfigs.id })
      .from(tutorConfigs)
      .where(and(eq(tutorConfigs.classId, classId), eq(tutorConfigs.isActive, true)))
      .limit(1);

    if (!tutorConfig) {
      const [existingConfig] = await database
        .select({ id: tutorConfigs.id })
        .from(tutorConfigs)
        .where(eq(tutorConfigs.classId, classId))
        .limit(1);

      if (existingConfig) {
        [tutorConfig] = await database
          .update(tutorConfigs)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(tutorConfigs.id, existingConfig.id))
          .returning({ id: tutorConfigs.id });
      } else {
        [tutorConfig] = await database
          .insert(tutorConfigs)
          .values({
            classId,
            createdBy: teacherId,
            config: {
              model: {
                provider: 'openai',
                modelName: '',
                temperature: 0.7,
                maxTokens: 1500,
                topP: 1,
              },
              systemPrompt: {
                base: 'You are a helpful, patient AI tutor. Guide the student with questions and clear explanations.',
                subjectSpecific: '',
                gradeLevelAdjustments: '',
                customInstructions: '',
              },
              pedagogy: {
                scaffoldingLevel: 'moderate',
                questionStyle: 'guided',
                feedbackFrequency: 'immediate',
                encourageMetacognition: true,
                allowStruggleTime: 30,
              },
              content: {
                allowedTopics: [],
                blockedTopics: [],
                curriculumAlignment: [],
                difficultyRange: { min: 1, max: 10 },
                language: 'en',
                enableMultiLanguage: false,
              },
              tools: {
                enableCalculator: false,
                enableCodeExecution: false,
                enableWebSearch: false,
                enableImageGeneration: false,
                enableRAG: false,
                ragCollections: [],
                customTools: [],
              },
              session: {
                maxDurationMinutes: 60,
                maxMessagesPerSession: 200,
                autoSummarize: false,
                summaryIntervalMinutes: 15,
                requireLearningObjectives: false,
              },
              safety: {
                contentFilterLevel: 'moderate',
                piiDetection: true,
                profanityFilter: true,
                escalationKeywords: [],
                requireHumanReview: false,
              },
              analytics: {
                trackEngagement: true,
                trackLearningProgress: true,
                trackMisconceptions: true,
                generateInsights: false,
                insightFrequency: 'session',
              },
            },
            isActive: true,
          })
          .returning({ id: tutorConfigs.id });
      }
    }

    if (!tutorConfig) {
      return NextResponse.json(
        { error: 'Could not prepare a tutor configuration for this class' },
        { status: 500 }
      );
    }

    // Create the tutor session
    const [session] = await database
      .insert(tutorSessions)
      .values({
        classId,
        studentId,
        tutorConfigId: tutorConfig.id,
        status: 'active',
        title: 'New tutoring session',
      })
      .returning({
        id: tutorSessions.id,
        classId: tutorSessions.classId,
        studentId: tutorSessions.studentId,
        tutorConfigId: tutorSessions.tutorConfigId,
        status: tutorSessions.status,
        title: tutorSessions.title,
        startedAt: tutorSessions.startedAt,
      });

    return NextResponse.json(
      { session: { ...session, startedAt: session.startedAt.toISOString() } },
      { status: 201 }
    );
  } catch (error) {
    console.error('[teacher/sessions POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}