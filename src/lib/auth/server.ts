/**
 * Neon Auth Server Configuration
 * Server-side auth utilities for Next.js App Router
 */

import { createNeonAuth } from '@neon/auth/next/server';
import { jwtVerify } from 'jose';

/**
 * Build-safe fallbacks. Real values must be provided in the environment
 * (see .env.example); these only prevent `next build` from failing when
 * env vars are not injected at build time (e.g. local CI).
 */
const FALLBACK_COOKIE_SECRET =
  'build-time-insecure-cookie-secret-change-in-env-0001';
const FALLBACK_BASE_URL = 'http://localhost:3000/api/auth';

export const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ?? FALLBACK_COOKIE_SECRET;
export const authBaseUrl = process.env.NEON_AUTH_BASE_URL ?? FALLBACK_BASE_URL;

if (!process.env.NEON_AUTH_COOKIE_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[auth] NEON_AUTH_COOKIE_SECRET is not set. Using an insecure build-time fallback.',
  );
}

/**
 * Server-side auth instance
 * Use this in Server Components, Server Actions, and API routes
 */
export const auth = createNeonAuth({
  baseUrl: authBaseUrl,
  cookies: {
    secret: cookieSecret,
    // Signed session cache TTL. Middleware refreshes this cookie when it expires,
    // which lets every page/route validate the session locally (no network hop).
    sessionDataTtl: 900,
  },
});

/** Cookie names as sent by the browser (the `__Secure-` prefix is stripped on HTTP). */
const SESSION_TOKEN_COOKIE = 'neon-auth.session_token';
const SESSION_DATA_COOKIE = 'neon-auth.local.session_data';

export interface AppSession {
  session: Record<string, unknown> & {
    id: string;
    token: string;
    expiresAt: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
  };
  user: Record<string, unknown> & {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: boolean;
    [key: string]: unknown;
  };
}

export interface SessionResult {
  data: {
    session: AppSession['session'] | null;
    user: AppSession['user'] | null;
  };
  error: null;
}

function emptySession(): SessionResult {
  return { data: { session: null, user: null }, error: null };
}

/**
 * Read a cookie value from a raw `Cookie` header. Accepts both the plain and
 * `__Secure-` prefixed names so it works on HTTP localhost and HTTPS alike.
 */
export function readCookieValue(
  cookieHeader: string | null | undefined,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    if (key !== name && key !== `__Secure-${name}`) continue;

    const value = part.slice(separator + 1).trim();
    if (!value) return undefined;

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}

/**
 * Prefix neon-auth cookie names with `__Secure-`, which is what the Neon Auth
 * API expects. The regex only matches at the start of a cookie name, so it can
 * never produce a doubled `__Secure-__Secure-` prefix.
 */
export function rewriteCookieNames(cookieHeader: string): string {
  return cookieHeader.replace(
    /(^|;\s*)neon-auth\./g,
    '$1__Secure-neon-auth.'
  );
}

/**
 * Validate the signed `session_data` cookie locally. This is the fast path:
 * no network request, just an HS256 signature + expiry check.
 */
async function decodeSessionData(
  value: string | undefined
): Promise<AppSession | null> {
  if (!value) return null;

  try {
    const { payload } = await jwtVerify(
      value,
      new TextEncoder().encode(cookieSecret),
      { algorithms: ['HS256'] }
    );

    const session = (payload as Record<string, unknown>).session as
      | AppSession['session']
      | undefined;
    const user = (payload as Record<string, unknown>).user as
      | AppSession['user']
      | undefined;

    if (!session || !user) return null;
    return { session, user };
  } catch {
    return null;
  }
}

/**
 * Short-lived in-memory cache for the network fallback.
 *
 * The signed cookie is the primary path; this only exists so that repeated
 * calls in the same window (API route + page, or several parallel fetches)
 * do not each pay for an upstream `/get-session` round trip.
 */
const SESSION_CACHE_TTL_MS = Number(
  process.env.AUTH_SESSION_CACHE_TTL_MS ?? 15_000
);
const SESSION_CACHE_MAX = 250;

const globalForSession = globalThis as unknown as {
  __neonAuthSessionCache?: Map<
    string,
    { expiresAt: number; value: SessionResult }
  >;
};

