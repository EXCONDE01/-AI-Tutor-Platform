/**
 * Compliance API - Consent Management
 * GET: Get user's consent status
 * POST: Grant/withdraw consent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { getUserConsentStatus, grantConsent, withdrawConsent, getConsentPolicyVersions } from '@/lib/compliance';
import { ConsentType } from '@/lib/compliance/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = authSession.data.user.id;
    const status = await getUserConsentStatus(userId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('[compliance/consent] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = authSession.data.user.id;
    const body = await request.json();
    const { action, consentType, version } = body;

    if (!action || !consentType || !version) {
      return NextResponse.json({ error: 'action, consentType, and version are required' }, { status: 400 });
    }

    // Validate consent type
    const policies = await getConsentPolicyVersions();
    const policy = policies.find(p => p.type === consentType && p.version === version);
    if (!policy) {
      return NextResponse.json({ error: 'Invalid consent type or version' }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (action === 'grant') {
      await grantConsent(userId, consentType as ConsentType, version, ipAddress, userAgent);
      return NextResponse.json({ success: true, message: 'Consent granted' });
    } else if (action === 'withdraw') {
      // For withdraw, we need the consent record ID
      // This is a simplified version - in production, you'd pass the record ID
      return NextResponse.json({ error: 'Withdraw requires consent record ID' }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "grant" or "withdraw"' }, { status: 400 });
    }
  } catch (error) {
    console.error('[compliance/consent] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}