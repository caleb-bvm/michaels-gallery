import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import { drizzle as drizzleLite } from 'drizzle-orm/pglite';
import { migrate as migrateLite } from 'drizzle-orm/pglite/migrator';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import { env } from '@/lib/env';
import * as schema from './schema';

export type DB = ReturnType<typeof drizzlePg<typeof schema>>;

const migrationsFolder = path.join(process.cwd(), 'drizzle');

/*
 * Postgres when DATABASE_URL is set (production), otherwise an embedded
 * Postgres (PGlite) stored in .data/db so development needs no setup.
 * Migrations in ./drizzle run once per process on first use.
 */
async function connect(): Promise<DB> {
  if (env.databaseUrl) {
    const client = postgres(env.databaseUrl, { max: 5, prepare: false });
    const db = drizzlePg(client, { schema });
    await migratePg(db, { migrationsFolder });
    return db;
  }
  const dir = path.join(env.dataDir, 'db');
  fs.mkdirSync(dir, { recursive: true });
  const lite = new PGlite(dir);
  const db = drizzleLite(lite, { schema });
  await migrateLite(db, { migrationsFolder });
  // Both drivers expose the same query builder; the cast keeps one type in the app.
  return db as unknown as DB;
}

const g = globalThis as unknown as { __mgDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  if (!g.__mgDb) {
    g.__mgDb = connect().catch((e) => {
      g.__mgDb = undefined;
      throw e;
    });
  }
  return g.__mgDb;
}

export { schema };
