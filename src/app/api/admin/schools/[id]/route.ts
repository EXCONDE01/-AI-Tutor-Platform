/**
 * Admin API - Single School
 * Get, update, delete a school
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import { schools, districts, schoolStatusEnum } from '@/db/schema';

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

    const [school] = await database
      .select({
        id: schools.id,
        districtId: schools.districtId,
        districtName: districts.name,
        name: schools.name,
        status: schools.status,
        settings: schools.settings,
        address: schools.address,
        phone: schools.phone,
        email: schools.email,
        createdAt: schools.createdAt,
        updatedAt: schools.updatedAt,
      })
      .from(schools)
      .leftJoin(districts, eq(districts.id, schools.districtId))
      .where(eq(schools.id, id))
      .limit(1);

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error('[admin/schools/[id]] GET Error:', error);
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

    const { districtId, name, status, settings, address, phone, email } = body;

    // Validation
    const updates: Record<string, any> = {};

    if (districtId !== undefined) {
      if (!districtId) {
        return NextResponse.json({ error: 'District ID cannot be empty' }, { status: 400 });
      }
      // Verify district exists
      const [district] = await database
        .select({ id: districts.id })
        .from(districts)
        .where(eq(districts.id, districtId))
        .limit(1);
      if (!district) {
        return NextResponse.json({ error: 'District not found' }, { status: 404 });
      }
      updates.districtId = districtId;
    }

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
      if (!schoolStatusEnum.enumValues.includes(status)) {
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

    if (address !== undefined) {
      updates.address = address?.trim() || null;
    }

    if (phone !== undefined) {
      updates.phone = phone?.trim() || null;
    }

    if (email !== undefined) {
      updates.email = email?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = new Date();

    const [updatedSchool] = await database
      .update(schools)
      .set(updates)
      .where(eq(schools.id, id))
      .returning();

    if (!updatedSchool) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Return with district name
    const [schoolWithDistrict] = await database
      .select({
        id: schools.id,
        districtId: schools.districtId,
        districtName: districts.name,
        name: schools.name,
        status: schools.status,
        settings: schools.settings,
        address: schools.address,
        phone: schools.phone,
        email: schools.email,
        createdAt: schools.createdAt,
        updatedAt: schools.updatedAt,
      })
      .from(schools)
      .leftJoin(districts, eq(districts.id, schools.districtId))
      .where(eq(schools.id, updatedSchool.id))
      .limit(1);

    return NextResponse.json(schoolWithDistrict);
  } catch (error) {
    console.error('[admin/schools/[id]] PATCH Error:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('schools_district_name_idx')) {
      return NextResponse.json({ error: 'A school with this name already exists in this district' }, { status: 409 });
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

    const [deletedSchool] = await database
      .delete(schools)
      .where(eq(schools.id, id))
      .returning();

    if (!deletedSchool) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/schools/[id]] DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}