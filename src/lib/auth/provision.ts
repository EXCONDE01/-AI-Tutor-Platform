/**
 * App-level user provisioning
 * Ensures a Neon Auth user has a corresponding row in public.users
 * and the matching profile row (teachers / students / parents / admins).
 */

import { getSession } from './server';
import { getDb, type NodePgDatabase } from '@/lib/db';
import { users, teachers, students, parents } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { DEMO_SCHOOL_ID } from '@/lib/tenant';
import type { NextRequest } from 'next/server';

export type AppRole = 'teacher' | 'student' | 'parent' | 'admin';

export interface ProvisionResult {
  user: typeof users.$inferSelect;
  role: AppRole;
}

/**
 * Provisioning only needs to happen once per user, not on every request.
 * Cached briefly so role lookups stay cheap across navigations.
 */
const APP_USER_CACHE_TTL_MS = 5 * 60_000;
const APP_USER_CACHE_MAX = 500;

/**
 * Read-only cache for authorization checks. Separate from the provisioning
 * cache so a stale provisioning result never leaks into read paths
 * (and vice-versa).
 */
const READONLY_CACHE_TTL_MS = 30_000;
const READONLY_CACHE_MAX = 500;

const globalForProvision = globalThis as unknown as {
  __appUserCache?: Map<
    string,
    { expiresAt: number; value: ProvisionResult }
  >;
  __appUserReadCache?: Map<
    string,
    { expiresAt: number; value: ProvisionResult | null }
  >;
};

const appUserCache = (globalForProvision.__appUserCache ??= new Map());
const appUserReadCache = (globalForProvision.__appUserReadCache ??= new Map());

/** Drop the cached app user (call after onboarding / role changes). */
export function invalidateAppUserCache(userId?: string): void {
  if (userId) {
    appUserCache.delete(userId);
    appUserReadCache.delete(userId);
    return;
  }
  appUserCache.clear();
  appUserReadCache.clear();
}

function getCachedAppUser(authUserId: string): ProvisionResult | undefined {
  const entry = appUserCache.get(authUserId);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    appUserCache.delete(authUserId);
    return undefined;
  }
  return entry.value;
}

function setCachedAppUser(authUserId: string, value: ProvisionResult): void {
  if (appUserCache.size >= APP_USER_CACHE_MAX) {
    const oldest = appUserCache.keys().next().value;
    if (oldest !== undefined) appUserCache.delete(oldest);
  }
  appUserCache.set(authUserId, {
    expiresAt: Date.now() + APP_USER_CACHE_TTL_MS,
    value,
  });
}

function getCachedReadOnlyAppUser(authUserId: string): ProvisionResult | null | undefined {
  const entry = appUserReadCache.get(authUserId);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    appUserReadCache.delete(authUserId);
    return undefined;
  }
  return entry.value;
}

function setCachedReadOnlyAppUser(authUserId: string, value: ProvisionResult | null): void {
  if (appUserReadCache.size >= READONLY_CACHE_MAX) {
    const oldest = appUserReadCache.keys().next().value;
    if (oldest !== undefined) appUserReadCache.delete(oldest);
  }
  appUserReadCache.set(authUserId, {
    expiresAt: Date.now() + READONLY_CACHE_TTL_MS,
    value,
  });
}

/**
 * Ensures the current authenticated user has an app-level user row
 * and the corresponding profile row (teacher, student, parent, or admin).
 *
 * @param role - The role to provision for ('teacher' | 'student' | 'parent' | 'admin'). Defaults to 'teacher'.
 * @param request - Optional NextRequest for cookie rewriting on HTTP localhost
 * @returns The app user and role, or null if no auth session exists.
 */
