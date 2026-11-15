/**
 * Admin API - Audit Logs
 * Paginated, filterable audit logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import {
  auditLogs,
  auditActionEnum,
  auditResourceTypeEnum,
  auditSeverityEnum,
  users,
  districts,
  schools,
} from '@/db/schema';

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

    // Filters
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const severity = searchParams.get('severity');
    const userId = searchParams.get('userId');
    const districtId = searchParams.get('districtId');
    const schoolId = searchParams.get('schoolId');
    const resourceId = searchParams.get('resourceId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search')?.trim();

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where conditions
    const conditions = [];

    if (action) {
      if (auditActionEnum.enumValues.includes(action as any)) {
        conditions.push(eq(auditLogs.action, action as any)); // store-level: 'delete', 'lti_launch'
      } else {
        conditions.push(sql`${auditLogs.metadata}->>'complianceAction' = ${action}`); // compliance-level: 'lti_platform_deleted'
      }
    }

    if (resourceType && auditResourceTypeEnum.enumValues.includes(resourceType as any)) {
      conditions.push(eq(auditLogs.resourceType, resourceType as any));
    }

    if (severity && auditSeverityEnum.enumValues.includes(severity as any)) {
      conditions.push(eq(auditLogs.severity, severity as any));
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    if (districtId) {
      conditions.push(eq(auditLogs.districtId, districtId));
    }

    if (schoolId) {
      conditions.push(eq(auditLogs.schoolId, schoolId));
    }

    if (resourceId) {
      conditions.push(eq(auditLogs.resourceId, resourceId));
    }

    if (startDate) {
      const date = new Date(startDate);
      if (!isNaN(date.getTime())) {
        conditions.push(gte(auditLogs.createdAt, date));
      }
    }

    if (endDate) {
      const date = new Date(endDate);
      if (!isNaN(date.getTime())) {
        conditions.push(lte(auditLogs.createdAt, date));
      }
    }

    if (search) {
      conditions.push(
        or(
          ilike(auditLogs.description, `%${search}%`),
          ilike(auditLogs.ipAddress, `%${search}%`),
          ilike(auditLogs.requestId, `%${search}%`),
          ilike(auditLogs.sessionId, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ value: total }] = await database
      .select({ value: count() })
      .from(auditLogs)
      .where(whereClause);

    // Determine sort column
    let orderByClause;
    if (sortBy === 'action') {
      orderByClause = sortOrder === 'asc' ? auditLogs.action : desc(auditLogs.action);
    } else if (sortBy === 'resourceType') {
      orderByClause = sortOrder === 'asc' ? auditLogs.resourceType : desc(auditLogs.resourceType);
    } else if (sortBy === 'severity') {
      orderByClause = sortOrder === 'asc' ? auditLogs.severity : desc(auditLogs.severity);
    } else {
      orderByClause = sortOrder === 'asc' ? auditLogs.createdAt : desc(auditLogs.createdAt);
    }

    // Get paginated results with joined user, district, school info
    const data = await database
      .select({
        id: auditLogs.id,
        districtId: auditLogs.districtId,
        districtName: districts.name,
        schoolId: auditLogs.schoolId,
        schoolName: schools.name,
        userId: auditLogs.userId,
        userEmail: users.email,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        impersonatorId: auditLogs.impersonatorId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        severity: auditLogs.severity,
        description: auditLogs.description,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        requestId: auditLogs.requestId,
        sessionId: auditLogs.sessionId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(districts, eq(districts.id, auditLogs.districtId))
      .leftJoin(schools, eq(schools.id, auditLogs.schoolId))
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(whereClause)
      .orderBy(orderByClause)
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
      filters: {
        action,
        resourceType,
        severity,
        userId,
        districtId,
        schoolId,
        resourceId,
        startDate,
        endDate,
        search,
      },
    });
  } catch (error) {
    console.error('[admin/audit] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}