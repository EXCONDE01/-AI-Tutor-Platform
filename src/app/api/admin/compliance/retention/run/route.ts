/**
 * Admin API - Run Retention Job
 * POST: Execute retention job for a policy
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { runRetentionJob } from '@/lib/compliance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;
    const appUser = auth.appUser;

    const body = await request.json();
    const { policyId } = body;

    if (!policyId) {
      return NextResponse.json({ error: 'policyId is required' }, { status: 400 });
    }

    const result = await runRetentionJob(policyId, appUser.user.id);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[admin/compliance/retention/run] POST Error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}