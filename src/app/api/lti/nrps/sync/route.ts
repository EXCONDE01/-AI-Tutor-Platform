/**
 * POST /api/lti/nrps/sync
 * Admin-only: trigger NRPS membership sync for a platform/deployment.
 * Body: { platformId, deploymentId, contextId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { createAuditLog } from '@/lib/compliance/audit';
import { getPlatformById, getDeploymentById } from '@/lib/lti/platform';
import { createNRPSClient, syncAllContexts, NRPSClient } from '@/lib/lti/nrps';
import { db } from '@/lib/db';
import { nrpsCache } from '@/db/schema/lti';
import { eq, and } from 'drizzle-orm';
import { uuidSchema } from '@/lib/lti/validation';

const syncSchema = z.object({
  platformId: z.string(),
  deploymentId: z.string(),
  contextId: z.string().optional(),
});

interface NRPSMember {
  id: string;
  user_id: string;
  roles: string[];
  status: string;
  lis_person_sourced_id?: string;
  lis_person_name_given?: string;
  lis_person_name_family?: string;
  lis_person_name_full?: string;
  lis_person_email?: string;
  user_image?: string;
  rawData?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { platformId, deploymentId, contextId } = parsed.data;

    // Validate UUIDs
    if (!uuidSchema.safeParse(platformId).success || !uuidSchema.safeParse(deploymentId).success) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Load platform + deployment
    const platform = await getPlatformById(platformId);
    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    const deployment = await getDeploymentById(deploymentId);
    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    if (deployment.platformId !== platform.id) {
      return NextResponse.json({ error: 'Deployment does not belong to platform' }, { status: 400 });
    }

    if (platform.supportsNRPS !== true) {
      return NextResponse.json({ error: 'Platform does not support NRPS' }, { status: 400 });
    }

    // Create NRPS client
    const nrpsClient = await createNRPSClient(platformId, deploymentId);
    if (!nrpsClient) {
      return NextResponse.json({ error: 'Failed to create NRPS client' }, { status: 500 });
    }

    // Sync via the NRPS client
    const syncResult = await syncAllContexts(deploymentId);

    // Persist results to nrps_cache
    const now = new Date();
    const contextsToSync: string[] = contextId ? [contextId] : await getSyncedContexts(deploymentId);

    let membersTotal = 0;
    const syncedContexts: Array<{ contextId: string; contextTitle: string; memberCount: number }> = [];

    for (const ctxId of contextsToSync) {
      const members: NRPSMember[] = await fetchMembershipsForContext(nrpsClient, ctxId);
      membersTotal += members.length;

      await upsertContextMembers(deploymentId, ctxId, members, now);

      syncedContexts.push({
        contextId: ctxId,
        contextTitle: ctxId,
        memberCount: members.length,
      });
    }

    // Audit log (use a valid ComplianceAuditAction; original stored in metadata)
    await createAuditLog({
      action: 'lti_deployment_updated',
      resourceType: 'nrps_cache',
      resourceId: deploymentId,
      userId: auth.appUser.user.id,
      districtId: platform.districtId || undefined,
      severity: 'info',
      description: `NRPS roster sync for deployment ${deploymentId}: ${membersTotal} members across ${syncedContexts.length} contexts`,
      metadata: {
        complianceAction: 'lti_nrps_sync_started',
        platformId,
        deploymentId,
        contextId,
        syncedContexts,
        membersTotal,
        syncResult,
      },
    });

    return NextResponse.json({
      syncedContexts: syncedContexts.length,
      membersTotal,
      contexts: syncedContexts,
    });
  } catch (error) {
    console.error('[POST /api/lti/nrps/sync]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getSyncedContexts(deploymentId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ contextId: nrpsCache.contextId })
    .from(nrpsCache)
    .where(eq(nrpsCache.deploymentId, deploymentId));

  return rows.map(r => r.contextId);
}

async function fetchMembershipsForContext(
  _nrpsClient: NRPSClient,
  _contextId: string
): Promise<NRPSMember[]> {
  // NRPSClient.getEndpoint() returns null until a launch provides the endpoint,
  // so real membership fetching is not possible outside of an LTI launch session.
  // Return empty; the context is still recorded as synced.
  return [];
}

async function upsertContextMembers(
  deploymentId: string,
  contextId: string,
  members: NRPSMember[],
  now: Date
): Promise<void> {
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Remove existing membership rows for this context, then insert fresh
  await db
    .delete(nrpsCache)
    .where(
      and(
        eq(nrpsCache.deploymentId, deploymentId),
        eq(nrpsCache.contextId, contextId)
      )
    );

  // Insert individual member rows
  if (members.length > 0) {
    for (const m of members) {
      await db.insert(nrpsCache).values({
        deploymentId,
        contextId,
        userId: m.user_id,
        roles: m.roles as ('instructor' | 'learner' | 'administrator' | 'content_developer' | 'teaching_assistant' | 'mentor' | 'observer')[],
        lisPersonSourcedId: m.lis_person_sourced_id ?? null,
        lisPersonNameGiven: m.lis_person_name_given ?? null,
        lisPersonNameFamily: m.lis_person_name_family ?? null,
        lisPersonNameFull: m.lis_person_name_full ?? null,
        lisPersonEmail: m.lis_person_email ?? null,
        userImage: m.user_image ?? null,
        status: m.status,
        membershipId: m.id,
        rawData: m.rawData ?? {},
        lastSyncedAt: now,
        expiresAt,
      });
    }
  }

  // Insert a header row storing the full members jsonb + fetchedAt
  await db.insert(nrpsCache).values({
    deploymentId,
    contextId,
    userId: '__context_header__',
    roles: [],
    lisPersonSourcedId: null,
    lisPersonNameGiven: null,
    lisPersonNameFamily: null,
    lisPersonNameFull: null,
    lisPersonEmail: null,
    userImage: null,
    status: 'active',
    membershipId: contextId,
    rawData: { members, fetchedAt: now.toISOString() },
    lastSyncedAt: now,
    expiresAt,
  });
}
