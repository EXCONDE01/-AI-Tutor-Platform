/**
 * LTI AGS Line Items API
 * GET: List cached line items (paginated, filterable)
 * POST: Create a line item via AGSClient and cache locally
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import {
  ltiPlatforms,
  ltiDeployments,
  agsLineItems,
} from '@/db/schema/lti';
import { eq, and, desc, count } from 'drizzle-orm';
import { createAGSClient } from '@/lib/lti/ags';
import { AGSLineItemCreateRequest } from '@/lib/lti/types';
import { createAuditLog } from '@/lib/compliance/audit';
import { z } from 'zod';

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

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

const createLineItemBodySchema = z.object({
  platformId: z.string().uuid('Invalid platformId'),
  deploymentId: z.string().uuid('Invalid deploymentId'),
  label: z.string().min(1).max(255),
  resourceLinkId: z.string().max(255).optional().nullable(),
  scoreMaximum: z.number().int().positive(),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const database = getDb();
    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    const platformId = searchParams.get('platformId') || undefined;
    const deploymentId = searchParams.get('deploymentId') || undefined;

    const conditions = [];
    if (deploymentId && isUuid(deploymentId)) {
      conditions.push(eq(agsLineItems.deploymentId, deploymentId));
    }
    if (platformId && isUuid(platformId)) {
      conditions.push(eq(ltiDeployments.platformId, platformId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Resolve deploymentIds for platform filter
    let deploymentIdFilter = deploymentId;
    if (platformId && isUuid(platformId)) {
      const platformDeployments = await database
        .select({ id: ltiDeployments.id })
        .from(ltiDeployments)
        .where(eq(ltiDeployments.platformId, platformId));
      const ids = platformDeployments.map((d) => d.id);
      if (ids.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        });
      }
      if (deploymentIdFilter && !ids.includes(deploymentIdFilter)) {
        return NextResponse.json({
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        });
      }
      // If multiple deployments match platform, we can only filter by one deploymentId at a time via eq.
      // Use the first matching deployment if none specified.
      if (!deploymentIdFilter) {
        deploymentIdFilter = ids[0];
      }
    }

    const finalConditions = [];
    if (deploymentIdFilter && isUuid(deploymentIdFilter)) {
      finalConditions.push(eq(agsLineItems.deploymentId, deploymentIdFilter));
    }
    const finalWhere = finalConditions.length > 0 ? and(...finalConditions) : undefined;

    const [{ value: total }] = await database
      .select({ value: count() })
      .from(agsLineItems)
      .where(finalWhere);

    const data = await database
      .select()
      .from(agsLineItems)
      .where(finalWhere)
      .orderBy(desc(agsLineItems.createdAt))
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
    console.error('[lti/ags/line-items] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;
    const appUser = auth.appUser;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createLineItemBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid line item data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { platformId, deploymentId, label, resourceLinkId, scoreMaximum, tags } =
      parsed.data;

    const database = getDb();

    // Validate platform exists
    const [platform] = await database
      .select()
      .from(ltiPlatforms)
      .where(eq(ltiPlatforms.id, platformId))
      .limit(1);

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    // Validate deployment exists and belongs to platform
    const [deployment] = await database
      .select()
      .from(ltiDeployments)
      .where(
        and(eq(ltiDeployments.id, deploymentId), eq(ltiDeployments.platformId, platformId))
      )
      .limit(1);

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // AGS support check
    if (!platform.supportsAGS) {
      return NextResponse.json(
        { error: 'Platform does not support AGS' },
        { status: 400 }
      );
    }

    // AGS endpoint must be configured (stored in platform configuration jsonb)
    const agsEndpoint = (platform.configuration as Record<string, unknown> | null)?.agsEndpoint as
      | { lineitems_url: string; scope: string[]; service_versions: string[] }
      | undefined;

    if (!agsEndpoint || !agsEndpoint.lineitems_url) {
      return NextResponse.json(
        { error: 'AGS endpoint not configured for platform' },
        { status: 400 }
      );
    }

    // Build AGS line item create request
    const lineItem: AGSLineItemCreateRequest = {
      scoreMaximum,
      label,
      resourceLinkId: resourceLinkId || undefined,
      tag: tags.length > 0 ? tags.join(', ') : undefined,
      type: 'score',
    };

    // Call AGS client against the LMS
    const agsClient = await createAGSClient(platformId, deploymentId);
    if (!agsClient) {
      return NextResponse.json({ error: 'Failed to create AGS client' }, { status: 400 });
    }

    agsClient.setEndpoint(agsEndpoint);

    let created;
    try {
      created = await agsClient.createLineItem(lineItem);
    } catch (clientError) {
      console.error('[lti/ags/line-items] AGS createLineItem failed:', clientError);
      return NextResponse.json(
        { error: 'AGS line item creation failed: ' + (clientError as Error).message },
        { status: 400 }
      );
    }

    // Audit log
    await createAuditLog({
      action: 'lti_ags_lineitem_created' as Parameters<typeof createAuditLog>[0]['action'],
      resourceType: 'ags_line_item',
      resourceId: created.id,
      userId: appUser.user.id,
      districtId: platform.districtId || undefined,
      severity: 'info',
      description: `Created AGS line item ${label}`,
      newValues: {
        lineItemId: created.id,
        label,
        scoreMaximum,
        resourceLinkId,
        tags,
        platformId,
        deploymentId,
      },
      metadata: {
        platformId,
        deploymentId,
        ltiLineItemUrl: created.id,
      },
    });

    return NextResponse.json(
      {
        lineItem: {
          id: created.id,
          label: created.label,
          scoreMaximum: created.scoreMaximum,
          resourceLinkId: created.resourceLinkId,
          tag: created.tag,
          ltiLineItemUrl: created.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[lti/ags/line-items] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
