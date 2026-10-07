import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '../../node_modules/@playwright/test/index.mjs';
import { readConfig } from '../src/config.js';
import { prepareCatalog } from '../src/catalogImport.js';

const config = readConfig();
const frontend = process.env.CATALOG_FRONTEND_URL || 'http://127.0.0.1:5175';
for (const value of [config.publicUrl, frontend]) {
  if (!['localhost', '127.0.0.1'].includes(new URL(value).hostname)) throw new Error('Verification is restricted to local services');
}
const expected = await prepareCatalog(config.publicUrl);
const output = fileURLToPath(new URL('../../.impeccable/review/imported-catalog/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext();
let token;
try {
  await context.route('**/*', (route) => {
    const origin = new URL(route.request().url()).origin;
    return [new URL(frontend).origin, config.publicUrl].includes(origin) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${frontend}/#/login`);
  await page.getByLabel('管理員電子郵件').fill(process.env.BOOTSTRAP_ADMIN_EMAIL);
  await page.getByLabel('密碼', { exact: true }).fill(process.env.BOOTSTRAP_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登入工作台', exact: true }).click();
  await expect(page.locator('.admin-topbar')).toBeVisible();
  token = (await context.cookies()).find((cookie) => cookie.name === 'myToken')?.value;
  assert.ok(token && token !== 'enso-demo-token');
  const response = await fetch(`${config.publicUrl}/api/${config.shop}/admin/products`, { headers: { Authorization: token } });
  assert.equal(response.status, 200);
  const { products } = await response.json();
  for (const entry of expected) {
    const product = products.find((p) => p.id === entry.id);
    assert.ok(product, `Missing imported product: ${entry.slug}`);
    assert.equal(product.title, entry.data.title);
    assert.equal(product.price, entry.data.price);
    assert.equal(product.is_enabled, 0);
    assert.equal(product.inventory, 0);
    assert.deepEqual([product.imageUrl, ...product.imagesUrl], entry.images.map((image) => image.url));
    for (const image of entry.images) {
      const result = await fetch(image.url);
      assert.equal(result.status, 200);
      assert.equal(result.headers.get('content-type'), 'image/webp');
      assert.equal(createHash('sha256').update(Buffer.from(await result.arrayBuffer())).digest('hex'), image.sha256);
    }
  }
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${frontend}/#/admin/product`);
    await page.reload();
    for (const entry of expected) {
      await page.getByRole('button', { name: '編輯' + entry.data.title, exact: true }).click();
      await expect(page.locator('dialog img')).toHaveCount(5);
      await expect.poll(() => page.locator('dialog img').evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 0))).toBe(true);
      await expect(page.getByLabel('上架此商品')).not.toBeChecked();
      await expect(page.getByLabel('目前庫存（必填）')).toHaveValue('0');
      const box = await page.locator('dialog').evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
      assert.ok(box.scroll <= box.client);
      if (entry === expected[0] && [1440, 390].includes(width)) await page.screenshot({ path: `${output}/editor-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: '關閉視窗' }).click();
    }
    assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), true);
    if ([1440, 390].includes(width)) await page.screenshot({ path: `${output}/catalog-${width}.png`, fullPage: true });
    console.log(`Verified six imported drafts and thirty gallery images at ${width}px after reload.`);
  }
  assert.deepEqual(errors, []);
  console.log('All thirty API image hashes match preserved source WebP assets. No catalog writes performed.');
} finally {
  if (token) await fetch(`${config.publicUrl}/logout`, { method: 'POST', headers: { Authorization: token } });
  await context.close();
  await browser.close();
}
