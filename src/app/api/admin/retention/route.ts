/**
 * Admin API - Retention Policies
 * List and create retention policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import {
  retentionPolicies,
  retentionCategoryEnum,
  districts,
  schools,
  users,
} from '@/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

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

    const database = getDb();
    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');
    const districtId = searchParams.get('districtId');
    const schoolId = searchParams.get('schoolId');
    const isActive = searchParams.get('isActive');

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(retentionPolicies.description, `%${search}%`),
          ilike(retentionPolicies.legalBasis, `%${search}%`)
        )
      );
    }

    if (category && retentionCategoryEnum.enumValues.includes(category as any)) {
      conditions.push(eq(retentionPolicies.category, category as any));
    }

    if (districtId) {
      conditions.push(eq(retentionPolicies.districtId, districtId));
    }

    if (schoolId) {
      conditions.push(eq(retentionPolicies.schoolId, schoolId));
    }

    if (isActive !== null && isActive !== undefined) {
      conditions.push(eq(retentionPolicies.isActive, isActive === 'true'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ value: total }] = await database
      .select({ value: count() })
      .from(retentionPolicies)
      .where(whereClause);

    // Get paginated results with joined info
    const data = await database
      .select({
        id: retentionPolicies.id,
        districtId: retentionPolicies.districtId,
        districtName: districts.name,
        schoolId: retentionPolicies.schoolId,
        schoolName: schools.name,
        category: retentionPolicies.category,
        description: retentionPolicies.description,
        retentionDays: retentionPolicies.retentionDays,
        archiveAfterDays: retentionPolicies.archiveAfterDays,
        deleteAfterDays: retentionPolicies.deleteAfterDays,
        legalBasis: retentionPolicies.legalBasis,
        appliesTo: retentionPolicies.appliesTo,
        exceptions: retentionPolicies.exceptions,
        isActive: retentionPolicies.isActive,
        priority: retentionPolicies.priority,
        createdBy: retentionPolicies.createdBy,
        createdByName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        approvedBy: retentionPolicies.approvedBy,
        approvedAt: retentionPolicies.approvedAt,
        effectiveFrom: retentionPolicies.effectiveFrom,
        effectiveUntil: retentionPolicies.effectiveUntil,
        metadata: retentionPolicies.metadata,
        createdAt: retentionPolicies.createdAt,
        updatedAt: retentionPolicies.updatedAt,
      })
      .from(retentionPolicies)
      .leftJoin(districts, eq(districts.id, retentionPolicies.districtId))
      .leftJoin(schools, eq(schools.id, retentionPolicies.schoolId))
      .leftJoin(users, eq(users.id, retentionPolicies.createdBy))
      .where(whereClause)
      .orderBy(desc(retentionPolicies.createdAt))
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
    console.error('[admin/retention] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;
    const appUser = auth.appUser;

    const database = getDb();
    const body = await request.json();

    const {
      districtId,
      schoolId,
      category,
      description,
      retentionDays,
      archiveAfterDays,
      deleteAfterDays,
      legalBasis,
      appliesTo,
      exceptions,
      isActive,
      priority,
      effectiveFrom,
      effectiveUntil,
      metadata,
    } = body;

    // Validation
    if (!category || !retentionCategoryEnum.enumValues.includes(category)) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (retentionDays === undefined || retentionDays === null || !Number.isInteger(retentionDays) || retentionDays < 0) {
      return NextResponse.json({ error: 'Retention days must be a non-negative integer' }, { status: 400 });
    }

    if (deleteAfterDays === undefined || deleteAfterDays === null || !Number.isInteger(deleteAfterDays) || deleteAfterDays < 0) {
      return NextResponse.json({ error: 'Delete after days must be a non-negative integer' }, { status: 400 });
    }

    if (retentionDays > deleteAfterDays) {
      return NextResponse.json({ error: 'Retention days cannot exceed delete after days' }, { status: 400 });
    }

    if (archiveAfterDays !== undefined && archiveAfterDays !== null) {
      if (!Number.isInteger(archiveAfterDays) || archiveAfterDays < 0) {
        return NextResponse.json({ error: 'Archive after days must be a non-negative integer' }, { status: 400 });
      }
      if (archiveAfterDays > deleteAfterDays) {
        return NextResponse.json({ error: 'Archive after days cannot exceed delete after days' }, { status: 400 });
      }
    }

    // Validate district if provided
    if (districtId) {
      const [district] = await database
        .select({ id: districts.id })
        .from(districts)
        .where(eq(districts.id, districtId))
        .limit(1);
      if (!district) {
        return NextResponse.json({ error: 'District not found' }, { status: 404 });
      }
    }

    // Validate school if provided
    if (schoolId) {
      if (!districtId) {
        return NextResponse.json({ error: 'District ID is required when school ID is provided' }, { status: 400 });
      }
      const [school] = await database
        .select({ id: schools.id })
        .from(schools)
        .where(and(eq(schools.id, schoolId), eq(schools.districtId, districtId)))
        .limit(1);
      if (!school) {
        return NextResponse.json({ error: 'School not found in this district' }, { status: 404 });
      }
    }

    // Create retention policy
    const [newPolicy] = await database
      .insert(retentionPolicies)
      .values({
        districtId: districtId || null,
        schoolId: schoolId || null,
        category,
        description: description.trim(),
        retentionDays,
        archiveAfterDays: archiveAfterDays || null,
        deleteAfterDays,
        legalBasis: legalBasis?.trim() || null,
        appliesTo: appliesTo || {},
        exceptions: exceptions || [],
        isActive: isActive !== false,
        priority: priority || 0,
        createdBy: appUser.user.id,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        metadata: metadata || {},
      })
      .returning();

    // Return with joined info
    const [policyWithInfo] = await database
      .select({
        id: retentionPolicies.id,
        districtId: retentionPolicies.districtId,
        districtName: districts.name,
        schoolId: retentionPolicies.schoolId,
        schoolName: schools.name,
        category: retentionPolicies.category,
        description: retentionPolicies.description,
        retentionDays: retentionPolicies.retentionDays,
        archiveAfterDays: retentionPolicies.archiveAfterDays,
        deleteAfterDays: retentionPolicies.deleteAfterDays,
        legalBasis: retentionPolicies.legalBasis,
        appliesTo: retentionPolicies.appliesTo,
        exceptions: retentionPolicies.exceptions,
        isActive: retentionPolicies.isActive,
        priority: retentionPolicies.priority,
        createdBy: retentionPolicies.createdBy,
        createdByName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        approvedBy: retentionPolicies.approvedBy,
        approvedAt: retentionPolicies.approvedAt,
        effectiveFrom: retentionPolicies.effectiveFrom,
        effectiveUntil: retentionPolicies.effectiveUntil,
        metadata: retentionPolicies.metadata,
        createdAt: retentionPolicies.createdAt,
        updatedAt: retentionPolicies.updatedAt,
      })
      .from(retentionPolicies)
      .leftJoin(districts, eq(districts.id, retentionPolicies.districtId))
      .leftJoin(schools, eq(schools.id, retentionPolicies.schoolId))
      .leftJoin(users, eq(users.id, retentionPolicies.createdBy))
      .where(eq(retentionPolicies.id, newPolicy.id))
      .limit(1);

    return NextResponse.json(policyWithInfo, { status: 201 });
  } catch (error) {
    console.error('[admin/retention] POST Error:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('retention_policies_unique_idx')) {
      return NextResponse.json({ error: 'A retention policy for this category already exists at this scope' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}