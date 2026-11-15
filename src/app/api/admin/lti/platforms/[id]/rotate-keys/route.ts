/**
 * Admin LTI Platform Key Rotation Endpoint
 * POST: Generate new RSA-2048 keypair for platform
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getPlatformById, rotatePlatformKeys } from '@/lib/lti/platform';
import { generateLtiKeyPair } from '@/lib/lti/keys';
import { rotateKeysSchema, uuidSchema } from '@/lib/lti/validation';
import { createAuditLog } from '@/lib/compliance/audit';

export async function POST(
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

    const body = await request.json().catch(() => ({}));
    
    // Validate request body
    const validation = rotateKeysSchema.safeParse(body);
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

    // Generate new key pair
    const { publicKey, privateKey } = generateLtiKeyPair();

    // Rotate keys in database
    const updatedPlatform = await rotatePlatformKeys(
      id,
      publicKey,
      privateKey,
      validation.data.keyRotationUrl
    );

    if (!updatedPlatform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    // Strip private key from response
    const { privateKey: _, ...safePlatform } = updatedPlatform;

    // Audit log (warning severity for key material change)
    await createAuditLog({
      action: 'lti_platform_keys_rotated',
      resourceType: 'lti_platform',
      resourceId: id,
      userId: auth.appUser.user.id,
      severity: 'warning',
      description: `Rotated keys for LTI platform ${id}`,
      oldValues: { publicKey: existingPlatform.publicKey },
      newValues: { publicKey: updatedPlatform.publicKey, keyRotationUrl: updatedPlatform.keyRotationUrl },
      metadata: { keyRotationUrl: validation.data.keyRotationUrl },
    });

    return NextResponse.json({
      platform: safePlatform,
      publicKey,
    });
  } catch (error) {
    console.error('[POST /api/admin/lti/platforms/[id]/rotate-keys]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}