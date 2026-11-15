/**
 * Compliance API - COPPA Parental Consent Response
 * POST: Process parental consent response (grant/deny)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { processParentalConsent } from '@/lib/compliance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { consentRecordId, granted } = body;

    if (!consentRecordId || granted === undefined) {
      return NextResponse.json({ error: 'consentRecordId and granted are required' }, { status: 400 });
    }

    const parentId = authSession.data.user.id;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const record = await processParentalConsent(consentRecordId, parentId, granted, ipAddress, userAgent);

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('[compliance/coppa/respond] POST Error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}