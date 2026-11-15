/**
 * Admin API - Audit Log Statistics
 * GET: Get compliance audit statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getComplianceAuditStats } from '@/lib/compliance/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30;

    const stats = await getComplianceAuditStats(undefined, undefined, days);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[admin/audit/stats] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}