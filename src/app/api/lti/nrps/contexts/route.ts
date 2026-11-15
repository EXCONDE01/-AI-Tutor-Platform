/**
 * GET /api/lti/nrps/contexts
 * Admin-only: list distinct synced contexts with member counts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { db } from '@/lib/db';
import { nrpsCache } from '@/db/schema/lti';
import { eq, count } from 'drizzle-orm';

const CONTEXT_HEADER_USER_ID = '__context_header__';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const headerRows = await db
      .select({
        deploymentId: nrpsCache.deploymentId,
        contextId: nrpsCache.contextId,
        rawData: nrpsCache.rawData,
        lastSyncedAt: nrpsCache.lastSyncedAt,
      })
      .from(nrpsCache)
      .where(eq(nrpsCache.userId, CONTEXT_HEADER_USER_ID));

    const contexts = headerRows.map(r => {
      const rawData = r.rawData as { members?: unknown[]; fetchedAt?: string } | null;
      const memberCount = Array.isArray(rawData?.members) ? rawData.members.length : 0;
      return {
        deploymentId: r.deploymentId,
        contextId: r.contextId,
        memberCount,
        fetchedAt: rawData?.fetchedAt ?? r.lastSyncedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ data: contexts });
  } catch (error) {
    console.error('[GET /api/lti/nrps/contexts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
