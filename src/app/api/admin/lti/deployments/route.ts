/**
 * Admin LTI Deployments API
 * GET: List all deployments
 * POST: Create a new deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllDeployments, createDeployment } from '@/lib/lti/platform';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { createAuditLog } from '@/lib/compliance/audit';
import { createDeploymentSchema } from '@/lib/lti/validation';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const deployments = await getAllDeployments();
    return NextResponse.json(deployments);
  } catch (error) {
    console.error('Failed to fetch deployments:', error);
    return NextResponse.json({ error: 'Failed to fetch deployments' }, { status: 500 });
  }
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

    const parsed = createDeploymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid deployment data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const deployment = await createDeployment(parsed.data);

    await createAuditLog({
      action: 'lti_deployment_created',
      resourceType: 'lti_deployment',
      resourceId: deployment.id,
      userId: auth.appUser.user.id,
      severity: 'info',
      description: `Created LTI deployment ${deployment.id}`,
      newValues: deployment,
      metadata: { fields: Object.keys(parsed.data) },
    });

    return NextResponse.json(deployment, { status: 201 });
  } catch (error) {
    console.error('Failed to create deployment:', error);
    return NextResponse.json({ error: 'Failed to create deployment' }, { status: 500 });
  }
}