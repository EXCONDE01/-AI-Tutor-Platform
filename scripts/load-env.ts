/**
 * Loads .env.local into process.env for scripts that run outside Next.js
 * (like drizzle migrate, seed, etc.)
 * 
 * Usage: import './load-env' at the very top of your script
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');

try {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    // Remove surrounding quotes if present
    const unquoted = value.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    if (!(key in process.env)) {
      process.env[key] = unquoted;
    }
  }
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
    console.warn(`Could not load .env.local: ${err}`);
  }
}