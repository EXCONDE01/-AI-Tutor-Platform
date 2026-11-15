/**
 * Admin API - Single Retention Policy
 * Get, update, delete a retention policy
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, sql } from 'drizzle-orm';
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

async function checkAdminAuth(request: NextRequest) {
  const auth = await requireAppRole('admin', request);
  if (!auth.ok) {
    return { error: auth.response.status === 401 ? 'Unauthenticated' : 'Admin access required', status: auth.response.status } as const;
  }
  return { appUser: auth.appUser } as const;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const database = getDb();

    const [policy] = await database
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
      .where(eq(retentionPolicies.id, id))
      .limit(1);

    if (!policy) {
      return NextResponse.json({ error: 'Retention policy not found' }, { status: 404 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('[admin/retention/[id]] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
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
      approvedBy,
    } = body;

    // Validation
    const updates: Record<string, any> = {};

    if (districtId !== undefined) {
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
      updates.districtId = districtId || null;
    }

    if (schoolId !== undefined) {
      if (schoolId) {
        const districtIdForSchool = updates.districtId !== undefined ? updates.districtId : 
          (await database.select({ districtId: retentionPolicies.districtId }).from(retentionPolicies).where(eq(retentionPolicies.id, id)).limit(1))[0]?.districtId;
        
        if (!districtIdForSchool) {
          return NextResponse.json({ error: 'District ID is required when school ID is provided' }, { status: 400 });
        }
        
        const [school] = await database
          .select({ id: schools.id })
          .from(schools)
          .where(and(eq(schools.id, schoolId), eq(schools.districtId, districtIdForSchool)))
          .limit(1);
        if (!school) {
          return NextResponse.json({ error: 'School not found in this district' }, { status: 404 });
        }
      }
      updates.schoolId = schoolId || null;
    }

    if (category !== undefined) {
      if (!retentionCategoryEnum.enumValues.includes(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      updates.category = category;
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        return NextResponse.json({ error: 'Description cannot be empty' }, { status: 400 });
      }
      updates.description = description.trim();
    }

    if (retentionDays !== undefined) {
      if (!Number.isInteger(retentionDays) || retentionDays < 0) {
        return NextResponse.json({ error: 'Retention days must be a non-negative integer' }, { status: 400 });
      }
      updates.retentionDays = retentionDays;
    }

    if (deleteAfterDays !== undefined) {
      if (!Number.isInteger(deleteAfterDays) || deleteAfterDays < 0) {
        return NextResponse.json({ error: 'Delete after days must be a non-negative integer' }, { status: 400 });
      }
      updates.deleteAfterDays = deleteAfterDays;
    }

    // Validate retentionDays <= deleteAfterDays if both provided
    const currentPolicy = await database
      .select({ retentionDays: retentionPolicies.retentionDays, deleteAfterDays: retentionPolicies.deleteAfterDays })
      .from(retentionPolicies)
      .where(eq(retentionPolicies.id, id))
      .limit(1);

    if (currentPolicy.length > 0) {
      const newRetentionDays = updates.retentionDays ?? currentPolicy[0].retentionDays;
      const newDeleteAfterDays = updates.deleteAfterDays ?? currentPolicy[0].deleteAfterDays;
      if (newRetentionDays > newDeleteAfterDays) {
        return NextResponse.json({ error: 'Retention days cannot exceed delete after days' }, { status: 400 });
      }
    }

    if (archiveAfterDays !== undefined) {
      if (archiveAfterDays !== null && (!Number.isInteger(archiveAfterDays) || archiveAfterDays < 0)) {
        return NextResponse.json({ error: 'Archive after days must be a non-negative integer' }, { status: 400 });
      }
      if (archiveAfterDays !== null) {
        const newDeleteAfterDays = updates.deleteAfterDays ?? currentPolicy[0]?.deleteAfterDays;
        if (newDeleteAfterDays && archiveAfterDays > newDeleteAfterDays) {
          return NextResponse.json({ error: 'Archive after days cannot exceed delete after days' }, { status: 400 });
        }
      }
      updates.archiveAfterDays = archiveAfterDays;
    }

    if (legalBasis !== undefined) {
      updates.legalBasis = legalBasis?.trim() || null;
    }

    if (appliesTo !== undefined) {
      updates.appliesTo = appliesTo || {};
    }

    if (exceptions !== undefined) {
      updates.exceptions = exceptions || [];
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    if (priority !== undefined) {
      if (!Number.isInteger(priority)) {
        return NextResponse.json({ error: 'Priority must be an integer' }, { status: 400 });
      }
      updates.priority = priority;
    }

    if (effectiveFrom !== undefined) {
      updates.effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : null;
    }

    if (effectiveUntil !== undefined) {
      updates.effectiveUntil = effectiveUntil ? new Date(effectiveUntil) : null;
    }

    if (metadata !== undefined) {
      updates.metadata = metadata || {};
    }

    if (approvedBy !== undefined) {
      if (approvedBy) {
        const [approver] = await database
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, approvedBy))
          .limit(1);
        if (!approver) {
          return NextResponse.json({ error: 'Approver user not found' }, { status: 404 });
        }
        updates.approvedBy = approvedBy;
        updates.approvedAt = new Date();
      } else {
        updates.approvedBy = null;
        updates.approvedAt = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = new Date();

    const [updatedPolicy] = await database
      .update(retentionPolicies)
      .set(updates)
      .where(eq(retentionPolicies.id, id))
      .returning();

    if (!updatedPolicy) {
      return NextResponse.json({ error: 'Retention policy not found' }, { status: 404 });
    }

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
      .where(eq(retentionPolicies.id, updatedPolicy.id))
      .limit(1);

    return NextResponse.json(policyWithInfo);
  } catch (error) {
    console.error('[admin/retention/[id]] PATCH Error:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('retention_policies_unique_idx')) {
      return NextResponse.json({ error: 'A retention policy for this category already exists at this scope' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const database = getDb();

    const [deletedPolicy] = await database
      .delete(retentionPolicies)
      .where(eq(retentionPolicies.id, id))
      .returning();

    if (!deletedPolicy) {
      return NextResponse.json({ error: 'Retention policy not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/retention/[id]] DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}