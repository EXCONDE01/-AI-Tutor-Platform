/**
 * Admin LTI Platforms API
 * GET: List all platforms
 * POST: Create a new platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPlatforms, createPlatform } from '@/lib/lti/platform';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { createAuditLog } from '@/lib/compliance/audit';
import { createPlatformSchema } from '@/lib/lti/validation';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const platforms = await getAllPlatforms();
    return NextResponse.json(platforms);
  } catch (error) {
    console.error('Failed to fetch platforms:', error);
    return NextResponse.json({ error: 'Failed to fetch platforms' }, { status: 500 });
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

    const parsed = createPlatformSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid platform data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const platform = await createPlatform(parsed.data);

    await createAuditLog({
      action: 'lti_platform_created',
      resourceType: 'lti_platform',
      resourceId: platform.id,
      userId: auth.appUser.user.id,
      districtId: platform.districtId,
      severity: 'info',
      description: `Created LTI platform ${platform.id}`,
      newValues: platform,
      metadata: { fields: Object.keys(parsed.data) },
    });

    return NextResponse.json(platform, { status: 201 });
  } catch (error) {
    console.error('Failed to create platform:', error);
    return NextResponse.json({ error: 'Failed to create platform' }, { status: 500 });
  }
}