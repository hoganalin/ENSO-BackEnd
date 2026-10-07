import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { migrate } from '../scripts/migrate.js';
import { createApp } from '../src/app.js';
import { createAdmin } from '../src/auth.js';

const schema = `enso_storefront_${randomUUID().replaceAll('-', '')}`;
let control, pool, server, base, token;
async function request(path, options) {
  const response = await fetch(`${base}/api/enso${path}`, options);
  return { status: response.status, cache: response.headers.get('cache-control'), data: await response.json() };
}
async function product(overrides = {}) {
  const response = await request('/admin/product', { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { title: '公開商品測試', category: '隔離測試', price: 980.25, origin_price: 1200,
      inventory: 2, is_enabled: true, unit: '盒', imageUrl: '/example.webp', imagesUrl: ['/detail.webp'],
      scenes: ['閱讀'], inventory_note: '內部備註不可公開', ...overrides } }) });
  assert.equal(response.status, 201);
  return response.data.product;
}
before(async () => {
  const url = new URL(process.env.DATABASE_URL);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/enso_local') throw new Error('Dedicated local ENSO database required');
  control = new pg.Pool({ connectionString: url.href });
  await control.query(`CREATE SCHEMA "${schema}"`);
  pool = new pg.Pool({ connectionString: url.href, options: `-c search_path=${schema}` });
  await migrate(pool);
  const email = 'storefront-test@example.test', password = randomUUID();
  await createAdmin(pool, email, password);
  const app = await createApp(pool, { shop: 'enso', origins: ['http://127.0.0.1:5173'], publicUrl: 'http://127.0.0.1:3001' });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/admin/signin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: email, password }) });
  assert.equal(login.status, 200);
  token = (await login.json()).token;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool?.end();
  if (control) {
    await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await control.end();
  }
});

test('empty public catalog needs no login and cannot disclose drafts by ID', async () => {
  const draft = await product({ is_enabled: false });
  const empty = await request('/products');
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.data.products, []);
  assert.deepEqual(empty.data.pagination, { current_page: 1, total_pages: 1, has_pre: false, has_next: false, total_items: 0 });
  assert.deepEqual((await request('/products/all')).data.products, []);
  assert.equal((await request(`/product/${draft.id}`)).status, 404);
  assert.equal((await request(`/product/${randomUUID()}`)).status, 404);
  assert.equal((await request('/admin/products')).status, 401);
});
test('public response preserves TWD and gallery but excludes all internal fields', async () => {
  const item = await product({ inventory: 0 });
  await pool.query("UPDATE products SET details=details || $2::jsonb WHERE id=$1", [item.id, JSON.stringify({ internal_supplier_cost: 100 })]);
  for (const path of ['/products', '/products/all', `/product/${item.id}`]) {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.equal(response.cache, 'no-store');
    const found = response.data.product ?? response.data.products.find((p) => p.id === item.id);
    assert.equal(found.price, 980.25);
    assert.equal(found.origin_price, 1200);
    assert.equal(found.is_in_stock, false);
    assert.equal(found.imageUrl, '/example.webp');
    assert.deepEqual(found.imagesUrl, ['/detail.webp']);
    assert.deepEqual(found.scenes, ['閱讀']);
    for (const key of ['inventory_note', 'internal_supplier_cost', 'inventory', 'version', 'details', 'deleted_at']) assert.equal(key in found, false);
  }
});
test('pagination is deterministic and categories are parameterized exact matches', async () => {
  const category = "線香 ' OR 1=1 --";
  const ids = [];
  for (let index = 0; index < 23; index++) ids.push((await product({ title: `分頁 ${index}`, category })).id);
  const filter = `category=${encodeURIComponent(category)}`;
  const first = (await request(`/products?${filter}`)).data;
  const second = (await request(`/products?${filter}&page=2`)).data;
  assert.equal(first.pagination.total_items, 23);
  assert.equal(first.pagination.total_pages, 2);
  assert.equal(first.pagination.has_next, true);
  assert.equal(second.pagination.has_pre, true);
  assert.equal(second.pagination.has_next, false);
  assert.equal(first.products.length, 20);
  assert.equal(second.products.length, 3);
  assert.deepEqual([...first.products, ...second.products].map((p) => p.id).sort(), ids.sort());
  assert.deepEqual((await request(`/products?${filter}`)).data, first);
  assert.equal((await request(`/products?${filter}&page=3`)).data.products.length, 0);
  assert.equal((await request('/products?category=不存在')).data.pagination.total_items, 0);
});
test('unpublishing and soft deletion immediately hide products across every public endpoint', async () => {
  const item = await product();
  assert.equal((await request(`/product/${item.id}`)).data.product.is_in_stock, true);
  const update = await request(`/admin/product/${item.id}`, { method: 'PUT', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { ...item, is_enabled: false } }) });
  assert.equal(update.status, 200);
  const deleted = await product();
  assert.equal((await request(`/admin/product/${deleted.id}`, { method: 'DELETE', headers: { Authorization: token } })).status, 200);
  for (const id of [item.id, deleted.id]) {
    assert.equal((await request(`/product/${id}`)).status, 404);
    assert.ok((await request('/products/all')).data.products.every((p) => p.id !== id));
    assert.ok((await request('/products')).data.products.every((p) => p.id !== id));
  }
});
test('invalid pagination, duplicate query values and bad IDs are rejected without database errors', async () => {
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=100001', 'page=Infinity', 'page=', 'page=1&page=2', 'category=a&category=b', `category=${'x'.repeat(101)}`]) {
    assert.equal((await request(`/products?${query}`)).status, 400, query);
  }
  assert.equal((await request('/product/not-an-id')).status, 400);
  assert.equal((await request('/products', { method: 'POST' })).status, 404);
  assert.equal((await request('/products', { headers: { Origin: 'https://not-allowed.example' } })).status, 403);
});
