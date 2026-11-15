/**
 * User-facing Data Deletion Requests API
 * POST: submit a deletion request
 * GET: list own requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { createDeletionRequest, getDeletionRequestsByUser } from '@/lib/compliance/deletion';
import type { DeletionScope } from '@/lib/compliance/deletion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = z.object({
  studentId: z.string().uuid().optional(),
  reason: z.string().max(2000).optional(),
  legalBasis: z.enum(['gdpr', 'ccpa', 'coppa', 'ferpa']).optional(),
  scope: z.object({
    tables: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    }).optional(),
    includeBackups: z.boolean().optional(),
  }).optional(),
});

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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAppRole(['admin', 'teacher', 'student', 'parent'], request);
    if (!auth.ok) return auth.response;
    const appUser = auth.appUser;

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failure', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { studentId, reason, legalBasis, scope } = parsed.data;

    const result = await createDeletionRequest({
      userId: appUser.user.id,
      requestedBy: appUser.user.id,
      studentId,
      reason,
      legalBasis,
      scope,
      schoolId: appUser.user.schoolId || undefined,
    });

    return NextResponse.json({ id: result.id, verificationToken: result.verificationToken }, { status: 201 });
  } catch (error) {
    console.error('[api/deletion-request POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole(['admin', 'teacher', 'student', 'parent'], request);
    if (!auth.ok) return auth.response;
    const appUser = auth.appUser;

    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    const requests = await getDeletionRequestsByUser(appUser.user.id);

    // Pagination
    const total = requests.length;
    const pageData = requests.slice(offset, offset + pageSize);

    return NextResponse.json({
      data: pageData.map(r => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        legalBasis: r.legalBasis,
        scope: r.scope,
        verificationExpiresAt: r.verificationExpiresAt,
        verifiedAt: r.verifiedAt,
        scheduledAt: r.scheduledAt,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        failedAt: r.failedAt,
        errorMessage: r.errorMessage,
        deletedRecordCounts: r.deletedRecordCounts,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[api/deletion-request GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
