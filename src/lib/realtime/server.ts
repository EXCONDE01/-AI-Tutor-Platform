/**
 * Neon Realtime server utilities
 * Supports both JWT token endpoints (legacy) and sealed live queries (Neon Realtime SDK)
 */

import { SignJWT, type JWTPayload } from 'jose';
import { createRealtime, rawSql } from '@neon/realtime/server';
import { drizzleAdapter } from '@neon/realtime-drizzle';

// ============================================================================
// Legacy JWT token endpoint support (used by teacher-monitoring route)
// ============================================================================

interface RealtimeConfig {
  endpoint: string;
  publications: string[];
}

interface RealtimeTokenPayload extends JWTPayload {
  sub: string; // user ID
  role: string;
  publications: string[];
}

let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;

  const secret = process.env.NEON_REALTIME_JWT_SECRET || process.env.NEXT_AUTH_SECRET;
  if (!secret) {
    throw new Error('NEON_REALTIME_JWT_SECRET or NEXT_AUTH_SECRET must be set');
  }

  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

/**
 * Creates a JWT token for Neon Realtime authentication
 */
export async function createRealtimeToken(
  userId: string,
  role: string,
  publications: string[],
  expiresInSeconds = 3600
): Promise<string> {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);

  const payload: RealtimeTokenPayload = {
    sub: userId,
    role,
    publications,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(secret);

  return token;
}

/**
 * Gets the Neon Realtime configuration
 */
export function getRealtimeConfig(role: string): RealtimeConfig {
  const endpoint = process.env.NEON_REALTIME_ENDPOINT || 'wss://realtime.neon.tech';

  const publicationMap: Record<string, string[]> = {
    teacher: ['teacher_monitoring', 'session_updates'],
    student: ['session_updates'],
    parent: ['session_updates'],
    admin: ['teacher_monitoring', 'session_updates'],
  };

  return {
    endpoint,
    publications: publicationMap[role] || [],
  };
}

/**
 * Validates that a user can access a specific publication
 */
export function canAccessPublication(role: string, publication: string): boolean {
  const config = getRealtimeConfig(role);
  return config.publications.includes(publication);
}

// ============================================================================
// Neon Realtime SDK: sealed live queries
// ============================================================================

// Lazy realtime client - only create when actually needed (avoids build-time errors if secret not set)
let cachedRealtime: ReturnType<typeof createRealtime> | null = null;

export function getRealtimeClient() {
  if (cachedRealtime) return cachedRealtime;

  const secret = process.env.NEON_REALTIME_SECRET || process.env.NEXT_AUTH_SECRET;
  console.log('[realtime/server] getRealtimeClient:', {
    hasRealtimeSecret: !!process.env.NEON_REALTIME_SECRET,
    hasNextAuthSecret: !!process.env.NEXT_AUTH_SECRET,
    realtimeSecretPrefix: process.env.NEON_REALTIME_SECRET?.substring(0, 10),
    nextAuthSecretPrefix: process.env.NEXT_AUTH_SECRET?.substring(0, 10),
    realtimeEndpoint: process.env.NEON_REALTIME_ENDPOINT,
    realtimeUrl: process.env.NEON_REALTIME_URL,
    usingSecret: secret?.substring(0, 10)
  });
  
  if (!secret) {
    console.error('[realtime/server] NEON_REALTIME_SECRET and NEXT_AUTH_SECRET are both missing!');
    // During build or if not configured, return a mock that throws on use
    return {
      seal: () => { throw new Error('Neon Realtime not configured: NEON_REALTIME_SECRET missing'); },
      subscribe: () => { throw new Error('Neon Realtime not configured'); },
    } as any;
  }

  try {
    cachedRealtime = createRealtime({
      secret,
      db: 'neondb',
      adapter: drizzleAdapter(),
    });
    console.log('[realtime/server] Realtime client created successfully');
  } catch (error) {
    console.error('[realtime/server] Failed to create realtime client:', error);
    throw error;
  }

  return cachedRealtime;
}

/**
 * Creates a sealed live query for teacher's active sessions
 * Filters by classes taught by the teacher and active session status
 * Uses shadow table (teacher_active_sessions_realtime) that bypasses RLS
 */
export async function createTeacherSessionsSealedQuery(
  teacherId: string
) {
  // Use shadow table that bypasses RLS (no RLS enabled on shadow tables)
  const query = rawSql<{
    id: string;
    student_id: string;
    student_name: string;
    student_email: string;
    class_id: string;
    class_name: string;
    class_subject: string;
    status: string;
    title: string;
    message_count: number;
    started_at: Date | null;
    ended_at: Date | null;
    paused_at: Date | null;
    total_duration_seconds: number | null;
    updated_at: Date;
    teacher_id: string;
  }>(
    `SELECT 
      id,
      student_id,
      student_name,
      student_email,
      class_id,
      class_name,
      class_subject,
      status,
      title,
      message_count,
      started_at,
      ended_at,
      paused_at,
      total_duration_seconds,
      updated_at,
      teacher_id
    FROM teacher_active_sessions_realtime
    WHERE teacher_id = $1
    ORDER BY started_at DESC`,
    [teacherId]
  );

  console.log('[realtime/server] Creating sealed query for teacherId:', teacherId);
  const client = getRealtimeClient();
  console.log('[realtime/server] Realtime client created:', !!client);
  
  try {
    const sealed = client.seal({ query });
    console.log('[realtime/server] Sealed query created:', !!sealed);
    return sealed;
  } catch (error) {
    console.error('[realtime/server] Seal error:', error);
    throw error;
  }
}

/**
 * Creates a sealed live query for messages in a specific session
 * Uses shadow table (session_messages_realtime) that bypasses RLS
 */
export async function createSessionMessagesSealedQuery(
  sessionId: string
) {
  // Use shadow table that bypasses RLS (no RLS enabled on shadow tables)
  const query = rawSql<{
    id: string;
    session_id: string;
    role: string;
    content: string;
    content_type: string;
    sequence: number;
    metadata: Record<string, unknown>;
    created_at: Date;
  }>(
    `SELECT 
      id,
      session_id,
      role,
      content,
      content_type,
      sequence,
      metadata,
      created_at
    FROM session_messages_realtime
    WHERE session_id = $1
    ORDER BY sequence ASC`,
    [sessionId]
  );

  return getRealtimeClient().seal({ query });
}