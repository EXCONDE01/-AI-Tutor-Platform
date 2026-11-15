/**
 * Admin API - Retention Jobs
 * List retention jobs with pagination and filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import {
  retentionJobs,
  retentionPolicies,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

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
    
    // Filters
    const policyId = searchParams.get('policyId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where conditions
    const conditions = [];

    if (policyId) {
      conditions.push(eq(retentionJobs.policyId, policyId));
    }

    if (status) {
      conditions.push(eq(retentionJobs.status, status));
    }

    if (startDate) {
      const date = new Date(startDate);
      if (!isNaN(date.getTime())) {
        conditions.push(gte(retentionJobs.createdAt, date));
      }
    }

    if (endDate) {
      const date = new Date(endDate);
      if (!isNaN(date.getTime())) {
        conditions.push(lte(retentionJobs.createdAt, date));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ value: total }] = await database
      .select({ value: count() })
      .from(retentionJobs)
      .where(whereClause);

    // Get paginated results with joined policy info
    const data = await database
      .select({
        id: retentionJobs.id,
        policyId: retentionJobs.policyId,
        policyCategory: retentionPolicies.category,
        policyDescription: retentionPolicies.description,
        status: retentionJobs.status,
        scope: retentionJobs.scope,
        recordsProcessed: retentionJobs.recordsProcessed,
        recordsArchived: retentionJobs.recordsArchived,
        recordsDeleted: retentionJobs.recordsDeleted,
        errors: retentionJobs.errors,
        startedAt: retentionJobs.startedAt,
        completedAt: retentionJobs.completedAt,
        nextRunAt: retentionJobs.nextRunAt,
        metadata: retentionJobs.metadata,
        createdAt: retentionJobs.createdAt,
        updatedAt: retentionJobs.updatedAt,
      })
      .from(retentionJobs)
      .leftJoin(retentionPolicies, eq(retentionPolicies.id, retentionJobs.policyId))
      .where(whereClause)
      .orderBy(desc(retentionJobs.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Format response
    const formattedData = data.map((job) => ({
      id: job.id,
      policyId: job.policyId,
      policyName: job.policyCategory 
        ? job.policyCategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : 'Unknown Policy',
      status: job.status,
      scope: job.scope,
      recordsProcessed: Number(job.recordsProcessed ?? 0),
      recordsArchived: Number(job.recordsArchived ?? 0),
      recordsDeleted: Number(job.recordsDeleted ?? 0),
      errors: job.errors ?? [],
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      nextRunAt: job.nextRunAt?.toISOString() ?? null,
      metadata: job.metadata,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data: formattedData,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error('[admin/retention/jobs] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}