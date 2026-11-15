/**
 * Admin API - Trigger Retention Job
 * Create a retention job record and return job ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import { retentionPolicies, retentionJobs } from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function checkAdminAuth(request: NextRequest) {
  const auth = await requireAppRole('admin', request);
  if (!auth.ok) {
    return { error: auth.response.status === 401 ? 'Unauthenticated' : 'Admin access required', status: auth.response.status } as const;
  }
  return { appUser: auth.appUser } as const;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const database = getDb();
    const body = await request.json().catch(() => ({}));

    // Verify policy exists
    const [policy] = await database
      .select({
        id: retentionPolicies.id,
        category: retentionPolicies.category,
        isActive: retentionPolicies.isActive,
      })
      .from(retentionPolicies)
      .where(eq(retentionPolicies.id, id))
      .limit(1);

    if (!policy) {
      return NextResponse.json({ error: 'Retention policy not found' }, { status: 404 });
    }

    if (!policy.isActive) {
      return NextResponse.json({ error: 'Cannot run inactive retention policy' }, { status: 400 });
    }

    // Optional scope override from request body
    const scope = body.scope || {};

    // Create retention job
    const [newJob] = await database
      .insert(retentionJobs)
      .values({
        policyId: id,
        status: 'pending',
        scope,
        recordsProcessed: 0,
        recordsArchived: 0,
        recordsDeleted: 0,
        errors: [],
        metadata: {
          triggeredBy: auth.appUser.user.id,
          triggeredAt: new Date().toISOString(),
          category: policy.category,
        },
      })
      .returning();

    // Note: In production, you would trigger the actual retention job execution here
    // via a queue, background worker, or function. This endpoint just creates the job record.
    
    return NextResponse.json({
      jobId: newJob.id,
      policyId: id,
      status: newJob.status,
      createdAt: newJob.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error('[admin/retention/[id]/run] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}