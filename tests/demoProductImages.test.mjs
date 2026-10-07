import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { getDemoImageVariant, getDemoProductImages, upgradeLegacyProductImages } from '../src/service/demoProductImages.js';
import { getProducts, updateProduct } from '../src/service/demoStore.js';

const oldImage = 'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773124274099.png';
const legacy = () => ({ id: '1', title: '琥珀黃昏', imageUrl: oldImage, price: 777, inventory: 9, imagesUrl: [] });
let data;
beforeEach(() => {
  data = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: (key) => data.delete(key),
    },
  });
});

test('all six fixtures have a unique main and four ordered gallery URLs', () => {
  const products = getProducts();
  assert.equal(products.length, 6);
  assert.equal(new Set(products.map((p) => p.imageUrl)).size, 6);
  for (const p of products) {
    assert.equal(p.imagesUrl.length, 4);
    assert.match(p.imagesUrl[0], /-detail-v1-full.webp$/);
    assert.match(p.imagesUrl[3], /-scale-v1-full.webp$/);
    assert.equal(new URL(p.imageUrl).protocol, 'http:');
  }
});

test('legacy migration preserves non-image fields, deleted records and backup', () => {
  const original = [legacy()];
  localStorage.setItem('enso_demo_products', JSON.stringify(original));
  const products = getProducts();
  assert.equal(products.length, 1);
  assert.equal(products[0].price, 777);
  assert.equal(products[0].inventory, 9);
  assert.deepEqual(products[0].imagesUrl, getDemoProductImages('1').imagesUrl);
  assert.deepEqual(JSON.parse(localStorage.getItem('enso_demo_products_before_images_v1')), original);
  updateProduct('1', { imagesUrl: [] });
  assert.deepEqual(getProducts()[0].imagesUrl, []);
});

test('custom main, gallery, title and non-seed ID are untouched', () => {
  const custom = [
    { ...legacy(), imageUrl: 'https://example.com/custom.png' },
    { ...legacy(), imagesUrl: ['https://example.com/gallery.png'] },
    { ...legacy(), title: '自行改名' },
    { ...legacy(), id: 'custom' },
    { ...legacy(), imagesUrl: 'unexpected string' },
  ];
  assert.deepEqual(upgradeLegacyProductImages(custom), custom);
});

test('empty list stays empty and quota errors do not overwrite legacy data', () => {
  localStorage.setItem('enso_demo_products', '[]');
  assert.deepEqual(getProducts(), []);
  localStorage.removeItem('enso_demo_image_version');
  const original = [legacy()];
  localStorage.setItem('enso_demo_products', JSON.stringify(original));
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.deepEqual(getProducts(), original);
  assert.deepEqual(JSON.parse(localStorage.getItem('enso_demo_products')), original);
});

test('only known local full URLs receive a display variant', () => {
  const { imageUrl } = getDemoProductImages('1');
  assert.match(getDemoImageVariant(imageUrl, 'thumb'), /-thumb.webp$/);
  assert.match(getDemoImageVariant(imageUrl, 'card'), /-card.webp$/);
  for (const src of [undefined, '', 'https://example.com/amber-twilight-main-v1-full.webp']) {
    assert.equal(getDemoImageVariant(src, 'thumb'), src);
  }
  assert.equal(getDemoImageVariant(imageUrl, 'unknown'), imageUrl);
});
