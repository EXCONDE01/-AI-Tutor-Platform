/**
 * Admin LTI Platform PATCH/DELETE Endpoint
 * PATCH: Update platform configuration
 * DELETE: Delete platform (cascades to deployments)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getPlatformById, updatePlatform, deletePlatform } from '@/lib/lti/platform';
import { updatePlatformSchema, uuidSchema } from '@/lib/lti/validation';
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
    const validation = updatePlatformSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check platform exists
    const existingPlatform = await getPlatformById(id);
    if (!existingPlatform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    // Prepare update data (exclude status from platform update, handle separately)
    const { status, ...updateData } = validation.data;
    const updatedPlatform = await updatePlatform(id, { ...updateData, status });
    
    if (!updatedPlatform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    // Audit log
    await createAuditLog({
      action: 'lti_platform_updated',
      resourceType: 'lti_platform',
      resourceId: id,
      userId: auth.appUser.user.id,
      severity: 'info',
      description: `Updated LTI platform ${id}`,
      oldValues: { status: existingPlatform.status, ...existingPlatform },
      newValues: { status: updatedPlatform.status, ...updatedPlatform },
      metadata: { changedFields: Object.keys(updateData) },
    });

    return NextResponse.json(updatedPlatform);
  } catch (error) {
    console.error('[PATCH /api/admin/lti/platforms/[id]]', error);
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

    // Check platform exists
    const existingPlatform = await getPlatformById(id);
    if (!existingPlatform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    await deletePlatform(id);

    // Audit log
    await createAuditLog({
      action: 'lti_platform_deleted',
      resourceType: 'lti_platform',
      resourceId: id,
      userId: auth.appUser.user.id,
      severity: 'info',
      description: `Deleted LTI platform ${id}`,
      oldValues: existingPlatform,
      metadata: { cascaded: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/lti/platforms/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}