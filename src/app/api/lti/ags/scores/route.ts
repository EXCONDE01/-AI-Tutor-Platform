/**
 * LTI AGS Scores Collection API
 * GET: List scores (paginated, filterable by lineItemId, userId)
 * POST: Not supported here — use /api/lti/ags/scores/[lineItemId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import {
  agsScores,
  users,
} from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';

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