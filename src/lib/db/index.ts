/**
 * Database connection and Drizzle instance
 * Build-safe: does not throw at import time during `next build`.
 * Uses lazy getters to defer connection until first runtime use.
 */

import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../db/schema';

export type { NodePgDatabase };

/**
 * Get the database connection string.
 * Prefers the pooled connection for the app runtime (serverless-friendly and
 * much faster to establish); migrations/scripts use DATABASE_URL_UNPOOLED
 * explicitly.
 */
function getConnectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      'DATABASE_URL or DATABASE_URL_UNPOOLED is not set. ' +
        'Ensure the environment variable is configured.'
    );
  }
  return url;
}

// Global cache to avoid connection leaks during HMR in development
const globalForDb = globalThis as unknown as {
  __pool: Pool | undefined;
  __db: NodePgDatabase<typeof schema> | undefined;
};

/**
 * Get or create the pg Pool (cached in dev).
 */
function getPool(): Pool {
  if (globalForDb.__pool) return globalForDb.__pool;

  const pool = new Pool({
    connectionString: getConnectionString(),
    max: 10,
    connectionTimeoutMillis: 15000,
    // Neon computes are far away; re-establishing a TLS connection costs
    // ~1-2s. Keep idle connections around instead of closing after 10s.
    idleTimeoutMillis: 300_000,
    keepAlive: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.__pool = pool;
  }
  return pool;
}

/**
 * Get or create the Drizzle instance (cached in dev).
 */
function getDbInternal(): NodePgDatabase<typeof schema> {
  if (globalForDb.__db) return globalForDb.__db;

  const db = drizzle(getPool(), { schema });
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.__db = db;
  }
  return db;
}

/**
 * Build-safe accessor for the Drizzle instance.
 * Throws only at runtime when actually used without a valid DATABASE_URL.
 */
export function getDb(): NodePgDatabase<typeof schema> {
  return getDbInternal();
}

/**
 * Lazily-initialized Drizzle database instance with schema.
 * This is a Proxy that defers initialization until first property access,
 * making it safe for `next build` when env vars may not be present.
 * 
 * Use `getDb()` for explicit runtime access with clear error messages.
 * Use `db` for ergonomic property access (e.g., `db.select()...`).
 */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(target, prop, receiver) {
    const database = getDbInternal();
    const value = Reflect.get(database, prop, receiver);
    // Bind methods to the database instance
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  },
});

import { sql } from 'drizzle-orm';

/**
 * Runs a callback inside a transaction with RLS context variables set.
 * 
 * NOTE: The app currently connects as the table owner, which bypasses RLS.
 * This helper is preparatory for when we switch to a role that respects RLS.
 * 
 * Context variables set (read by RLS policies via current_setting):
 * - app.current_user_id
 * - app.current_role
 * - app.current_school_id
 * - app.current_district_id
 * - app.current_teacher_id
 * - app.current_student_id
 * - app.current_parent_id
 * - app.current_email
 */
export async function withTenantContext<T>(
  ctx: {
    userId?: string;
    role?: string;
    schoolId?: string;
    districtId?: string;
    teacherId?: string;
    studentId?: string;
    parentId?: string;
    email?: string;
  },
  fn: (tx: NodePgDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  const database = getDbInternal();
  
  return await database.transaction(async (tx) => {
    // Set RLS context variables
    const setConfig = async (name: string, value: string | undefined) => {
      if (value !== undefined) {
        await tx.execute(
          sql`SELECT set_config('app.${name}', ${value}, true)`
        );
      }
    };

    await Promise.all([
      setConfig('current_user_id', ctx.userId),
      setConfig('current_role', ctx.role),
      setConfig('current_school_id', ctx.schoolId),
      setConfig('current_district_id', ctx.districtId),
      setConfig('current_teacher_id', ctx.teacherId),
      setConfig('current_student_id', ctx.studentId),
      setConfig('current_parent_id', ctx.parentId),
      setConfig('current_email', ctx.email),
    ]);

    return fn(tx);
  });
}