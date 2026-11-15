import {
  auth,
  cookieSecret,
  getSession,
  readCookieValue,
  rewriteCookieNames,
} from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { AppRole } from "@/lib/auth/provision";

const neonMiddleware = auth.middleware({
  loginUrl: "/sign-in",
  publicRoutes: [
    "/",
    "/api/auth/(.*)",
    "/api/push/subscribe",
    "/api/onboarding",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/lti/launch",
    "/oauth/callback",
    "/parent/consent",
    "/unauthorized",
    "/_next/(.*)",
    "/favicon.ico",
    "/manifest.json",
    "/sw.js",
    "/icons/(.*)",
  ],
});

const SESSION_TOKEN_COOKIE = "neon-auth.session_token";
const SESSION_DATA_COOKIE = "neon-auth.local.session_data";
const SESSION_CHALLENGE_COOKIE = "neon-auth.session_challenge";

const PUBLIC_PATHS = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/lti/launch",
  "/oauth/callback",
  "/parent/consent",
  "/unauthorized",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/api/onboarding",
]);

const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/api/push/subscribe",
  "/api/onboarding",
  "/api/auth/role",
  "/_next/",
  "/icons/",
];

// Role requirements for route groups (most specific first)
const ROUTE_ROLE_MAP: Record<string, AppRole> = {
  '/admin/': 'admin',
  '/teacher/': 'teacher',
  '/parent/': 'parent',
  '/student/': 'student',
  '/lti/nrps': 'admin',
  '/lti/ags': 'admin',
  '/google-classroom': 'admin',
};

function getRequiredRole(pathname: string): AppRole | null {
  for (const [routePrefix, role] of Object.entries(ROUTE_ROLE_MAP)) {
    if (pathname.startsWith(routePrefix) || pathname === routePrefix.slice(0, -1)) {
      return role;
    }
  }
  return null;
}

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isHttps(request: NextRequest): boolean {
  return new URL(request.url).protocol === "https:";
}

/**
 * Validate the signed session cookie locally. When it is valid the middleware
 * does no network work at all; the Neon Auth SDK is only invoked to refresh an
 * expired cookie or to finish an OAuth exchange.
 */
async function hasValidSessionData(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  try {
    await jwtVerify(value, new TextEncoder().encode(cookieSecret), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

async function rewriteRequestCookies(request: NextRequest): Promise<NextRequest> {
  if (isHttps(request)) return request;

  const cookie = request.headers.get("cookie");
  if (!cookie) return request;

  // Browser sends `neon-auth.*` (rewritten); Neon Auth expects `__Secure-neon-auth.*`
  const rewrittenCookie = rewriteCookieNames(cookie);
  if (rewrittenCookie === cookie) return request;

  const headers = new Headers(request.headers);
  headers.set("cookie", rewrittenCookie);

  // Pass body through for all remaining routes
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    body: request.body,
    signal: request.signal ?? undefined,
  };
  if (request.body) {
    init.duplex = "half";
  }

  return new NextRequest(request.url, init as any);
}

function rewriteResponseCookies(response: Response, request: NextRequest): Response {
  if (isHttps(request)) return response;

  const raw = response.headers.get("set-cookie");
  if (!raw) return response;

  let rewritten = raw.replace(/__Secure-/g, "");
  rewritten = rewritten.replace(/;\s*Secure/gi, "");
  rewritten = rewritten.replace(/;\s*;/g, ";");

  const headers = new Headers(response.headers);
  headers.set("set-cookie", rewritten);

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Check if the user has the required app-level role
 * Returns true if authorized, false if unauthorized, null if no session
 */
async function checkAppRole(
  requiredRole: AppRole,
  request: NextRequest
): Promise<boolean | null> {
  const neonRequest = await rewriteRequestCookies(request);
  const session = await getSession(neonRequest);

  if (!session.data?.session || !session.data?.user) {
    return null; // No session
  }

  // Dynamic import to avoid circular dependency - use READ-ONLY getAppUser
  const { getAppUser } = await import('@/lib/auth/provision');
  const appUser = await getAppUser(neonRequest);

  if (!appUser || appUser.role !== requiredRole) {
    return false; // Wrong role or no app user row
  }

  return true; // Authorized
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const isApi = pathname.startsWith("/api/");

  const sessionToken = readCookieValue(cookieHeader, SESSION_TOKEN_COOKIE);
  const sessionChallenge = readCookieValue(cookieHeader, SESSION_CHALLENGE_COOKIE);

  // Check if this route requires a specific role
  const requiredRole = getRequiredRole(pathname);

  // Fast unauthenticated redirect (APIs return their own 401 JSON).
  if (!isPublicRoute(pathname) && !sessionToken && !sessionChallenge) {
    if (isApi) return NextResponse.next();

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/sign-in";
    loginUrl.search = "";
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If this route requires a specific role, check it
  if (requiredRole) {
    const hasRole = await checkAppRole(requiredRole, request);
    
    if (hasRole === null) {
      // No session - redirect to sign-in
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/sign-in";
      loginUrl.search = "";
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
    
    if (hasRole === false) {
      // Has session but wrong role - redirect to unauthorized
      const unauthorizedUrl = request.nextUrl.clone();
      unauthorizedUrl.pathname = "/unauthorized";
      unauthorizedUrl.searchParams.set("requiredRole", requiredRole);
      return NextResponse.redirect(unauthorizedUrl);
    }
    // Authorized - continue to normal flow
  }

  // The SDK has real work to do only when the signed session cookie is
  // missing/expired or an OAuth challenge needs exchanging.
  const needsSdk =
    Boolean(sessionChallenge) ||
    (!isApi &&
      Boolean(sessionToken) &&
      !(await hasValidSessionData(
        readCookieValue(cookieHeader, SESSION_DATA_COOKIE)
      )));

  if (needsSdk) {
    const neonRequest = await rewriteRequestCookies(request);
    const response = await neonMiddleware(neonRequest);
    return rewriteResponseCookies(response, request);
  }

  // Common path: just hand the rewritten cookie names to the app.
  const headers = new Headers(request.headers);
  if (!isHttps(request) && cookieHeader) {
    const rewrittenCookie = rewriteCookieNames(cookieHeader);
    if (rewrittenCookie !== cookieHeader) {
      headers.set("cookie", rewrittenCookie);
    }
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|map)$).*)'],
};