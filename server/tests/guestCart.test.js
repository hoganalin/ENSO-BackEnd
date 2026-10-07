import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { migrate } from '../scripts/migrate.js';
import { createApp } from '../src/app.js';
import { createAdmin, tokenHash } from '../src/auth.js';
import { readConfig } from '../src/config.js';

const schema = `enso_guest_${randomUUID().replaceAll('-', '')}`;
let control, pool, server, closedServer, base, closedBase, admin;
const user = { name: '訪客測試', email: 'guest@example.test', tel: '0900000000', address: '隔離測試地址' };
async function request(path, { guest, method = 'GET', data, key, headers = {}, url = base } = {}) {
  const r = await fetch(`${url}/api/enso${path}`, { method, headers: {
    ...(guest ? { 'X-Guest-Token': guest } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}),
    ...(key ? { 'Idempotency-Key': key } : {}), ...headers,
  }, body: data ? JSON.stringify({ data }) : undefined });
  return { status: r.status, data: await r.json(), headers: r.headers };
}
async function guest() {
  const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  await pool.query("INSERT INTO guest_sessions(id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 days')", [randomUUID(), tokenHash(token)]);
  return token;
}
async function product({ stock = 10, enabled = true, cents = 98025 } = {}) {
  const id = randomUUID();
  await pool.query('INSERT INTO products(id,title,category,price_cents,origin_price_cents,inventory,is_enabled,details) VALUES($1,$2,$3,$4,$4,$5,$6,$7)',
    [id, '隔離結帳測試', '測試', cents, stock, enabled, { inventory_note: '內部紀錄', imageUrl: '/test.webp' }]);
  return id;
}
const add = (token, id, qty = 1) => request('/cart', { guest: token, method: 'POST', data: { product_id: id, qty } });
async function checkoutData(token) {
  const cart = (await request('/cart', { guest: token })).data.data;
  return { user, cart_version: cart.version, expected_total_cents: cart.total_cents };
}
const checkout = (token, data, key = randomUUID()) => request('/order', { guest: token, method: 'POST', data, key });
before(async () => {
  const url = new URL(process.env.DATABASE_URL);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/enso_local') throw new Error('Dedicated local ENSO database required');
  control = new pg.Pool({ connectionString: url.href });
  await control.query(`CREATE SCHEMA "${schema}"`);
  pool = new pg.Pool({ connectionString: url.href, options: `-c search_path=${schema}` });
  await migrate(pool);
  await migrate(pool);
  assert.equal((await pool.query('SELECT count(*) FROM schema_migrations')).rows[0].count, '2');
  const email = 'guest-test-admin@example.test', password = randomUUID();
  await createAdmin(pool, email, password);
  const config = { shop: 'enso', origins: ['http://127.0.0.1:5173'], publicUrl: 'http://127.0.0.1:3001', checkoutEnabled: true };
  server = (await createApp(pool, config)).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  closedServer = (await createApp(pool, { ...config, checkoutEnabled: false })).listen(0, '127.0.0.1');
  await once(closedServer, 'listening');
  closedBase = `http://127.0.0.1:${closedServer.address().port}`;
  const login = await fetch(`${base}/admin/signin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: email, password }) });
  admin = (await login.json()).token;
});
beforeEach(async () => {
  // Fresh application state per case isolates rate-limit windows without weakening them.
  await new Promise((resolve) => server.close(resolve));
  server = (await createApp(pool, { shop: 'enso', origins: ['http://127.0.0.1:5173'], publicUrl: 'http://127.0.0.1:3001', checkoutEnabled: true })).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  for (const running of [server, closedServer]) if (running) await new Promise((resolve) => running.close(resolve));
  await pool?.end();
  if (control) { await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await control.end(); }
});

test('guest session creation, expiry, revocation and admin separation', async () => {
  const issued = await request('/guest/session', { method: 'POST' });
  assert.equal(issued.status, 201);
  assert.equal(issued.headers.get('cache-control'), 'no-store');
  const token = issued.data.token;
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal((await pool.query('SELECT count(*) FROM guest_sessions WHERE token_hash=$1', [tokenHash(token)])).rows[0].count, '1');
  assert.equal((await request('/cart', { guest: token })).status, 200);
  assert.equal((await request('/cart')).status, 401);
  assert.equal((await request('/cart', { guest: admin })).status, 401);
  assert.equal((await request('/admin/products', { headers: { Authorization: token } })).status, 401);
  assert.equal((await request('/guest/session', { guest: token, method: 'DELETE' })).status, 200);
  assert.equal((await request('/cart', { guest: token })).status, 401);
  const expired = await guest();
  await pool.query("UPDATE guest_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1", [tokenHash(expired)]);
  assert.equal((await request('/cart', { guest: expired })).status, 401);
});
test('carts persist, merge quantities atomically and isolate visitors and item IDs', async () => {
  const a = await guest(), b = await guest(), id = await product();
  await Promise.all([add(a, id), add(a, id)]);
  const cart = (await request('/cart', { guest: a })).data.data;
  assert.equal(cart.carts.length, 1);
  assert.equal(cart.carts[0].qty, 2);
  assert.equal(cart.total, 1960.5);
  assert.equal(cart.can_checkout, true);
  assert.equal('inventory_note' in cart.carts[0].product, false);
  assert.equal((await request('/cart', { guest: b })).data.data.carts.length, 0);
  const path = `/cart/${cart.carts[0].id}`;
  assert.equal((await request(path, { guest: b, method: 'DELETE' })).status, 404);
  assert.equal((await request(path, { guest: b, method: 'PUT', data: { product_id: id, qty: 1 } })).status, 404);
  assert.equal((await request(path, { guest: a, method: 'PUT', data: { product_id: id, qty: 3 } })).status, 200);
  assert.equal((await pool.query('SELECT inventory FROM products WHERE id=$1', [id])).rows[0].inventory, 10);
  assert.equal((await request(path, { guest: a, method: 'DELETE' })).status, 200);
  await add(b, id);
  await add(a, id);
  await request('/carts', { guest: a, method: 'DELETE' });
  assert.equal((await request('/cart', { guest: a })).data.data.carts.length, 0);
  assert.equal((await request('/cart', { guest: b })).data.data.carts.length, 1);
});
test('invalid quantities, unavailable items and cart capacity are rejected', async () => {
  const token = await guest(), id = await product({ stock: 2 });
  for (const qty of [0, -1, 1.5, 1001, '1', 3]) assert.ok([400, 409].includes((await add(token, id, qty)).status));
  assert.equal((await add(token, await product({ enabled: false }))).status, 409);
  await add(token, id, 2);
  assert.equal((await add(token, id)).status, 409);
  // Seed only this isolated fixture to exercise the capacity boundary without extra HTTP traffic.
  for (let i = 0; i < 49; i++) {
    const other = await product();
    await pool.query('INSERT INTO cart_items(id,guest_id,product_id,qty) SELECT $1,id,$2,1 FROM guest_sessions WHERE token_hash=$3', [randomUUID(), other, tokenHash(token)]);
  }
  assert.equal((await add(token, await product())).status, 409);
});
test('checkout derives items and prices from database and retries create only one unpaid order', async () => {
  const token = await guest(), id = await product();
  await add(token, id, 2);
  const data = { ...await checkoutData(token), total: 1, is_paid: true, items: [{ product_id: randomUUID(), qty: 100 }] };
  const key = randomUUID();
  const results = await Promise.all([checkout(token, data, key), checkout(token, data, key)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
  assert.equal(results[0].data.orderId, results[1].data.orderId);
  assert.equal(results[0].data.total, 1960.5);
  const order = (await pool.query('SELECT * FROM orders WHERE id=$1', [results[0].data.orderId])).rows[0];
  assert.equal(order.is_paid, false);
  assert.equal(order.items[id].qty, 2);
  assert.equal((await pool.query('SELECT inventory FROM products WHERE id=$1', [id])).rows[0].inventory, 8);
  assert.equal((await request('/cart', { guest: token })).data.data.carts.length, 0);
  const log = (await pool.query('SELECT * FROM inventory_logs WHERE product_id=$1', [id])).rows[0];
  assert.equal(log.actor_id, null);
  assert.equal(log.guest_id, order.guest_id);
  assert.equal((await checkout(token, { ...data, message: '不同內容' }, key)).status, 409);
  assert.equal((await checkout(token, data)).status, 409);
  // A retry after starting a new cart must not clear the new items.
  await add(token, id);
  assert.equal((await checkout(token, data, key)).status, 200);
  assert.equal((await request('/cart', { guest: token })).data.data.carts.length, 1);
  assert.equal((await request(`/admin/order/${order.id}`, { method: 'DELETE', headers: { Authorization: admin } })).status, 200);
  assert.equal((await pool.query('SELECT inventory FROM products WHERE id=$1', [id])).rows[0].inventory, 10);
});
test('price changes, stale carts, malformed customer and missing retry keys cannot create orders', async () => {
  const token = await guest(), id = await product();
  await add(token, id);
  const data = await checkoutData(token);
  assert.equal((await request('/order', { guest: token, method: 'POST', data })).status, 400);
  assert.equal((await checkout(token, { ...data, user: { ...user, email: 'invalid' } })).status, 400);
  await add(token, id);
  assert.equal((await checkout(token, data)).status, 409);
  const current = await checkoutData(token);
  await pool.query('UPDATE products SET price_cents=1 WHERE id=$1', [id]);
  const logsBefore = (await pool.query('SELECT count(*) FROM inventory_logs WHERE product_id=$1', [id])).rows[0].count;
  assert.equal((await checkout(token, current)).status, 409);
  assert.equal((await pool.query('SELECT inventory FROM products WHERE id=$1', [id])).rows[0].inventory, 10);
  assert.equal((await pool.query('SELECT count(*) FROM inventory_logs WHERE product_id=$1', [id])).rows[0].count, logsBefore);
  assert.equal((await request('/cart', { guest: token })).data.data.carts[0].qty, 2);
});
test('unpublished products are redacted in old carts and checkout fully rolls back', async () => {
  const token = await guest(), a = await product(), b = await product();
  await add(token, a); await add(token, b);
  const data = await checkoutData(token);
  await pool.query('UPDATE products SET is_enabled=false WHERE id=$1', [b]);
  const cart = (await request('/cart', { guest: token })).data.data;
  assert.equal(cart.can_checkout, false);
  assert.equal(cart.carts.find((i) => i.product_id === b).product.title, '商品已下架');
  assert.equal((await checkout(token, data)).status, 409);
  assert.ok((await pool.query('SELECT inventory FROM products WHERE id=ANY($1::uuid[])', [[a, b]])).rows.every((p) => p.inventory === 10));
  assert.equal((await request('/cart', { guest: token })).data.data.carts.length, 2);
});
test('two visitors competing for the last unit cannot oversell', async () => {
  const a = await guest(), b = await guest(), id = await product({ stock: 1 });
  await add(a, id); await add(b, id);
  const results = await Promise.all([checkout(a, await checkoutData(a)), checkout(b, await checkoutData(b))]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await pool.query('SELECT inventory FROM products WHERE id=$1', [id])).rows[0].inventory, 0);
  const loser = results[0].status === 409 ? a : b;
  assert.equal((await request('/cart', { guest: loser })).data.data.carts.length, 1);
});
test('checkout stays closed by default and guest CORS headers require a permitted origin', async () => {
  assert.equal((await request('/order', { method: 'POST', data: {}, url: closedBase })).status, 503);
  assert.equal(readConfig({ DATABASE_URL: 'test' }).checkoutEnabled, false);
  assert.throws(() => readConfig({ DATABASE_URL: 'test', NODE_ENV: 'production', PUBLIC_API_URL: 'https://example.test', ENABLE_GUEST_CHECKOUT: 'true' }), /local-only/);
  const preflight = await fetch(`${base}/api/enso/order`, { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'X-Guest-Token,Idempotency-Key,Content-Type' } });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-headers'), /X-Guest-Token/);
  assert.equal((await request('/guest/session', { method: 'POST', headers: { Origin: 'https://untrusted.example' } })).status, 403);
});
test('guest session and checkout request bursts are rate limited', async () => {
  for (let index = 0; index < 10; index++) {
    assert.equal((await request('/guest/session', { method: 'POST' })).status, 201);
    assert.equal((await request('/order', { method: 'POST', data: {} })).status, 401);
  }
  assert.equal((await request('/guest/session', { method: 'POST' })).status, 429);
  assert.equal((await request('/order', { method: 'POST', data: {} })).status, 429);
});
