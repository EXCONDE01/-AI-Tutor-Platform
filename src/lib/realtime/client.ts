/**
 * Neon Realtime client setup
 * Creates a shared client for subscribing to live SQL queries
 * Uses NEON_REALTIME_ENDPOINT from environment
 */

import { createRealtimeClient, type RealtimeClient, type WebSocketFactory } from '@neon/realtime/client';
import { drizzleParsers } from '@neon/realtime-drizzle/client';
import { RealtimeProvider } from '@neon/realtime-react';

let realtimeClient: RealtimeClient | null = null;

/**
 * Custom WebSocket factory that sets the origin header for browser connections
 * Neon Realtime branch endpoints may require origin allowlist
 */
const createWebSocketFactory = (): WebSocketFactory => {
  return (url: string, protocols: string | string[]) => {
    // Use the production URL as origin since Vercel preview URLs might not be in allowlist
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ai-tutor-platform-exconde.vercel.app';
    
    console.log('[realtime/client] Connecting to WebSocket:', url);
    console.log('[realtime/client] Protocols:', protocols);
    console.log('[realtime/client] Origin:', origin);
    
    // In browsers, WebSocket constructor doesn't accept headers parameter
    // The origin is automatically set by the browser
    // The branch-specific endpoint already includes database context
    return new WebSocket(url, protocols);
  };
};

/**
 * Get or create the Neon Realtime client (singleton)
 * Uses NEON_REALTIME_ENDPOINT from environment
 */
export function getRealtimeClient(): RealtimeClient {
  if (realtimeClient) return realtimeClient;

  // Use the branch-specific endpoint from NEXT_PUBLIC_NEON_REALTIME_URL (client-side accessible) 
  // if available, otherwise fall back to NEON_REALTIME_ENDPOINT
  const url = process.env.NEXT_PUBLIC_NEON_REALTIME_URL || process.env.NEON_REALTIME_URL || process.env.NEON_REALTIME_ENDPOINT || 'wss://realtime.neon.tech';

  console.log('[realtime/client] Creating client with URL:', url);
  console.log('[realtime/client] NEXT_PUBLIC_NEON_REALTIME_URL:', process.env.NEXT_PUBLIC_NEON_REALTIME_URL?.substring(0, 50));
  console.log('[realtime/client] NEON_REALTIME_URL:', process.env.NEON_REALTIME_URL?.substring(0, 50));
  console.log('[realtime/client] NEON_REALTIME_ENDPOINT:', process.env.NEON_REALTIME_ENDPOINT?.substring(0, 50));
  console.log('[realtime/client] NODE_ENV:', process.env.NODE_ENV);

  realtimeClient = createRealtimeClient({
    url,
    webSocketFactory: createWebSocketFactory(),
    parsers: {
      ...drizzleParsers,
    },
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  });

  return realtimeClient;
}

export { RealtimeProvider };