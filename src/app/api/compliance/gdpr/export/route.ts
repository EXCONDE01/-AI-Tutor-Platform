/**
 * Compliance API - GDPR Data Export (Portability)
 * POST: Generate data export for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { generateGdprExport } from '@/lib/compliance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { format, includeTables, dateRange, userId } = body;

    if (!format || !includeTables || !Array.isArray(includeTables)) {
      return NextResponse.json({ error: 'format and includeTables (array) are required' }, { status: 400 });
    }

    // Users can only export their own data unless admin
    const targetUserId = userId || authSession.data.user.id;
    if (targetUserId !== authSession.data.user.id) {
      const isAdmin = authSession.data.user.email === 'christianexconde01@gmail.com';
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized to export data for another user' }, { status: 403 });
      }
    }

    const exportRecord = await generateGdprExport(
      targetUserId,
      format,
      includeTables,
      dateRange ? { from: new Date(dateRange.from), to: new Date(dateRange.to) } : undefined
    );

    return NextResponse.json({ success: true, export: exportRecord }, { status: 201 });
  } catch (error) {
    console.error('[compliance/gdpr/export] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}