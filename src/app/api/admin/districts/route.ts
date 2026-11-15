/**
 * Admin API - Districts
 * List and create districts
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import { districts, schools, districtStatusEnum } from '@/db/schema';

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

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(ilike(districts.name, `%${search}%`));
    }

    if (status && districtStatusEnum.enumValues.includes(status as any)) {
      conditions.push(eq(districts.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ value: total }] = await database
      .select({ value: count() })
      .from(districts)
      .where(whereClause);

    // Get paginated results
    const data = await database
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
      .where(whereClause)
      .orderBy(desc(districts.createdAt))
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
    console.error('[admin/districts] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const database = getDb();
    const body = await request.json();

    const { name, status, settings } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.length > 255) {
      return NextResponse.json({ error: 'Name must be 255 characters or less' }, { status: 400 });
    }

    let validatedStatus = 'pending';
    if (status && districtStatusEnum.enumValues.includes(status)) {
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

    // Create district
    const [newDistrict] = await database
      .insert(districts)
      .values({
        name: name.trim(),
        status: validatedStatus as 'active' | 'inactive' | 'pending',
        settings: validatedSettings,
      })
      .returning();

    return NextResponse.json(newDistrict, { status: 201 });
  } catch (error) {
    console.error('[admin/districts] POST Error:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('districts_name_idx')) {
      return NextResponse.json({ error: 'A district with this name already exists' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}