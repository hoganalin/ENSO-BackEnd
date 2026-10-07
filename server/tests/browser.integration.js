import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import pg from 'pg';
import sharp from 'sharp';
import { chromium, expect } from '../../node_modules/@playwright/test/index.mjs';
import { createServer } from '../../node_modules/vite/dist/node/index.js';
import { createApp } from '../src/app.js';
import { createAdmin } from '../src/auth.js';
import { migrate } from '../scripts/migrate.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = fileURLToPath(new URL('../../.impeccable/review/real-api/', import.meta.url));
const schema = `enso_browser_${randomUUID().replaceAll('-', '')}`;
const dbUrl = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(dbUrl.hostname) || dbUrl.pathname !== '/enso_local') throw new Error('Local ENSO database required');
const control = new pg.Pool({ connectionString: dbUrl.href });
let pool, api, vite, browser;
const email = 'browser@example.test';
const password = randomUUID() + randomUUID();
try {
  await control.query(`CREATE SCHEMA "${schema}"`);
  pool = new pg.Pool({ connectionString: dbUrl.href, options: `-c search_path=${schema}` });
  await migrate(pool);
  await createAdmin(pool, email, password);
  const app = await createApp(pool, { shop: 'enso', origins: ['http://127.0.0.1:5178'], publicUrl: 'http://127.0.0.1:3001', checkoutEnabled: true });
  api = app.listen(0, '127.0.0.1');
  await once(api, 'listening');
  const apiBase = `http://127.0.0.1:${api.address().port}`;
  // Override only public settings. No credentials enter Vite's module graph.
  vite = await createServer({ root, configLoader: 'native',
    define: { 'import.meta.env.VITE_API_BASE': JSON.stringify(apiBase), 'import.meta.env.VITE_API_PATH': '"enso"', 'import.meta.env.VITE_API_MODE': '"self-hosted"' },
    server: { host: '127.0.0.1', port: 5178, strictPort: true },
  });
  await vite.listen();
  browser = await chromium.launch();
  await mkdir(output, { recursive: true });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Real requests to the local Express API are never mocked.
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    await page.goto('http://127.0.0.1:5178/#/login');
    await page.getByLabel('管理員電子郵件').fill(email);
    await page.getByLabel('密碼', { exact: true }).fill(password);
    await page.getByRole('button', { name: '登入工作台', exact: true }).click();
    await expect(page.locator('.admin-topbar')).toBeVisible();
    const auth = (await context.cookies()).find((cookie) => cookie.name === 'myToken').value;
    const call = async (path, method = 'GET', data) => {
      const response = await fetch(`${apiBase}/api/enso/admin${path}`, { method,
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: data ? JSON.stringify({ data }) : undefined });
      assert.ok(response.ok, `${method} ${path} failed: ${response.status}`);
      return response.json();
    };
    await page.goto('http://127.0.0.1:5178/#/admin/product');
    await page.getByRole('button', { name: '新增商品', exact: true }).click();
    const name = `真實串接驗證 ${width}`;
    await page.getByLabel('商品名稱（必填）').fill(name);
    await page.getByLabel('分類（必填）').fill('整合測試');
    await page.getByLabel('原價（NT$）（必填）').fill('1200');
    await page.getByLabel('售價（NT$）（必填）').fill('980');
    await page.getByLabel('目前庫存（必填）').fill('8');
    await page.getByLabel('上架此商品').check();
    const bytes = await sharp({ create: { width: 60, height: 80, channels: 3, background: '#09256f' } }).png().toBuffer();
    const uploaded = page.waitForResponse((r) => r.url().endsWith('/admin/upload') && r.request().method() === 'POST');
    await page.locator('input[type=file]').setInputFiles({ name: 'integration.png', mimeType: 'image/png', buffer: bytes });
    const uploadResponse = await uploaded;
    assert.equal(uploadResponse.status(), 201);
    // The configured public URL is independent of the randomly assigned test API port.
    const imagePath = new URL((await uploadResponse.json()).imageUrl).pathname;
    assert.equal((await fetch(apiBase + imagePath)).status, 200);
    await page.getByLabel('主圖網址', { exact: true }).fill(apiBase + imagePath);
    await page.getByRole('button', { name: '儲存商品', exact: true }).click();
    await expect(page.locator('dialog')).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: '編輯' + name, exact: true }).click();
    await expect(page.getByLabel('售價（NT$）（必填）')).toHaveValue('980');
    await expect(page.locator('dialog img').first()).toBeVisible();
    await page.getByLabel('售價（NT$）（必填）').fill('999');
    await page.getByLabel('商品特色').fill('真實 API 保留欄位');
    await page.getByRole('button', { name: '儲存商品', exact: true }).click();
    await expect(page.locator('dialog')).toHaveCount(0);
    const p = (await call('/products')).products.find((item) => item.title === name);
    assert.equal(p.price, 999);
    assert.equal(p.feature, '真實 API 保留欄位');
    await page.screenshot({ path: `${output}/products-${width}.png`, fullPage: true });
    await page.goto('http://127.0.0.1:5178/#/admin/inventory');
    await page.getByRole('row').filter({ hasText: name }).getByRole('button', { name: '調整庫存' }).click();
    await page.getByLabel('調整數量（正整數）').fill('2');
    await page.getByLabel('調整原因', { exact: true }).fill('跨裝置稽核測試');
    await page.getByRole('button', { name: '儲存庫存調整', exact: true }).click();
    await expect(page.locator('dialog')).toHaveCount(0);
    await page.reload();
    await page.getByRole('row').filter({ hasText: name }).getByRole('button', { name: '調整庫存' }).click();
    await expect(page.locator('.workspace-log-list')).toContainText('跨裝置稽核測試');
    await expect(page.locator('dialog')).toContainText('目前庫存 10');
    await page.getByRole('button', { name: '關閉視窗' }).click();
    const created = await call('/order', 'POST', { user: { name: `測試收件人 ${width}`, email: 'order@example.test', tel: '0900000000', address: '隔離測試地址' }, items: [{ product_id: p.id, qty: 1 }] });
    await page.goto('http://127.0.0.1:5178/#/admin/order');
    await page.getByRole('row').filter({ hasText: created.orderId }).getByRole('button', { name: '查看與編輯' }).click();
    await page.getByRole('button', { name: '標記為已付款', exact: true }).click();
    await expect(page.locator('dialog')).toHaveCount(0);
    const row = page.getByRole('row').filter({ hasText: created.orderId });
    await expect(row).toContainText('已付款');
    await expect(row.getByRole('button', { name: '取消訂單' })).toBeDisabled();
    // Exercise real browser CORS preflights and guest headers, not a storefront UI claim.
    const guestReceipt = await page.evaluate(async ({ apiBase, productId }) => {
      const base = `${apiBase}/api/enso`;
      const issued = await fetch(`${base}/guest/session`, { method: 'POST' });
      if (!issued.ok) throw new Error('Guest session failed');
      const { token } = await issued.json();
      const headers = { 'Content-Type': 'application/json', 'X-Guest-Token': token };
      const added = await fetch(`${base}/cart`, { method: 'POST', headers, body: JSON.stringify({ data: { product_id: productId, qty: 1 } }) });
      if (!added.ok) throw new Error('Guest cart failed');
      const cart = (await (await fetch(`${base}/cart`, { headers })).json()).data;
      const options = { method: 'POST', headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ data: {
        user: { name: '瀏覽器訪客', email: 'browser-guest@example.test', tel: '0900000000', address: '隔離測試地址' },
        cart_version: cart.version, expected_total_cents: cart.total_cents,
      } }) };
      const first = await fetch(`${base}/order`, options);
      const retry = await fetch(`${base}/order`, options);
      const receipt = await first.json(), replay = await retry.json();
      const empty = (await (await fetch(`${base}/cart`, { headers })).json()).data;
      await fetch(`${base}/guest/session`, { method: 'DELETE', headers });
      return { first: first.status, retry: retry.status, receipt, replay, remaining: empty.carts.length };
    }, { apiBase, productId: p.id });
    assert.equal(guestReceipt.first, 201);
    assert.equal(guestReceipt.retry, 200);
    assert.equal(guestReceipt.receipt.orderId, guestReceipt.replay.orderId);
    assert.equal(guestReceipt.receipt.total, 999);
    assert.equal(guestReceipt.remaining, 0);
    await page.reload();
    const guestRow = page.getByRole('row').filter({ hasText: guestReceipt.receipt.orderId });
    await expect(guestRow).toContainText('未付款');
    await expect(guestRow).toContainText('瀏覽器訪客');
    await page.screenshot({ path: `${output}/orders-${width}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), true);
    assert.deepEqual(errors, []);
    // API logout proves token invalidation even on mobile where navigation is collapsed.
    assert.equal((await fetch(`${apiBase}/logout`, { method: 'POST', headers: { Authorization: auth } })).status, 200);
    await page.reload();
    await expect(page).toHaveURL(/#\/login$/);
    await context.close();
    console.log(`Real API browser flow passed at ${width}px.`);
  }
} finally {
  await browser?.close();
  await vite?.close();
  if (api) await new Promise((resolve) => api.close(resolve));
  await pool?.end();
  await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await control.end();
}
