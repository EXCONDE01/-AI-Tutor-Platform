import './load-env';

import { Pool } from 'pg';

const pooled = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;

async function run(label: string, url: string) {
  console.log(`\n=== ${label} (${url?.includes('pooler') ? 'pooler' : 'direct'}) ===`);
  const pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 300000, keepAlive: true });

  let start = Date.now();
  await pool.query('select 1');
  console.log(`single query: ${Date.now() - start}ms`);

  start = Date.now();
  await Promise.all(
    Array.from({ length: 5 }, () => pool.query('select count(*) from messages'))
  );
  console.log(`5 parallel queries: ${Date.now() - start}ms`);

  start = Date.now();
  await Promise.all(
    Array.from({ length: 5 }, () => pool.query('select count(*) from messages'))
  );
  console.log(`5 parallel queries (warm): ${Date.now() - start}ms`);

  await pool.end();
}

async function main() {
  // Warm the compute first with a separate connection.
  const warm = new Pool({ connectionString: pooled, max: 1 });
  await warm.query('select 1');
  await warm.end();

  await run('fresh pool after warm compute', pooled!);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
