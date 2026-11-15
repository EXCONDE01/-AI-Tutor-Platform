/**
 * Neon Realtime server utilities
 * Supports both JWT token endpoints (legacy) and sealed live queries (Neon Realtime SDK)
 */

import { SignJWT, type JWTPayload } from 'jose';
import { createRealtime, rawSql } from '@neon/realtime/server';
import { drizzleAdapter } from '@neon/realtime-drizzle';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  tutorSessions,
  messages,
  classes,
  students,
  users,
} from '@/db/schema';

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
  if (!secret) {
    // During build or if not configured, return a mock that throws on use
    return {
      seal: () => { throw new Error('Neon Realtime not configured: NEON_REALTIME_SECRET missing'); },
      subscribe: () => { throw new Error('Neon Realtime not configured'); },
    } as any;
  }

  cachedRealtime = createRealtime({
    secret,
    db: 'neondb',
    adapter: drizzleAdapter(),
  });

  return cachedRealtime;
}

/**
 * Creates a sealed live query for teacher's active sessions
 * Filters by classes taught by the teacher and active session status
 */
export async function createTeacherSessionsSealedQuery(
  teacherId: string
) {
  const database = getDb();

  const query = database
    .select({
      id: tutorSessions.id,
      studentId: students.id,
      studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      studentEmail: users.email,
      classId: classes.id,
      className: classes.name,
      classSubject: classes.subject,
      status: tutorSessions.status,
      title: tutorSessions.title,
      messageCount: tutorSessions.messageCount,
      startedAt: tutorSessions.startedAt,
      endedAt: tutorSessions.endedAt,
      pausedAt: tutorSessions.pausedAt,
      totalDurationSeconds: tutorSessions.totalDurationSeconds,
      lastMessageContent: sql<string | null>`(
        select m.content from ${messages} m
        where m.session_id = ${tutorSessions.id}
        order by m.sequence desc limit 1
      )`,
      lastMessageAt: sql<string | null>`(
        select m.created_at from ${messages} m
        where m.session_id = ${tutorSessions.id}
        order by m.sequence desc limit 1
      )`,
      updatedAt: tutorSessions.updatedAt,
    })
    .from(tutorSessions)
    .innerJoin(classes, eq(classes.id, tutorSessions.classId))
    .innerJoin(students, eq(students.id, tutorSessions.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .where(and(eq(classes.teacherId, teacherId), eq(tutorSessions.status, 'active')))
    .orderBy(desc(tutorSessions.startedAt));

  return getRealtimeClient().seal({ query });
}

/**
 * Creates a sealed live query for messages in a specific session
 */
export async function createSessionMessagesSealedQuery(
  sessionId: string
) {
  const database = getDb();

  const query = database
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(desc(messages.sequence))
    .limit(100);

  return getRealtimeClient().seal({ query });
}