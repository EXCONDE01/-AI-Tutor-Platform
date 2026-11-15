/**
 * Parent consent API endpoint.
 * GET: Fetch consent records for parent's children
 * POST: Create consent records for a child
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import {
  consentRecords,
  parents,
  studentParents,
  students,
  users,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Required consent types for platform access
const REQUIRED_CONSENT_TYPES = [
  'parental_consent',
  'coppa_consent',
  'ferpa_consent',
] as const;

type RequiredConsentType = (typeof REQUIRED_CONSENT_TYPES)[number];

interface ConsentRecordResponse {
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  status: string;
  version: string;
  policyUrl: string | null;
  grantedAt: string | null;
  withdrawnAt: string | null;
  expiresAt: string | null;
}

// Type for the consent type enum from the schema
type ConsentType = 
  | 'terms_of_service'
  | 'privacy_policy'
  | 'data_processing'
  | 'ai_interaction'
  | 'data_sharing'
  | 'marketing'
  | 'analytics'
  | 'third_party_services'
  | 'parental_consent'
  | 'ferpa_consent'
  | 'coppa_consent'
  | 'gdpr_consent'
  | 'state_privacy_law'
  | 'custom';

interface CreateConsentBody {
  childId: string;
  consentType: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') ?? 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('parent', request);
    if (!appUser || appUser.role !== 'parent') {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const database = getDb();

    // Get parent record for the authenticated user
    const [parentRow] = await database
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.userId, appUser.user.id))
      .limit(1);

    if (!parentRow) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    // Fetch consent records for all children linked to this parent
    const consentData = await database
      .select({
        id: consentRecords.id,
        studentId: consentRecords.studentId,
        studentFirstName: users.firstName,
        studentLastName: users.lastName,
        studentDisplayName: users.displayName,
        type: consentRecords.type,
        status: consentRecords.status,
        version: consentRecords.version,
        policyUrl: consentRecords.policyUrl,
        grantedAt: consentRecords.grantedAt,
        withdrawnAt: consentRecords.withdrawnAt,
        expiresAt: consentRecords.expiresAt,
      })
      .from(consentRecords)
      .innerJoin(students, eq(students.id, consentRecords.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .innerJoin(studentParents, eq(studentParents.studentId, students.id))
      .where(eq(studentParents.parentId, parentRow.id))
      .orderBy(consentRecords.createdAt);

    const consentRecordsResponse: ConsentRecordResponse[] = consentData.map((record) => ({
      id: record.id,
      studentId: record.studentId ?? '',
      studentName:
        `${record.studentFirstName ?? ''} ${record.studentLastName ?? ''}`.trim() ||
        record.studentDisplayName ||
        'Unknown Student',
      type: record.type,
      status: record.status,
      version: record.version,
      policyUrl: record.policyUrl,
      grantedAt: record.grantedAt?.toISOString() ?? null,
      withdrawnAt: record.withdrawnAt?.toISOString() ?? null,
      expiresAt: record.expiresAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ consentRecords: consentRecordsResponse });
  } catch (error) {
    console.error('[parent/consent GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('parent', request);
    if (!appUser || appUser.role !== 'parent') {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const database = getDb();

    // Get parent record for the authenticated user
    const [parentRow] = await database
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.userId, appUser.user.id))
      .limit(1);

    if (!parentRow) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    // Parse and validate request body
    let body: CreateConsentBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { childId, consentType, granted, ipAddress, userAgent } = body;

    // Validate required fields
    if (!childId || !consentType || typeof granted !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: childId, consentType, granted' },
        { status: 400 }
      );
    }

    // Validate consent type
    const validConsentTypes = [
      'parental_consent',
      'coppa_consent',
      'ferpa_consent',
      'gdpr_consent',
      'marketing_consent',
      'terms_of_service',
      'privacy_policy',
      'data_processing',
      'ai_interaction',
      'data_sharing',
      'analytics',
      'third_party_services',
      'state_privacy_law',
      'custom',
    ];

    if (!validConsentTypes.includes(consentType)) {
      return NextResponse.json(
        { error: `Invalid consent type. Valid types: ${validConsentTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify the child belongs to this parent
    const [childLink] = await database
      .select({ studentId: studentParents.studentId })
      .from(studentParents)
      .where(
        and(
          eq(studentParents.parentId, parentRow.id),
          eq(studentParents.studentId, childId)
        )
      )
      .limit(1);

    if (!childLink) {
      return NextResponse.json(
        { error: 'Child not found or not linked to this parent' },
        { status: 404 }
      );
    }

    // Get student's user record for userId
    const [studentRow] = await database
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.id, childId))
      .limit(1);

    if (!studentRow) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Determine status based on granted
    const status = granted ? 'granted' : 'denied';
    const now = new Date();

    // Check for existing consent record of this type for this student
    const [existingConsent] = await database
      .select({ id: consentRecords.id, version: consentRecords.version })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.studentId, childId),
          eq(consentRecords.type, consentType as ConsentType)
        )
      )
      .limit(1);

    // Policy version (in production, this would come from a config or database)
    const policyVersion = '1.0.0';
    const policyUrl = `https://ai-tutor.com/policies/${consentType.replace(/_/g, '-')}`;

    let result;

    if (existingConsent) {
      // Update existing consent record
      result = await database
        .update(consentRecords)
        .set({
          status,
          version: policyVersion,
          policyUrl,
          ipAddress: ipAddress ?? getClientIp(request),
          userAgent: userAgent ?? getUserAgent(request),
          grantedAt: granted ? now : null,
          withdrawnAt: !granted ? now : null,
          updatedAt: now,
        })
        .where(eq(consentRecords.id, existingConsent.id))
        .returning();
    } else {
      // Insert new consent record
      result = await database
        .insert(consentRecords)
        .values({
          studentId: childId,
          userId: studentRow.userId, // Parent's user ID who is giving consent
          type: consentType as ConsentType,
          status,
          version: policyVersion,
          policyUrl,
          ipAddress: ipAddress ?? getClientIp(request),
          userAgent: userAgent ?? getUserAgent(request),
          grantedAt: granted ? now : null,
          withdrawnAt: !granted ? now : null,
        })
        .returning();
    }

    const createdConsent = result[0];

    // Return the created/updated consent record with student info
    const [studentInfo] = await database
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, studentRow.userId))
      .limit(1);

    return NextResponse.json({
      consentRecord: {
        id: createdConsent.id,
        studentId: childId,
        studentName:
          `${studentInfo?.firstName ?? ''} ${studentInfo?.lastName ?? ''}`.trim() ||
          studentInfo?.displayName ||
          'Unknown Student',
        type: createdConsent.type,
        status: createdConsent.status,
        version: createdConsent.version,
        policyUrl: createdConsent.policyUrl,
        grantedAt: createdConsent.grantedAt?.toISOString() ?? null,
        withdrawnAt: createdConsent.withdrawnAt?.toISOString() ?? null,
        expiresAt: createdConsent.expiresAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('[parent/consent POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}