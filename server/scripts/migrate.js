import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readConfig } from '../src/config.js';
import { createPool, transaction } from '../src/db.js';

export async function migrate(pool) {
  const directory = new URL('../migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  await transaction(pool, async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(70101001)');
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const file of files) {
      const name = file.slice(0, -4);
      const { rowCount } = await db.query('SELECT name FROM schema_migrations WHERE name=$1', [name]);
      if (rowCount) continue;
      await db.query(await readFile(new URL(file, directory), 'utf8'));
      await db.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
    }
  });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = createPool(readConfig().databaseUrl);
  try { await migrate(pool); console.log('Database migration complete.'); }
  finally { await pool.end(); }
}
