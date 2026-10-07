import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { createPool } from '../src/db.js';
import { createAdmin } from '../src/auth.js';
import { migrate } from '../scripts/migrate.js';

const schema = `enso_test_${randomUUID().replaceAll('-', '')}`;
const email = 'isolated-test@enso.local';
const password = randomUUID() + randomUUID();
let pool, control, server, base, token;
const product = { title: '整合測試線香', category: '測試', price: 980, origin_price: 1200, inventory: 20, is_enabled: 1, imageUrl: '', imagesUrl: [] };
const customer = { name: '隔離測試', email: 'customer@example.test', tel: '0900000000', address: '測試地址' };
async function request(path, { method = 'GET', data, auth = token, body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, { method,
    headers: { ...(auth ? { Authorization: auth } : {}), ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: data !== undefined ? JSON.stringify(data) : body,
  });
  return { status: response.status, body: await response.json() };
}
const api = (path, options) => request(`/api/enso/admin${path}`, options);
const createProduct = async (input = product) => (await api('/product', { method: 'POST', data: { data: input } })).body.product;
before(async () => {
  // A dedicated schema keeps all test writes out of the real local catalog.
  const url = new URL(process.env.DATABASE_URL);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/enso_local') throw new Error('Tests require the dedicated local enso_local database');
  control = createPool(process.env.DATABASE_URL);
  await control.query(`CREATE SCHEMA "${schema}"`);
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}`, max: 5 });
  await migrate(pool);
  await migrate(pool);
  await createAdmin(pool, email, password);
  const app = await createApp(pool, { shop: 'enso', origins: ['http://127.0.0.1:5175'], publicUrl: 'http://127.0.0.1:3001' });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await request('/admin/signin', { method: 'POST', data: { username: email, password } });
  assert.equal(login.status, 200);
  token = login.body.token;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool?.end();
  if (control) {
    // Only the generated schema owned by this test run is dropped.
    await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await control.end();
  }
});
test('health, authorization, invalid credentials and CORS', async () => {
  assert.equal((await request('/health', { auth: '' })).status, 200);
  assert.equal((await api('/products', { auth: '' })).status, 401);
  assert.equal((await api('/products', { auth: 'enso-demo-token' })).status, 401);
  assert.equal((await request('/admin/signin', { method: 'POST', data: { username: email, password: 'wrong' } })).status, 401);
  assert.equal((await api('/products', { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  assert.equal((await request('/api/other/admin/products')).status, 404);
});
test('product validation, persistent read, conflicting updates, soft delete', async () => {
  assert.equal((await api('/product', { method: 'POST', data: { data: { ...product, price: -1 } } })).status, 400);
  assert.equal((await api('/product', { method: 'POST', data: { data: { ...product, imageUrl: 'javascript:alert(1)' } } })).status, 400);
  const p = await createProduct({ ...product, title: "測試 '); DROP TABLE products; --" });
  assert.ok(p.id);
  assert.equal((await pool.query('SELECT title FROM products WHERE id=$1', [p.id])).rows[0].title, p.title);
  const updates = await Promise.all([10, 11].map((inventory) => api(`/product/${p.id}`, { method: 'PUT', data: { data: { ...p, inventory } } })));
  assert.deepEqual(updates.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await api('/products?page=0')).status, 400);
  assert.equal((await api(`/product/${p.id}`, { method: 'DELETE' })).status, 200);
  assert.ok((await pool.query('SELECT deleted_at FROM products WHERE id=$1', [p.id])).rows[0].deleted_at);
});
test('image bytes are validated, converted, persisted and publicly retrievable', async () => {
  const bad = new FormData();
  bad.append('file-to-upload', new Blob(['<script>bad</script>'], { type: 'image/png' }), 'test.png');
  assert.equal((await api('/upload', { method: 'POST', body: bad })).status, 400);
  const bytes = await sharp({ create: { width: 12, height: 16, channels: 3, background: '#12296b' } }).png().toBuffer();
  const form = new FormData();
  form.append('file-to-upload', new Blob([bytes], { type: 'image/png' }), 'test.png');
  const uploaded = await api('/upload', { method: 'POST', body: form });
  assert.equal(uploaded.status, 201);
  const image = await fetch(base + new URL(uploaded.body.imageUrl).pathname);
  assert.equal(image.headers.get('content-type'), 'image/webp');
  assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format, 'webp');
});
test('coupon uniqueness, order totals, stock and rollback are server controlled', async () => {
  const p = await createProduct({ ...product, inventory: 3 });
  const coupon = { title: '測試折扣', code: 'TEST90', percent: 90, due_date: Math.floor(Date.now() / 1000) + 3600, is_enabled: 1 };
  assert.equal((await api('/coupon', { method: 'POST', data: { data: coupon } })).status, 201);
  assert.equal((await api('/coupon', { method: 'POST', data: { data: coupon } })).status, 409);
  const created = await api('/order', { method: 'POST', data: { data: { user: customer, items: [{ product_id: p.id, qty: 2 }], coupon_code: 'TEST90', total: 1 } } });
  assert.equal(created.status, 201);
  const order = created.body.order;
  assert.equal(order.total, 1764);
  const forged = structuredClone(order);
  forged.products[p.id].product.price = 1;
  forged.products[p.id].price_cents = 1;
  assert.equal((await api(`/order/${order.id}`, { method: 'PUT', data: { data: forged } })).body.order.total, 1764);
  const failed = await api('/order', { method: 'POST', data: { data: { user: customer, items: [{ product_id: p.id, qty: 2 }] } } });
  assert.equal(failed.status, 409);
  assert.equal((await pool.query('SELECT inventory FROM products WHERE id=$1', [p.id])).rows[0].inventory, 1);
  assert.equal((await api(`/order/${order.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await api(`/order/${order.id}`, { method: 'DELETE' })).status, 404);
  assert.equal((await pool.query('SELECT inventory FROM products WHERE id=$1', [p.id])).rows[0].inventory, 3);
});
test('concurrent orders cannot oversell and paid records cannot be deleted', async () => {
  const p = await createProduct({ ...product, inventory: 1 });
  const results = await Promise.all([1, 2].map(() => api('/order', { method: 'POST', data: { data: { user: customer, items: [{ product_id: p.id, qty: 1 }] } } })));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const order = results.find((r) => r.status === 201).body.order;
  const paid = await api(`/order/${order.id}`, { method: 'PUT', data: { data: { version: order.version, is_paid: true } } });
  assert.equal(paid.status, 200);
  assert.equal((await api(`/order/${order.id}`, { method: 'DELETE' })).status, 409);
  assert.equal((await api('/orders/all', { method: 'DELETE' })).status, 409);
  assert.equal((await pool.query('SELECT inventory FROM products WHERE id=$1', [p.id])).rows[0].inventory, 0);
});
test('logout revokes server session and expired or disabled accounts are rejected', async () => {
  const login = await request('/admin/signin', { method: 'POST', data: { username: email, password } });
  const auth = login.body.token;
  assert.equal((await request('/api/user/check', { method: 'POST', auth })).status, 200);
  assert.equal((await request('/logout', { method: 'POST', auth })).status, 200);
  assert.equal((await request('/api/user/check', { method: 'POST', auth })).status, 401);
  await pool.query('UPDATE sessions SET expires_at=now()-interval \'1 second\'');
  assert.equal((await api('/products')).status, 401);
  const second = await request('/admin/signin', { method: 'POST', data: { username: email, password } });
  await pool.query('UPDATE admins SET active=false');
  assert.equal((await api('/products', { auth: second.body.token })).status, 401);
});
