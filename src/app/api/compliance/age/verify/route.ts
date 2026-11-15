/**
 * Compliance API - Age Verification
 * POST: Verify user's age (for COPPA compliance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { verifyAge } from '@/lib/compliance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { dateOfBirth, method } = body;

    if (!dateOfBirth) {
      return NextResponse.json({ error: 'dateOfBirth is required' }, { status: 400 });
    }

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json({ error: 'Invalid dateOfBirth format' }, { status: 400 });
    }

    // Users can only verify their own age unless admin
    const targetUserId = authSession.data.user.id;
    // In production, allow admins to verify ages for students

    const result = await verifyAge(targetUserId, dob, method || 'self_reported');

    return NextResponse.json({ success: true, verification: result });
  } catch (error) {
    console.error('[compliance/age/verify] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}