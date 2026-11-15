/**
 * Admin LTI Deployment PATCH/DELETE Endpoint
 * PATCH: Update deployment configuration
 * DELETE: Delete deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDeploymentById, updateDeployment, deleteDeployment } from '@/lib/lti/platform';
import { updateDeploymentSchema, uuidSchema } from '@/lib/lti/validation';
import { createAuditLog } from '@/lib/compliance/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // Validate UUID
    const uuidValidation = uuidSchema.safeParse(id);
    if (!uuidValidation.success) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    
    // Validate request body
    const validation = updateDeploymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check deployment exists
    const existingDeployment = await getDeploymentById(id);
    if (!existingDeployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    const updatedDeployment = await updateDeployment(id, validation.data);
    
    if (!updatedDeployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // Audit log
    await createAuditLog({
      action: 'lti_deployment_updated',
      resourceType: 'lti_deployment',
      resourceId: id,
      userId: auth.appUser.user.id,
      severity: 'info',
      description: `Updated LTI deployment ${id}`,
      oldValues: existingDeployment,
      newValues: updatedDeployment,
      metadata: { changedFields: Object.keys(validation.data) },
    });

    return NextResponse.json(updatedDeployment);
  } catch (error) {
    console.error('[PATCH /api/admin/lti/deployments/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // Validate UUID
    const uuidValidation = uuidSchema.safeParse(id);
    if (!uuidValidation.success) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    // Check deployment exists
    const existingDeployment = await getDeploymentById(id);
    if (!existingDeployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    await deleteDeployment(id);

    // Audit log
    await createAuditLog({
      action: 'lti_deployment_deleted',
      resourceType: 'lti_deployment',
      resourceId: id,
      userId: auth.appUser.user.id,
      severity: 'info',
      description: `Deleted LTI deployment ${id}`,
      oldValues: existingDeployment,
      metadata: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/lti/deployments/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}