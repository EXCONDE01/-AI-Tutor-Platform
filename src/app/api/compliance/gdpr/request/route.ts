/**
 * Compliance API - GDPR Data Subject Requests
 * POST: Submit GDPR request (access, erasure, portability, etc.)
 * GET: List user's GDPR requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { submitGdprRequest, processGdprRequest, generateGdprExport } from '@/lib/compliance';
import { GdprRequestType } from '@/lib/compliance/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // In production, query data_deletion_requests table for GDPR requests
    // For now, return empty
    return NextResponse.json({ requests: [] });
  } catch (error) {
    console.error('[compliance/gdpr/request] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { requestType, details, userId } = body;

    if (!requestType || !details) {
      return NextResponse.json({ error: 'requestType and details are required' }, { status: 400 });
    }

    // Validate request type
    const validTypes: GdprRequestType[] = [
      'access', 'rectification', 'erasure', 'restriction',
      'portability', 'objection', 'automated_decision'
    ];

    if (!validTypes.includes(requestType)) {
      return NextResponse.json({ error: 'Invalid requestType' }, { status: 400 });
    }

    // Users can only submit requests for themselves unless admin
    const targetUserId = userId || authSession.data.user.id;
    if (targetUserId !== authSession.data.user.id) {
      // Check if admin
      const isAdmin = authSession.data.user.email === 'christianexconde01@gmail.com';
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized to submit request for another user' }, { status: 403 });
      }
    }

    const requestRecord = await submitGdprRequest(
      { userId: targetUserId, requestType, details, metadata: {} },
      authSession.data.user.id
    );

    return NextResponse.json({ success: true, request: requestRecord }, { status: 201 });
  } catch (error) {
    console.error('[compliance/gdpr/request] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}