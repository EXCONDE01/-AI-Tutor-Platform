/**
 * Admin API - List all deletion requests
 * GET: all requests joined with user email
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import { dataDeletionRequests, users, students } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const database = getDb();
    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    const conditions = [];
    const statusFilter = searchParams.get('status');
    if (statusFilter) conditions.push(eq(dataDeletionRequests.status, statusFilter as any));

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

    const [{ value: total }] = await database
      .select({ value: sql<number>`count(*)` })
      .from(dataDeletionRequests)
      .where(whereClause);

    const rows = await database
      .select({
        id: dataDeletionRequests.id,
        districtId: dataDeletionRequests.districtId,
        schoolId: dataDeletionRequests.schoolId,
        userId: dataDeletionRequests.userId,
        studentId: dataDeletionRequests.studentId,
        requestedBy: dataDeletionRequests.requestedBy,
        status: dataDeletionRequests.status,
        reason: dataDeletionRequests.reason,
        legalBasis: dataDeletionRequests.legalBasis,
        scope: dataDeletionRequests.scope,
        verificationToken: dataDeletionRequests.verificationToken,
        verificationExpiresAt: dataDeletionRequests.verificationExpiresAt,
        verifiedAt: dataDeletionRequests.verifiedAt,
        verifiedBy: dataDeletionRequests.verifiedBy,
        scheduledAt: dataDeletionRequests.scheduledAt,
        startedAt: dataDeletionRequests.startedAt,
        completedAt: dataDeletionRequests.completedAt,
        failedAt: dataDeletionRequests.failedAt,
        errorMessage: dataDeletionRequests.errorMessage,
        deletedRecordCounts: dataDeletionRequests.deletedRecordCounts,
        metadata: dataDeletionRequests.metadata,
        createdAt: dataDeletionRequests.createdAt,
        updatedAt: dataDeletionRequests.updatedAt,
        userEmail: users.email,
        studentUserId: students.userId,
      })
      .from(dataDeletionRequests)
      .leftJoin(users, eq(users.id, dataDeletionRequests.userId))
      .leftJoin(students, eq(students.id, dataDeletionRequests.studentId))
      .where(whereClause)
      .orderBy(desc(dataDeletionRequests.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error('[admin/deletion-requests GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