const sessionCache = (globalForSession.__neonAuthSessionCache ??= new Map());

function getCachedSession(key: string): SessionResult | undefined {
  const entry = sessionCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    sessionCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCachedSession(key: string, value: SessionResult): void {
  if (sessionCache.size >= SESSION_CACHE_MAX) {
    const oldest = sessionCache.keys().next().value;
    if (oldest !== undefined) sessionCache.delete(oldest);
  }
  sessionCache.set(key, {
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
    value,
  });
}

/** Drop cached network sessions (call after sign-out / role changes). */
export function invalidateSessionCache(): void {
  sessionCache.clear();
}

async function fetchSessionFromAuth(
  cookieHeader: string
): Promise<SessionResult> {
  const response = await fetch(`${authBaseUrl}/get-session`, {
    method: 'GET',
    headers: { cookie: rewriteCookieNames(cookieHeader) },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });

  if (!response.ok) return emptySession();

  const body = (await response.json().catch(() => null)) as {
    session?: AppSession['session'] | null;
    user?: AppSession['user'] | null;
  } | null;

  if (!body?.session || !body?.user) return emptySession();

  return { data: { session: body.session, user: body.user }, error: null };
}

/**
 * Get the current session on the server.
 *
 * Order of operations:
 * 1. Validate the signed session cookie locally (typical path, ~1ms).
 * 2. If there is no session token, return unauthenticated without a fetch.
 * 3. Otherwise fall back to Neon Auth, memoized for a few seconds.
 */
export async function getSession(request?: {
  headers?: { get(name: string): string | null };
}): Promise<SessionResult> {
  const cookieHeader =
    request?.headers?.get?.('cookie') ??
    (await (await import('next/headers')).cookies()).toString();

  const local = await decodeSessionData(
    readCookieValue(cookieHeader, SESSION_DATA_COOKIE)
  );
  if (local) return { data: local, error: null };

  const sessionToken = readCookieValue(cookieHeader, SESSION_TOKEN_COOKIE);

  // No credentials at all: don't bother the auth server.
  if (!sessionToken) return emptySession();

  const cached = getCachedSession(sessionToken);
  if (cached) return cached;

  try {
    const result = request
      ? await fetchSessionFromAuth(cookieHeader)
      : ((await auth.getSession()) as SessionResult);
    setCachedSession(sessionToken, result);
    return result;
  } catch (error) {
    console.warn('[auth] Failed to resolve session', error);
    return emptySession();
  }
}

/**
 * Get current user on server
 */
export async function getUser() {
  const session = await getSession();
  if (!session.data?.user) return null;
  return session.data.user;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session.data?.session) {
    throw new Error('Unauthorized');
  }
  return session.data;
}

/**
 * @deprecated Checks Neon Auth's `session.user.role`, which is always "user"
 * in this app. Use `requireAppRole` from '@/lib/auth/require-app-role' to
 * authorize against the app-level role stored in the `users` table.
 */
export async function requireRole(role: 'teacher' | 'student' | 'parent' | 'admin') {
  const sessionData = await requireAuth();
  const user = sessionData.user as { role?: string } | null;

  if (!user || user.role !== role) {
    throw new Error(`Forbidden: ${role} role required`);
  }

  return { session: sessionData.session, user };
}

/**
 * Sign out
 */
export async function signOut() {
  return await auth.signOut();
}

/**
 * Create session for user (for LTI/SSO flows)
 */
export async function createSession(userId: string, options?: { remember?: boolean }) {
  // This would need to be implemented via the admin API or by using the session token
  throw new Error('createSession not directly supported - use signIn flow');
}

/**
 * Verify email token
 */
export async function verifyEmail(token: string) {
  return await auth.verifyEmail({ query: { token, callbackURL: '/' } });
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string) {
  return await auth.requestPasswordReset({ email });
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, password: string) {
  return await auth.resetPassword({ newPassword: password, token });
}

/**
 * Change password (authenticated)
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  return await auth.changePassword({ currentPassword, newPassword });
}

/**
 * Update user profile
 */
export async function updateProfile(data: { name?: string; image?: string }) {
  await requireAuth();
  return await auth.updateUser(data);
}

/**
 * Delete account
 */
export async function deleteAccount(password: string) {
  await requireAuth();
  return await auth.deleteUser({ password });
}
