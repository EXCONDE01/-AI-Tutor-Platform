/**
 * Neon Realtime client setup
 * Creates a shared client for subscribing to live SQL queries
 * Uses NEON_REALTIME_ENDPOINT from environment
 */

import { createRealtimeClient, type RealtimeClient } from '@neon/realtime/client';
import { drizzleParsers } from '@neon/realtime-drizzle/client';
import { RealtimeProvider } from '@neon/realtime-react';

let realtimeClient: RealtimeClient | null = null;

/**
 * Get or create the Neon Realtime client (singleton)
 * Uses NEON_REALTIME_ENDPOINT from environment
 */
export function getRealtimeClient(): RealtimeClient {
  if (realtimeClient) return realtimeClient;

  const url = process.env.NEON_REALTIME_ENDPOINT || 'wss://realtime.neon.tech';

  realtimeClient = createRealtimeClient({
    url,
    parsers: {
      ...drizzleParsers,
    },
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'silent',
  });

  return realtimeClient;
}

export { RealtimeProvider };