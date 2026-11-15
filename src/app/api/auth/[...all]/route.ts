import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

/**
 * Neon Auth API proxy.
 *
 * Mounted at /api/auth/[...all]. Neon's handler expects a catch-all segment
 * named `path`, while Next.js exposes it as `all`, so we map the params.
 */
const handlers = auth.handler();

type RouteContext = { params: Promise<{ all: string[] }> };

async function toNeonContext(context: RouteContext) {
  const { all } = await context.params;
  return { params: Promise.resolve({ path: all ?? [] }) };
}

function isHttps(request: NextRequest): boolean {
  return new URL(request.url).protocol === "https:";
}

/**
 * Neon Auth hardcodes `__Secure-` prefixed cookies with the `Secure`
 * attribute, which browsers reject over non-HTTPS connections (localhost dev).
 * Rewrite request cookies so Neon Auth can read them, and rewrite response
 * Set-Cookie headers so browsers can store them.
 */
function rewriteRequestCookies(request: NextRequest): NextRequest {
  if (isHttps(request)) return request;

  const cookie = request.headers.get("cookie");
  if (!cookie) return request;

  // If cookies already have __Secure- prefix, don't rewrite again (prevents double prefix)
  if (cookie.includes('__Secure-neon-auth.')) {
    return request;
  }

  // Browser sends `neon-auth.*` (rewritten); Neon Auth expects `__Secure-neon-auth.*`
  // Also handle neon-auth.local. -> __Secure-neon-auth.local.
  let rewrittenCookie = cookie.replace(/\bneon-auth\./g, "__Secure-neon-auth.");
  rewrittenCookie = rewrittenCookie.replace(/\bneon-auth\.local\./g, "__Secure-neon-auth.local.");
  if (rewrittenCookie === cookie) return request;

  const headers = new Headers(request.headers);
  headers.set("cookie", rewrittenCookie);

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

  // Strip __Secure- prefix from cookie names
  let rewritten = raw.replace(/__Secure-/g, "");
  // Strip Secure flag (case-insensitive)
  rewritten = rewritten.replace(/;\s*Secure/gi, "");
  // Clean up any doubled semicolons left behind
  rewritten = rewritten.replace(/;\s*;/g, ";");

  const headers = new Headers(response.headers);
  headers.set("set-cookie", rewritten);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handle(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  request: NextRequest,
  context: RouteContext
) {
  const neonRequest = rewriteRequestCookies(request);
  const neonContext = await toNeonContext(context);
  const response = await handlers[method](neonRequest, neonContext);
  return rewriteResponseCookies(response, request);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle("GET", request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle("POST", request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handle("PUT", request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle("PATCH", request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle("DELETE", request, context);
}
