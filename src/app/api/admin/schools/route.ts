/**
 * Admin API - Schools
 * List and create schools
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import { schools, districts, schoolStatusEnum } from '@/db/schema';

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
    const status = searchParams.get('status');
    const districtId = searchParams.get('districtId');

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(ilike(schools.name, `%${search}%`));
    }

    if (status && schoolStatusEnum.enumValues.includes(status as any)) {
      conditions.push(eq(schools.status, status as any));
    }

    if (districtId) {
      conditions.push(eq(schools.districtId, districtId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ value: total }] = await database
      .select({ value: count() })
      .from(schools)
      .where(whereClause);

    // Get paginated results
    const data = await database
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
      .where(whereClause)
      .orderBy(desc(schools.createdAt))
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
    console.error('[admin/schools] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const database = getDb();
    const body = await request.json();

    const { districtId, name, status, settings, address, phone, email } = body;

    // Validation
    if (!districtId) {
      return NextResponse.json({ error: 'District ID is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.length > 255) {
      return NextResponse.json({ error: 'Name must be 255 characters or less' }, { status: 400 });
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

    let validatedStatus = 'pending';
    if (status && schoolStatusEnum.enumValues.includes(status)) {
      validatedStatus = status;
    }

    let validatedSettings = '{}';
    if (settings) {
      try {
        validatedSettings = JSON.stringify(settings);
      } catch {
        return NextResponse.json({ error: 'Settings must be valid JSON' }, { status: 400 });
      }
    }

    // Create school
    const [newSchool] = await database
      .insert(schools)
      .values({
        districtId,
        name: name.trim(),
        status: validatedStatus as 'active' | 'inactive' | 'pending',
        settings: validatedSettings,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
      })
      .returning();

    // Include district name in response
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
      .where(eq(schools.id, newSchool.id))
      .limit(1);

    return NextResponse.json(schoolWithDistrict, { status: 201 });
  } catch (error) {
    console.error('[admin/schools] POST Error:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('schools_district_name_idx')) {
      return NextResponse.json({ error: 'A school with this name already exists in this district' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}