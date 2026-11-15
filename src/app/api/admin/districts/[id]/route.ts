/**
 * Admin API - Single District
 * Get, update, delete a district
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import { districts, schools, districtStatusEnum } from '@/db/schema';

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

    const [district] = await database
      .select({
        id: districts.id,
        name: districts.name,
        status: districts.status,
        settings: districts.settings,
        createdAt: districts.createdAt,
        updatedAt: districts.updatedAt,
        schoolsCount: sql<number>`(
          select count(*) from ${schools} where ${schools.districtId} = ${districts.id}
        )`,
      })
      .from(districts)
      .where(eq(districts.id, id))
      .limit(1);

    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    return NextResponse.json(district);
  } catch (error) {
    console.error('[admin/districts/[id]] GET Error:', error);
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

    const { name, status, settings } = body;

    // Validation
    const updates: Record<string, any> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      if (name.length > 255) {
        return NextResponse.json({ error: 'Name must be 255 characters or less' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (status !== undefined) {
      if (!districtStatusEnum.enumValues.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;
    }

    if (settings !== undefined) {
      try {
        updates.settings = JSON.stringify(settings);
      } catch {
        return NextResponse.json({ error: 'Settings must be valid JSON' }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = new Date();

    const [updatedDistrict] = await database
      .update(districts)
      .set(updates)
      .where(eq(districts.id, id))
      .returning();

    if (!updatedDistrict) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    return NextResponse.json(updatedDistrict);
  } catch (error) {
    console.error('[admin/districts/[id]] PATCH Error:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('districts_name_idx')) {
      return NextResponse.json({ error: 'A district with this name already exists' }, { status: 409 });
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

    // Check if district has schools
    const [{ value: schoolsCount }] = await database
      .select({ value: count() })
      .from(schools)
      .where(eq(schools.districtId, id));

    if (Number(schoolsCount) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete district with associated schools. Delete or reassign schools first.' },
        { status: 400 }
      );
    }

    const [deletedDistrict] = await database
      .delete(districts)
      .where(eq(districts.id, id))
      .returning();

    if (!deletedDistrict) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/districts/[id]] DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}