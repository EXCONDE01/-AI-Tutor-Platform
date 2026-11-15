/**
 * Admin API - Consent Records Management
 * GET: List consent records with filters
 * PATCH: Update consent record (approve/deny opt-outs, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import { eq, and, desc, count, or, ilike, gte, lte, sql } from 'drizzle-orm';
import { consentRecords, users, students, districts, schools } from '@/db/schema';
import { processFerpaOptOut } from '@/lib/compliance';
import { consentTypeEnum } from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10))
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;
    const appUser = auth.appUser;

    const database = getDb();
    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const studentId = searchParams.get('studentId');
    const districtId = searchParams.get('districtId');
    const schoolId = searchParams.get('schoolId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search')?.trim();

    const conditions = [];

    if (type) {
      conditions.push(eq(consentRecords.type, type as any));
    }

    if (status) {
      conditions.push(eq(consentRecords.status, status as any));
    }

    if (userId) {
      conditions.push(eq(consentRecords.userId, userId));
    }

    if (studentId) {
      conditions.push(eq(consentRecords.studentId, studentId));
    }

    if (districtId) {
      conditions.push(eq(consentRecords.districtId, districtId));
    }

    if (schoolId) {
      conditions.push(eq(consentRecords.schoolId, schoolId));
    }

    if (startDate) {
      const date = new Date(startDate);
      if (!isNaN(date.getTime())) {
        conditions.push(gte(consentRecords.createdAt, date));
      }
    }

    if (endDate) {
      const date = new Date(endDate);
      if (!isNaN(date.getTime())) {
        conditions.push(lte(consentRecords.createdAt, date));
      }
    }

    if (search) {
      conditions.push(
        or(
          ilike(consentRecords.consentText, `%${search}%`),
          ilike(consentRecords.policyUrl, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await database
      .select({ value: count() })
      .from(consentRecords)
      .where(whereClause);

    // Need to join users table twice - once for the user, once for the student's user
    // Since students table only has userId, we need to join users again for student info
    const studentUsers = users; // alias
    
    const data = await database
      .select({
        id: consentRecords.id,
        districtId: consentRecords.districtId,
        districtName: districts.name,
        schoolId: consentRecords.schoolId,
        schoolName: schools.name,
        userId: consentRecords.userId,
        userEmail: users.email,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        studentId: consentRecords.studentId,
        studentName: sql<string>`${studentUsers.firstName} || ' ' || ${studentUsers.lastName}`,
        type: consentRecords.type,
        status: consentRecords.status,
        version: consentRecords.version,
        policyUrl: consentRecords.policyUrl,
        consentText: consentRecords.consentText,
        ipAddress: consentRecords.ipAddress,
        userAgent: consentRecords.userAgent,
        witnessId: consentRecords.witnessId,
        grantedAt: consentRecords.grantedAt,
        withdrawnAt: consentRecords.withdrawnAt,
        expiresAt: consentRecords.expiresAt,
        metadata: consentRecords.metadata,
        createdAt: consentRecords.createdAt,
        updatedAt: consentRecords.updatedAt,
      })
      .from(consentRecords)
      .leftJoin(districts, eq(districts.id, consentRecords.districtId))
      .leftJoin(schools, eq(schools.id, consentRecords.schoolId))
      .leftJoin(users, eq(users.id, consentRecords.userId))
      .leftJoin(students, eq(students.id, consentRecords.studentId))
      .leftJoin(studentUsers, eq(studentUsers.id, students.userId))
      .where(whereClause)
      .orderBy(desc(consentRecords.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error('[admin/compliance/consent] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;
    const appUser = auth.appUser;

    const body = await request.json();
    const { recordId, action, reason } = body;

    if (!recordId || !action) {
      return NextResponse.json({ error: 'recordId and action are required' }, { status: 400 });
    }

    if (action === 'approve_ferpa_optout' || action === 'deny_ferpa_optout') {
      const approved = action === 'approve_ferpa_optout';
      const optOut = await processFerpaOptOut(recordId, appUser.user.id, approved, reason);
      return NextResponse.json({ success: true, optOut });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[admin/compliance/consent] PATCH Error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}