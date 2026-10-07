import { readConfig } from '../src/config.js';
import { createPool } from '../src/db.js';
import { prepareCatalog, importCatalog } from '../src/catalogImport.js';

const flags = process.argv.slice(2);
if (flags.some((arg) => arg !== '--apply')) throw new Error('Only --apply is supported');
const config = readConfig();
const url = new URL(config.databaseUrl);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/enso_local' || process.env.NODE_ENV === 'production') {
  throw new Error('Catalog import is restricted to the local enso_local database');
}
const products = await prepareCatalog(config.publicUrl);
const pool = createPool(config.databaseUrl);
try {
  const results = await importCatalog(pool, { products, adminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL, apply: flags.includes('--apply') });
  console.log(JSON.stringify({ mode: flags.includes('--apply') ? 'apply' : 'preview', results }, null, 2));
} finally { await pool.end(); }
