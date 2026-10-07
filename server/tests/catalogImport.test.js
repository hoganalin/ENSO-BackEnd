import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { migrate } from '../scripts/migrate.js';
import { createAdmin } from '../src/auth.js';
import { prepareCatalog, importCatalog } from '../src/catalogImport.js';

const schema = `enso_import_${randomUUID().replaceAll('-', '')}`;
const email = 'catalog-test@example.test';
let pool, control, products;
before(async () => {
  const url = new URL(process.env.DATABASE_URL);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/enso_local') throw new Error('Local ENSO database required');
  control = new pg.Pool({ connectionString: url.href });
  await control.query(`CREATE SCHEMA "${schema}"`);
  pool = new pg.Pool({ connectionString: url.href, options: `-c search_path=${schema}` });
  await migrate(pool);
  await createAdmin(pool, email, randomUUID());
  products = await prepareCatalog('http://127.0.0.1:3001');
});
after(async () => {
  await pool?.end();
  if (control) {
    await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await control.end();
  }
});
test('preview validates thirty original/web mappings without writing data', async () => {
  const result = await importCatalog(pool, { products, adminEmail: email });
  assert.equal(result.filter((r) => r.action === 'would-create-draft').length, 6);
  assert.equal(products.flatMap((p) => p.images).length, 30);
  assert.equal((await pool.query('SELECT count(*) FROM products')).rows[0].count, '0');
  assert.equal((await pool.query('SELECT count(*) FROM uploads')).rows[0].count, '0');
});
test('a failed batch rolls back products and uploaded images together', async () => {
  const invalid = structuredClone(products);
  invalid[1].data.price = -1;
  await assert.rejects(importCatalog(pool, { products: invalid, adminEmail: email, apply: true }));
  assert.equal((await pool.query('SELECT count(*) FROM products')).rows[0].count, '0');
  assert.equal((await pool.query('SELECT count(*) FROM uploads')).rows[0].count, '0');
});
test('import creates six drafts, preserves later edits and never restores deleted items', async () => {
  const results = await Promise.all([1, 2].map(() => importCatalog(pool, { products, adminEmail: email, apply: true })));
  assert.equal(results.flat().filter((r) => r.action === 'created-draft').length, 6);
  assert.equal(results.flat().filter((r) => r.action === 'skipped-existing').length, 6);
  const rows = (await pool.query('SELECT * FROM products')).rows;
  assert.equal(rows.length, 6);
  assert.ok(rows.every((r) => !r.is_enabled && r.inventory === 0 && r.details.imagesUrl.length === 4));
  assert.equal((await pool.query('SELECT count(*) FROM uploads')).rows[0].count, '30');
  assert.equal((await pool.query('SELECT count(*) FROM orders')).rows[0].count, '0');
  await pool.query('UPDATE products SET title=$2,price_cents=12345,inventory=8,version=2 WHERE id=$1', [products[0].id, '自行修改的商品']);
  await pool.query('UPDATE products SET deleted_at=now() WHERE id=$1', [products[1].id]);
  const again = await importCatalog(pool, { products, adminEmail: email, apply: true });
  assert.ok(again.every((r) => r.action === 'skipped-existing'));
  const edited = (await pool.query('SELECT * FROM products WHERE id=$1', [products[0].id])).rows[0];
  assert.equal(edited.title, '自行修改的商品');
  assert.equal(edited.price_cents, '12345');
  assert.equal(edited.inventory, 8);
  assert.equal(edited.version, 2);
  assert.ok((await pool.query('SELECT deleted_at FROM products WHERE id=$1', [products[1].id])).rows[0].deleted_at);
  assert.equal((await pool.query('SELECT count(*) FROM uploads')).rows[0].count, '30');
});
