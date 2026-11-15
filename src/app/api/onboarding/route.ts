import { NextRequest, NextResponse } from 'next/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { parseRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text().catch(() => '');
    const body = bodyText ? JSON.parse(bodyText) : {};
    const role = parseRole(body?.role);

    const result = await ensureAppUser(role, request);

    if (!result) {
      return NextResponse.json(
        { ok: false, error: 'Unauthenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      role: result.role,
      userId: result.user.id,
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}