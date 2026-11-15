/**
 * Drizzle migrator runner.
 *
 * Uses drizzle-orm's official `migrate()` with a direct (unpooled) connection,
 * which surfaces real SQL errors instead of the drizzle-kit spinner.
 *
 * Usage: npm run db:migrate
 */
import './load-env';

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 15000,
});

async function main() {
  const db = drizzle(pool);
  console.log("Applying migrations from ./drizzle/migrations ...");
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrations applied.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
