/**
 * Mobile (Capacitor Android) deep link handling.
 *
 * Supports two URL forms:
 *   - Custom scheme:  aitutor://lti/launch?lti=...&deploy=...
 *   - Custom scheme:  aitutor://chat/[sessionId]
 *   - App Links HTTPS: https://aitutor.app/lti/launch?...
 *   - App Links HTTPS: https://aitutor.app/chat/[sessionId]
 *
 * All logic is pure string/URL parsing — no native Capacitor APIs required.
 * The caller (Capacitor App listener or PWA) invokes `handleDeepLink(url)`
 * and this module decides where to route inside the Next.js app.
 */

export interface DeepLinkRoute {
  path: string;
  params: Record<string, string>;
}

const CUSTOM_SCHEME = 'aitutor';
const HTTPS_HOSTS = new Set(['aitutor.app', 'www.aitutor.app']);

/**
 * Normalize a raw deep-link URL string into an absolute URL.
 * Returns null if the URL cannot be parsed or is not an AI Tutor link.
 */
function normalizeUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === `${CUSTOM_SCHEME}:`) {
      // Custom scheme: URL.parse treats the first segment as host.
      // Reconstruct the full path as host + pathname.
      return parsed;
    }
    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && HTTPS_HOSTS.has(parsed.hostname)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse a deep-link URL into a route object.
 *
 * Examples:
 *   parseDeepLink('aitutor://lti/launch?lti=abc123&deploy=def456')
 *     => { path: '/lti/launch', params: { lti: 'abc123', deploy: 'def456' } }
 *
 *   parseDeepLink('aitutor://chat/sess_123')
 *     => { path: '/chat/sess_123', params: {} }
 *
 *   parseDeepLink('https://aitutor.app/chat/sess_123?tab=messages')
 *     => { path: '/chat/sess_123', params: { tab: 'messages' } }
 *
 * Returns null for invalid or unknown URLs.
 */
export function parseDeepLink(url: string): DeepLinkRoute | null {
  const parsed = normalizeUrl(url);
  if (!parsed) {
    return null;
  }

  let pathname = parsed.pathname.replace(/\/+$/, '') || '/';

  // For custom scheme URLs, the "hostname" is actually the first path segment
  if (parsed.protocol === `${CUSTOM_SCHEME}:` && parsed.hostname) {
    pathname = `/${parsed.hostname}${pathname}`;
  }

  const params: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Route recognition
  const ltiMatch = pathname.match(/^\/lti\/launch$/i);
  if (ltiMatch) {
    return { path: '/lti/launch', params };
  }

  const chatMatch = pathname.match(/^\/chat\/([^/]+)$/i);
  if (chatMatch) {
    return { path: `/chat/${chatMatch[1]}`, params };
  }

  // Known but unhandled paths: still return a route so callers can react
  if (pathname === '/') {
    return { path: '/', params };
  }

  // Unknown path under our domain — return null to signal unrecognized
  return null;
}

/**
 * Handle a deep-link URL by performing client-side navigation.
 *
 * In a Next.js App Router environment this uses `window.location` replacement
 * (safe for both WebView and PWA). If `router` is provided (e.g. from
 * `useRouter`), it will use Next.js client navigation instead.
 *
 * This function does nothing if the URL cannot be parsed.
 */
export function handleDeepLink(url: string): void {
  const route = parseDeepLink(url);
  if (!route) {
    console.error(`[Mobile DeepLink] Unrecognized URL: ${url}`);
    return;
  }

  const { path, params } = route;
  const targetUrl = buildTargetUrl(path, params);

  // Prefer Next.js client navigation when a router is available (in-browser / WebView with Next.js hydration)
  try {
    const router = (window as any).NextRouter;
    if (router && typeof (router as { push?: unknown }).push === 'function') {
      (router as { push: (url: string) => void }).push(targetUrl);
      return;
    }
  } catch {
    // Fall through to window.location
  }

  // Fallback: replace current history entry (WebView-safe, no back-button trap)
  try {
    window.location.replace(targetUrl);
  } catch (error) {
    console.error('[Mobile DeepLink] Navigation failed:', error);
  }
}

/**
 * Build a full target URL from a route path and params.
 */
function buildTargetUrl(path: string, params: Record<string, string>): string {
  const search = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return search ? `${path}?${search}` : path;
}

/**
 * Register a global listener for Capacitor App URL events.
 *
 * Call this once during mobile app initialization (e.g. in root layout):
 *
 *   import { handleDeepLink } from '@/lib/mobile/deeplinks';
 *   import { App } from '@capacitor/app';
 *
 *   App.addListener('appUrlOpen', (data) => handleDeepLink(data.url));
 *
 * This is a convenience wrapper; it gracefully degrades if @capacitor/app
 * is not installed.
 */
export async function registerDeepLinkListener(): Promise<void> {
  try {
    const mod = await import('@capacitor/app');
    const App = mod.App;
    if (!App) {
      return;
    }
    App.addListener('appUrlOpen', (data: unknown) => {
      const urlData = data as { url: string };
      handleDeepLink(urlData.url);
    });
  } catch {
    // @capacitor/app not installed — deep links must be wired manually
  }
}
