/**
 * Set password for admin user via Neon Auth credential provider
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/set-admin-password.ts
 */

import './load-env';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { hashPassword } from 'better-auth/crypto';

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL_UNPOOLED or DATABASE_URL must be set');
  process.exit(1);
}

const email = 'christianexconde01@gmail.com';
const password = 'JeloyskiAdmin01';

async function main() {
  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  try {
    // Find the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.id} ${user.email} role=${user.role}`);

    // Hash the password using better-auth's hashPassword
    const hashedPassword = await hashPassword(password);

    // We need to find/create the account record for the credential provider
    // Neon Auth stores credentials in an 'account' table managed by better-auth
    // Let's check if we can access it via drizzle
    console.log('Password hashed. You need to set it in the accounts table.');
    console.log(
      `User ID: ${user.id}`,
      `Hashed password: ${hashedPassword.substring(0, 30)}...`,
    );

    // Try to find the accounts table
    try {
      const result = await pool.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%account%'`,
      );
      console.log('Account-related tables:', result.rows);
    } catch (e) {
      console.warn('Could not query tables:', e);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

main();