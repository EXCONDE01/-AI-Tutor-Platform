import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAppUser, type AppRole } from './provision';

export type RequireAppRoleResult =
  | { ok: true; appUser: NonNullable<Awaited<ReturnType<typeof getAppUser>>> }
  | { ok: false; response: NextResponse };

/**
 * Authorization guard for route handlers and server code.
 * Uses the READ-ONLY getAppUser, so an unknown authenticated user is
 * rejected rather than silently provisioned.
 */
export async function requireAppRole(
  allowed: AppRole[] | AppRole,
  request?: NextRequest
): Promise<RequireAppRoleResult> {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  const appUser = await getAppUser(request);

  if (!appUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(appUser.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, appUser };
}