/**
 * Compliance API - FERPA Directory Information Opt-Out
 * POST: Submit opt-out request
 * GET: Check if directory field can be disclosed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { submitFerpaOptOut, checkFerpaDirectoryDisclosure } from '@/lib/compliance';
import { FerpaDirectoryField } from '@/lib/compliance/types';

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
    const field = searchParams.get('field') as FerpaDirectoryField;

    if (!studentId || !field) {
      return NextResponse.json({ error: 'studentId and field are required' }, { status: 400 });
    }

    const canDisclose = await checkFerpaDirectoryDisclosure(studentId, field);

    return NextResponse.json({ studentId, field, canDisclose });
  } catch (error) {
    console.error('[compliance/ferpa/optout] GET Error:', error);
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
    const { studentId, fields, reason, effectiveFrom, effectiveUntil } = body;

    if (!studentId || !fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ error: 'studentId and fields (non-empty array) are required' }, { status: 400 });
    }

    // Validate fields
    const validFields: FerpaDirectoryField[] = [
      'name', 'address', 'phone', 'email', 'date_of_birth', 'place_of_birth',
      'major', 'enrollment_status', 'dates_of_attendance', 'grade_level',
      'participation_in_activities', 'weight_height_athletes', 'degrees_awards',
      'most_recent_school', 'photo', 'custom'
    ];

    const invalidFields = fields.filter(f => !validFields.includes(f));
    if (invalidFields.length > 0) {
      return NextResponse.json({ error: `Invalid fields: ${invalidFields.join(', ')}` }, { status: 400 });
    }

    const requestedBy = authSession.data.user.id;

    const optOut = await submitFerpaOptOut(
      {
        studentId,
        requestedBy,
        fields,
        reason,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined,
        metadata: {},
      },
      requestedBy
    );

    return NextResponse.json({ success: true, optOut }, { status: 201 });
  } catch (error) {
    console.error('[compliance/ferpa/optout] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}