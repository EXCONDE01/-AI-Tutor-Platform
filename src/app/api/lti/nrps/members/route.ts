/**
 * GET /api/lti/nrps/members
 * Admin-only: list synced NRPS members from nrps_cache.
 * Query: platformId?, deploymentId?, contextId?, role?, page, pageSize
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { db } from '@/lib/db';
import { nrpsCache } from '@/db/schema/lti';
import { eq, and, desc } from 'drizzle-orm';
import { uuidSchema } from '@/lib/lti/validation';

const membersSchema = z.object({
  platformId: z.string().uuid().optional(),
  deploymentId: z.string().uuid().optional(),
  contextId: z.string().optional(),
  role: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
});

const CONTEXT_HEADER_USER_ID = '__context_header__';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const parsed = membersSchema.safeParse({
      platformId: searchParams.get('platformId') || undefined,
      deploymentId: searchParams.get('deploymentId') || undefined,
      contextId: searchParams.get('contextId') || undefined,
      role: searchParams.get('role') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const { platformId, deploymentId, contextId, role, page, pageSize } = parsed.data;

    const conditions = [];

    if (deploymentId) {
      conditions.push(eq(nrpsCache.deploymentId, deploymentId));
    }
    if (contextId) {
      conditions.push(eq(nrpsCache.contextId, contextId));
    }

    let rows = await db
      .select()
      .from(nrpsCache)
      .where(and(...conditions))
      .orderBy(desc(nrpsCache.lastSyncedAt));

    // Exclude context-header rows
    rows = rows.filter(r => r.userId !== CONTEXT_HEADER_USER_ID);

    // Filter by platformId (nrps_cache has no platformId; resolve via deployments)
    let deploymentIds: string[] = [];
    if (platformId) {
      const { getDeploymentsByPlatform } = await import('@/lib/lti/platform');
      const deployments = await getDeploymentsByPlatform(platformId);
      deploymentIds = deployments.map(d => d.id);
      rows = rows.filter(r => deploymentIds.includes(r.deploymentId));
    }

    if (role) {
      rows = rows.filter(r => Array.isArray(r.roles) && r.roles.includes(role as any));
    }

    const total = rows.length;
    const offset = (page - 1) * pageSize;
    const data = rows.slice(offset, offset + pageSize).map(r => ({
      id: r.id,
      deploymentId: r.deploymentId,
      contextId: r.contextId,
      userId: r.userId,
      roles: r.roles,
      lisPersonSourcedId: r.lisPersonSourcedId,
      lisPersonNameGiven: r.lisPersonNameGiven,
      lisPersonNameFamily: r.lisPersonNameFamily,
      lisPersonNameFull: r.lisPersonNameFull,
      lisPersonEmail: r.lisPersonEmail,
      userImage: r.userImage,
      status: r.status,
      membershipId: r.membershipId,
      rawData: r.rawData,
      lastSyncedAt: r.lastSyncedAt,
      expiresAt: r.expiresAt,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[GET /api/lti/nrps/members]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
