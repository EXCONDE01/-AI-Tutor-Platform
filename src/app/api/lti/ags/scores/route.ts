/**
 * LTI AGS Scores API - Publish and manage scores (Grade Passback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { db } from '@/lib/db';
import { ltiDeployments, agsLineItems, agsScores, nrpsCache, tutorSessions, users, students, classes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createAGSClient, publishSessionScore } from '@/lib/lti/ags-client';

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
    const deploymentId = searchParams.get('deploymentId');
    const lineItemUrl = searchParams.get('lineItemUrl');
    const ltiUserId = searchParams.get('ltiUserId');

    if (!deploymentId || !lineItemUrl) {
      return NextResponse.json({ error: 'deploymentId and lineItemUrl required' }, { status: 400 });
    }

    const client = await createAGSClient(deploymentId);
    const scores = await client.getScores(lineItemUrl, ltiUserId || undefined);

    return NextResponse.json({ scores });
  } catch (error) {
    console.error('[AGS Scores GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
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

    const body = await request.json();
    const { deploymentId, lineItemUrl, ltiUserId, scoreGiven, scoreMaximum, comment } = body;

    if (!deploymentId || !lineItemUrl || !ltiUserId || scoreGiven === undefined) {
      return NextResponse.json({ 
        error: 'deploymentId, lineItemUrl, ltiUserId, and scoreGiven required' 
      }, { status: 400 });
    }

    const result = await publishSessionScore(
      deploymentId,
      lineItemUrl,
      ltiUserId,
      scoreGiven,
      scoreMaximum || 100,
      comment
    );

    return NextResponse.json({ score: result });
  } catch (error) {
    console.error('[AGS Scores POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lti/ags/scores/session - Publish score from a tutor session
 * This is the main grade passback endpoint used by teachers
 */
export async function PATCH(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId, deploymentId, scoreGiven, scoreMaximum, comment } = body;

    if (!sessionId || !deploymentId || scoreGiven === undefined) {
      return NextResponse.json({ 
        error: 'sessionId, deploymentId, and scoreGiven required' 
      }, { status: 400 });
    }

    // Get the session
    const [session] = await db
      .select()
      .from(tutorSessions)
      .where(eq(tutorSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify teacher owns this session's class
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, session.classId))
      .limit(1);

    if (!classInfo || classInfo.teacherId !== appUser.user.id) {
      return NextResponse.json({ error: 'Not authorized for this session' }, { status: 403 });
    }

    // Find the line item for this session
    const [lineItem] = await db
      .select()
      .from(agsLineItems)
      .where(
        and(
          eq(agsLineItems.deploymentId, deploymentId),
          eq(agsLineItems.tag, `session-${sessionId}`)
        )
      )
      .limit(1);

    if (!lineItem) {
      return NextResponse.json({ 
        error: 'No line item found for this session. Create one first.' 
      }, { status: 404 });
    }

    // Get LTI user ID from NRPS cache
    const [nrpEntry] = await db
      .select()
      .from(nrpsCache)
      .where(
        and(
          eq(nrpsCache.deploymentId, deploymentId),
          eq(nrpsCache.contextId, lineItem.contextId),
          eq(nrpsCache.lisPersonSourcedId, session.studentId) // This might need adjustment
        )
      )
      .limit(1);

    // Alternative: find student by user ID
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, session.studentId))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, student.userId))
      .limit(1);

    // Use the user's externalId as LTI user ID
    const ltiUserId = user?.externalId || student.id;

    const result = await publishSessionScore(
      deploymentId,
      lineItem.ltiLineItemUrl!,
      ltiUserId,
      scoreGiven,
      scoreMaximum || lineItem.scoreMaximum,
      comment
    );

    return NextResponse.json({ score: result, lineItem });
  } catch (error) {
    console.error('[AGS Scores PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}