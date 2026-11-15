/**
 * Admin API - Audit Log Export
 * GET: Export audit logs as CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { exportAuditLogs } from '@/lib/compliance/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') as 'json' | 'csv') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const severity = searchParams.get('severity') as 'info' | 'warning' | 'critical' | null;
    const userId = searchParams.get('userId');

    const filters: any = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      actions: action ? [action] : undefined,
      resourceTypes: resourceType ? [resourceType] : undefined,
      severity: severity || undefined,
      userId: userId || undefined,
      limit: 10000,
    };

    const csv = await exportAuditLogs(filters, format);

    if (format === 'csv') {
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[admin/audit/export] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}