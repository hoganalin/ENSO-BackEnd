import { expect, test as base } from '@playwright/test';

const product = {
  id: 'test-product', title: '隔離測試商品', category: '線香',
  price: 500, origin_price: 600, unit: '盒', inventory: 10,
  is_enabled: 1, imageUrl: '', imagesUrl: [],
};
const productResponse = () => ({ status: 200, json: {
  success: true, products: [product], pagination: { current_page: 1, total_pages: 1 },
} });

// Each case uses a fresh browser context. API traffic is always fulfilled or
// aborted here; no credential or request is forwarded to a real service.
const test = base.extend({
  api: [async ({ page, context, baseURL }, use) => {
    const api = {
      check: { status: 200, json: { success: true } },
      signin: { status: 200, json: { success: false } },
      products: productResponse(),
      write: { status: 400, json: { success: false, message: '售價不符測試規則' } },
      requests: [], errors: [], dialogs: [], unexpected: [],
    };
    page.on('pageerror', (error) => api.errors.push(error.message));
    page.on('dialog', async (dialog) => { api.dialogs.push(dialog.message()); await dialog.dismiss(); });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      const isApi = /\/api\/|\/admin\/signin$|\/logout$/.test(url.pathname);
      if (!isApi) return url.origin === new URL(baseURL).origin ? route.continue() : route.abort();
      api.requests.push(url.pathname);
      let response;
      if (url.pathname.endsWith('/admin/signin')) response = api.signin;
      else if (url.pathname.endsWith('/api/user/check')) response = api.check;
      else if (url.pathname.endsWith('/admin/products')) response = api.products;
      else if (url.pathname.endsWith('/admin/orders')) response = { status: 200, json: { success: true, orders: [], pagination: {} } };
      else if (url.pathname.includes('/admin/product/')) response = api.write;
      else if (url.pathname.endsWith('/logout')) response = { status: 200, json: { success: true } };
      else { api.unexpected.push(url.pathname); return route.abort(); }
      return response.abort ? route.abort('failed') : route.fulfill(response);
    });
    await use(api);
    expect(api.errors).toEqual([]);
    expect(api.dialogs).toEqual([]);
    expect(api.unexpected).toEqual([]);
  }, { auto: true }],
});

async function authenticate(context, baseURL, token = 'isolated-test-token') {
  await context.addCookies([{ name: 'myToken', value: token, url: new URL(baseURL).origin + '/' }]);
}
async function fillLogin(page) {
  await page.getByLabel('管理員電子郵件').fill('qa@example.com');
  await page.getByLabel('密碼', { exact: true }).fill('not-a-real-password');
}
const cookie = async (context) => (await context.cookies()).find((item) => item.name === 'myToken');

test('未登入不可讀取管理資料', async ({ page, api }) => {
  await page.goto('./#/admin/product');
  await expect(page).toHaveURL(/#\/login$/);
  expect(api.requests).toEqual([]);
});

test('登入拒絕、服務故障與斷線保留表單且不建立登入', async ({ page, context, api }) => {
  await page.goto('./#/login');
  await fillLogin(page);
  for (const [response, text] of [
    [{ status: 200, json: { success: false } }, '登入回應不完整'],
    [{ status: 503, json: {} }, '登入服務暫時無法使用'],
    [{ abort: true }, '目前無法連線'],
  ]) {
    api.signin = response;
    await page.getByRole('button', { name: '登入工作台', exact: true }).click();
    await expect(page.locator('form [role=alert]')).toContainText(text);
    expect(await cookie(context)).toBeUndefined();
    await expect(page.getByLabel('管理員電子郵件')).toHaveValue('qa@example.com');
  }
});

test('保持登入與工作階段 Cookie 期限正確', async ({ page, context, api }) => {
  const future = Math.floor(Date.now() / 1000) + 3600;
  for (const remember of [true, false]) {
    await context.clearCookies();
    api.signin = { status: 200, json: { success: true, token: 'isolated-test-token', expired: future * 1000 } };
    await page.goto('./#/login');
    await fillLogin(page);
    await page.getByLabel('保持登入').setChecked(remember);
    await page.getByRole('button', { name: '登入工作台', exact: true }).click();
    await expect(page.locator('.admin-topbar')).toBeVisible();
    expect((await cookie(context)).expires).toBe(remember ? future : -1);
  }
});

test('驗證失敗清除登入，服務故障可保留登入重試', async ({ page, context, baseURL, api }) => {
  await authenticate(context, baseURL);
  api.check = { status: 200, json: { success: false } };
  await page.goto('./#/admin/product');
  await expect(page).toHaveURL(/#\/login$/);
  expect(await cookie(context)).toBeUndefined();
  await authenticate(context, baseURL);
  api.check = { status: 500, json: {} };
  await page.goto('./#/admin/product');
  await expect(page.getByRole('heading', { name: '登入狀態確認暫停' })).toBeVisible();
  expect(await cookie(context)).toBeDefined();
  api.check = { status: 200, json: { success: true } };
  await page.getByRole('button', { name: '重新確認登入' }).click();
  await expect(page.getByRole('button', { name: '編輯隔離測試商品', exact: true })).toBeVisible();
});

test('商品列表可重試、儲存失敗保留輸入、401 導回登入', async ({ page, context, baseURL, api }) => {
  await authenticate(context, baseURL);
  api.products = { status: 500, json: {} };
  await page.goto('./#/admin/product');
  await expect(page.getByRole('alert')).toContainText('無法取得商品');
  api.products = productResponse();
  await page.getByRole('button', { name: '重新載入' }).click();
  await page.getByRole('button', { name: '編輯隔離測試商品', exact: true }).click();
  await page.getByLabel('售價（NT$）（必填）').fill('599');
  await page.getByRole('button', { name: '儲存商品', exact: true }).click();
  await expect(page.locator('dialog [role=alert]')).toContainText('售價不符測試規則');
  await expect(page.getByLabel('售價（NT$）（必填）')).toHaveValue('599');
  await page.getByRole('button', { name: '關閉視窗' }).click();
  api.products = { status: 401, json: {} };
  await page.reload();
  await expect(page).toHaveURL(/#\/login$/);
  expect(await cookie(context)).toBeUndefined();
});

test('展示商品圖片、鍵盤焦點、台幣與圖庫儲存', async ({ page, context, baseURL, api }) => {
  await authenticate(context, baseURL, 'enso-demo-token');
  await context.addInitScript(() => localStorage.setItem('enso_demo_seen_tour', '1'));
  await page.goto('./#/admin/product');
  await page.getByRole('button', { name: '編輯琥珀黃昏', exact: true }).click();
  await expect(page.locator('dialog img')).toHaveCount(5);
  await expect.poll(() => page.locator('dialog img').evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 0))).toBe(true);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
  const geometry = await page.locator('dialog').evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
  await page.getByLabel('售價（NT$）（必填）').fill('999');
  await page.getByRole('button', { name: '移除圖庫第 4 張' }).click();
  await page.getByRole('button', { name: '儲存商品', exact: true }).click();
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: '編輯琥珀黃昏', exact: true }).click();
  await expect(page.getByLabel('售價（NT$）（必填）')).toHaveValue('999');
  await expect(page.locator('.gallery-editor-preview')).toHaveCount(3);
  await page.getByRole('button', { name: '關閉視窗' }).click();
  await expect(page.getByRole('button', { name: '編輯琥珀黃昏', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(api.requests).toEqual([]);
});
