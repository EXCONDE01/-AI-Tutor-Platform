/**
 * LTI AGS Scores API
 * GET: List scores (paginated, filterable by lineItemId, userId)
 * POST: Create/update a score via AGSClient and cache locally
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import {
  agsLineItems,
  agsScores,
  ltiDeployments,
} from '@/db/schema/lti';
import { users } from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { createAGSClient } from '@/lib/lti/ags';
import { AGSScoreCreateRequest } from '@/lib/lti/types';
import { createAuditLog } from '@/lib/compliance/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10))
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

const scoreQuerySchema = z.object({
  lineItemId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

const createScoreBodySchema = z.object({
  userId: z.string().uuid('Invalid userId'),
  scoreGiven: z.number().int().min(0),
  scoreMaximum: z.number().int().positive().optional(),
  comment: z.string().max(1000).optional().nullable(),
  activityProgress: z.enum(['Initialized', 'Started', 'Completed']).optional(),
  gradingProgress: z.enum(['Pending', 'Failed', 'FullyGraded']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const database = getDb();
    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    const lineItemId = searchParams.get('lineItemId') || undefined;
    const userId = searchParams.get('userId') || undefined;

    const conditions = [];
    if (lineItemId && isUuid(lineItemId)) {
      conditions.push(eq(agsScores.lineItemId, lineItemId));
    }
    if (userId && isUuid(userId)) {
      conditions.push(eq(agsScores.userId, userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await database
      .select({ value: count() })
      .from(agsScores)
      .where(whereClause);

    const data = await database
      .select({
        id: agsScores.id,
        lineItemId: agsScores.lineItemId,
        userId: agsScores.userId,
        scoreGiven: agsScores.scoreGiven,
        scoreMaximum: agsScores.scoreMaximum,
        comment: agsScores.comment,
        activityProgress: agsScores.activityProgress,
        gradingProgress: agsScores.gradingProgress,
        status: agsScores.status,
        ltiScoreUrl: agsScores.ltiScoreUrl,
        timestamp: agsScores.timestamp,
        submittedAt: agsScores.submittedAt,
        createdAt: agsScores.createdAt,
        updatedAt: agsScores.updatedAt,
        // Join user info
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userDisplayName: users.displayName,
      })
      .from(agsScores)
      .leftJoin(users, eq(users.id, agsScores.userId))
      .where(whereClause)
      .orderBy(desc(agsScores.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error('[lti/ags/scores] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lineItemId: string }> }
) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;
    const appUser = auth.appUser;

    const { lineItemId } = await params;
    if (!isUuid(lineItemId)) {
      return NextResponse.json({ error: 'Invalid lineItemId' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createScoreBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid score data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, scoreGiven, scoreMaximum, comment, activityProgress, gradingProgress } =
      parsed.data;

    const database = getDb();

    // Verify line item exists locally
    const [lineItem] = await database
      .select({
        id: agsLineItems.id,
        ltiLineItemUrl: agsLineItems.ltiLineItemUrl,
        deploymentId: agsLineItems.deploymentId,
        label: agsLineItems.label,
        scoreMaximum: agsLineItems.scoreMaximum,
      })
      .from(agsLineItems)
      .where(eq(agsLineItems.id, lineItemId))
      .limit(1);

    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    if (!lineItem.ltiLineItemUrl) {
      return NextResponse.json(
        { error: 'Line item missing LTI URL' },
        { status: 400 }
      );
    }

    // Get deployment to find platform
    const [deployment] = await database
      .select()
      .from(ltiDeployments)
      .where(eq(ltiDeployments.id, lineItem.deploymentId))
      .limit(1);

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    const platformId = deployment.platformId;

    // Call AGS client against the LMS
    const agsClient = await createAGSClient(platformId, deployment.id);
    if (!agsClient) {
      return NextResponse.json({ error: 'Failed to create AGS client' }, { status: 400 });
    }

    const score: AGSScoreCreateRequest = {
      userId,
      scoreGiven,
      scoreMaximum: scoreMaximum || lineItem.scoreMaximum,
      activityProgress: activityProgress || 'Completed',
      gradingProgress: gradingProgress || 'FullyGraded',
      comment: comment || undefined,
    };

    let result;
    try {
      result = await agsClient.postScore(lineItem.ltiLineItemUrl, score);
    } catch (clientError) {
      console.error('[lti/ags/scores] AGS postScore failed:', clientError);
      return NextResponse.json(
        { error: 'AGS score posting failed: ' + (clientError as Error).message },
        { status: 400 }
      );
    }

    // Audit log (using lti_ags_lineitem_updated for score write)
    await createAuditLog({
      action: 'lti_ags_lineitem_updated' as Parameters<typeof createAuditLog>[0]['action'],
      resourceType: 'ags_score',
      resourceId: result.id,
      userId: appUser.user.id,
      severity: 'info',
      description: `Posted score for line item ${lineItem.label}`,
      newValues: {
        lineItemId,
        userId,
        scoreGiven,
        scoreMaximum: scoreMaximum || lineItem.scoreMaximum,
        activityProgress: activityProgress || 'Completed',
        gradingProgress: gradingProgress || 'FullyGraded',
        ltiScoreUrl: result.id,
      },
      metadata: {
        lineItemId,
        platformId,
        deploymentId: deployment.id,
        ltiLineItemUrl: lineItem.ltiLineItemUrl,
      },
    });

    return NextResponse.json(
      {
        score: {
          id: result.id,
          lineItemId,
          userId,
          scoreGiven,
          scoreMaximum: scoreMaximum || lineItem.scoreMaximum,
          comment,
          activityProgress: activityProgress || 'Completed',
          gradingProgress: gradingProgress || 'FullyGraded',
          ltiScoreUrl: result.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[lti/ags/scores/[lineItemId]] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}