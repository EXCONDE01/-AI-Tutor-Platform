/**
 * Compliance API - COPPA Parental Consent
 * POST: Request parental consent for student under 13
 * GET: Check COPPA requirements for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { checkCoppaRequirement, requestParentalConsent, processParentalConsent, getStudentConsents } from '@/lib/compliance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // Check COPPA requirement
    const requirement = await checkCoppaRequirement(studentId);

    // Get existing consents
    const consents = await getStudentConsents(studentId);

    return NextResponse.json({
      studentId,
      requiresParentalConsent: requirement.requiresConsent,
      age: requirement.age,
      dateOfBirth: requirement.dateOfBirth,
      consents,
    });
  } catch (error) {
    console.error('[compliance/coppa] GET Error:', error);
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
    const { studentId, consentTypes, method } = body;

    if (!studentId || !consentTypes || !Array.isArray(consentTypes) || !method) {
      return NextResponse.json({ error: 'studentId, consentTypes (array), and method are required' }, { status: 400 });
    }

    // Verify the user is a parent of this student
    // In production, check the student_parents relationship
    const parentId = authSession.data.user.id;

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const records = await requestParentalConsent(
      { studentId, parentId, consentTypes, method, ipAddress, userAgent },
      parentId
    );

    return NextResponse.json({ success: true, records }, { status: 201 });
  } catch (error) {
    console.error('[compliance/coppa] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}