export async function ensureAppUser(
  role: AppRole = 'teacher',
  request?: NextRequest
): Promise<ProvisionResult | null> {
  const session = await getSession(request);

  // No auth session
  if (!session.data?.user) {
    return null;
  }

  const authUser = session.data.user;
  const authUserId = authUser.id;
  const email = authUser.email;

  if (!email) {
    throw new Error('Auth user has no email');
  }

  const cached = getCachedAppUser(authUserId);
  if (cached) return cached;

  const database = getDb();

  // Find an existing app user by email or external id (single round trip).
  const candidates = await database
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.externalId, authUserId)))
    .limit(2);

  const existingByEmail = candidates.find((candidate) => candidate.email === email);
  const existingByExternalId = candidates.find((candidate) => candidate.externalId === authUserId);

  // Case 1: Exact match by externalId (same Neon Auth account)
  if (existingByExternalId) {
    // If user was deleted (inactive), treat as new registration - allow role selection
    if (existingByExternalId.status === 'inactive') {
      // Fall through to Case 2/3 logic to create/update with new role
    } else {
      const existingRole = existingByExternalId.role as AppRole;
      await ensureProfileRow(database, existingByExternalId.id, existingRole);
      const result: ProvisionResult = { user: existingByExternalId, role: existingRole };
      setCachedAppUser(authUserId, result);
      return result;
    }
  }

  // Case 2: Match by email but different externalId (re-registered with new Neon Auth account)
  // Update the externalId and use the requested role
  if (existingByEmail) {
    const updatedUser = await database
      .update(users)
      .set({
        externalId: authUserId,
        role,
        emailVerified: authUser.emailVerified ?? false,
        avatarUrl: authUser.image ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingByEmail.id))
      .returning()
      .then((rows: typeof users.$inferSelect[]) => rows[0]);

    if (updatedUser) {
      // Ensure profile row for the NEW role
      await ensureProfileRow(database, updatedUser.id, role);
      const result: ProvisionResult = { user: updatedUser, role };
      setCachedAppUser(authUserId, result);
      return result;
    }
  }

  // Case 3: No existing user - create new

  // Split name from auth user
  const fullName = authUser.name ?? '';
  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ') || email.split('@')[0] || '';

  // Insert new user in a transaction for race safety
  const newUser = await database.transaction(async (tx: NodePgDatabase<typeof import('@/db/schema')>) => {
    try {
      const inserted = await tx
        .insert(users)
        .values({
          schoolId: DEMO_SCHOOL_ID,
          role,
          status: 'active',
          authProvider: 'email',
          externalId: authUserId,
          email,
          emailVerified: authUser.emailVerified ?? false,
          firstName: firstName || email.split('@')[0],
          lastName,
          displayName: fullName || email.split('@')[0],
          avatarUrl: authUser.image ?? null,
        })
        .returning()
        .then((rows: typeof users.$inferSelect[]) => rows[0]);

      // Ensure profile row exists (idempotent)
      await ensureProfileRow(tx, inserted.id, role);

      return inserted;
    } catch (error) {
      // Handle unique constraint violation on email (race condition)
      if (error instanceof Error && error.message.includes('users_email_idx')) {
        // Another request created the user; re-select and continue
        const existing = await tx
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
          .then((rows: typeof users.$inferSelect[]) => rows[0]);

        if (existing) {
          await ensureProfileRow(tx, existing.id, existing.role as AppRole);
          return existing;
        }
      }
      throw error;
    }
  });

  const result: ProvisionResult = { user: newUser, role };
  setCachedAppUser(authUserId, result);
  return result;
}

/**
 * Ensures the profile row (teacher, student, parent) exists for a user.
 * Uses onConflictDoNothing to be idempotent.
 * Note: admin role doesn't require a separate profile table.
 */
async function ensureProfileRow(
  tx: NodePgDatabase<typeof import('@/db/schema')>,
  userId: string,
  role: AppRole
): Promise<void> {
  if (role === 'teacher') {
    await tx
      .insert(teachers)
      .values({ userId })
      .onConflictDoNothing();
  } else if (role === 'student') {
    await tx
      .insert(students)
      .values({ userId })
      .onConflictDoNothing();
  } else if (role === 'parent') {
    await tx
      .insert(parents)
      .values({ userId, relationship: 'guardian' })
      .onConflictDoNothing();
  }
  // admin role has no separate profile table
}

/**
 * READ-ONLY app-level user lookup.
 * NEVER inserts or updates any row. Use this for authorization decisions.
 * `ensureAppUser` must not be used to answer "may this person do X?" because
 * it provisions a user with whatever role it is given.
 */
export async function getAppUser(
  request?: NextRequest
): Promise<ProvisionResult | null> {
  const session = await getSession(request);

  // No auth session
  if (!session.data?.user) {
    return null;
  }

  const authUser = session.data.user;
  const authUserId = authUser.id;
  const email = authUser.email;

  // If no email, return null instead of throwing (proxy must not 500 on odd sessions)
  if (!email) {
    return null;
  }

  // Check read-only cache first
  const cached = getCachedReadOnlyAppUser(authUserId);
  if (cached !== undefined) return cached;

  const database = getDb();

  // Find an existing app user by email or external id (single round trip).
  const candidates = await database
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.externalId, authUserId)))
    .limit(2);

  const existingUser =
    candidates.find((candidate) => candidate.email === email) ?? candidates[0];

  if (existingUser) {
    const result: ProvisionResult = {
      user: existingUser,
      role: existingUser.role as AppRole,
    };
    setCachedReadOnlyAppUser(authUserId, result);
    return result;
  }

  // Not found - return null, never insert
  setCachedReadOnlyAppUser(authUserId, null);
  return null;
}
