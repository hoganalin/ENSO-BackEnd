import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { createProduct, updateProduct, deleteProduct, getProducts, getOrders, updateOrder, deleteOrder, deleteAllOrders, getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../src/service/demoStore.js';
import { appendInventoryLog, getInventoryLogs } from '../src/service/inventoryLogs.js';

let data;
beforeEach(() => {
  data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  } });
});

test('demo CRUD persists updates and deletes without resetting other collections', () => {
  const order = getOrders()[0];
  const p = createProduct({ title: '儲存測試', price: 800 });
  updateProduct(p.id, { price: 900 });
  assert.equal(getProducts().find((item) => item.id === p.id).price, 900);
  deleteProduct(p.id);
  assert.equal(getProducts().some((item) => item.id === p.id), false);
  const c = createCoupon({ title: '測試', percent: 80 });
  updateCoupon(c.id, { percent: 90 });
  assert.equal(getCoupons().find((item) => item.id === c.id).percent, 90);
  deleteCoupon(c.id);
  assert.equal(getCoupons().some((item) => item.id === c.id), false);
  updateOrder(order.id, { is_paid: true });
  assert.equal(getOrders()[0].is_paid, true);
  deleteOrder(order.id);
  assert.equal(getOrders().some((item) => item.id === order.id), false);
  deleteAllOrders();
  assert.deepEqual(getOrders(), []);
  assert.equal(getProducts().length, 6);
});

test('every demo write reports storage failure and preserves saved values', () => {
  const p = getProducts()[0];
  const o = getOrders()[0];
  const c = getCoupons()[0];
  const saved = new Map(data);
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  for (const action of [
    () => createProduct({ title: '新商品' }), () => updateProduct(p.id, { price: 1 }), () => deleteProduct(p.id),
    () => updateOrder(o.id, { is_paid: true }), () => deleteOrder(o.id), () => deleteAllOrders(),
    () => createCoupon({ title: '新優惠' }), () => updateCoupon(c.id, { percent: 1 }), () => deleteCoupon(c.id),
  ]) {
    assert.throws(action, { code: 'DEMO_STORAGE_UNAVAILABLE' });
    assert.deepEqual(data, saved);
  }
});

test('inventory log is newest-first, capped at 200 and tolerates write failure', () => {
  for (let id = 0; id < 205; id++) assert.equal(appendInventoryLog({ id }), true);
  assert.equal(getInventoryLogs().length, 200);
  assert.equal(getInventoryLogs()[0].id, 204);
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(appendInventoryLog({ id: 205 }), false);
  assert.equal(getInventoryLogs()[0].id, 204);
});

test('malformed inventory logs never crash the page or get overwritten', () => {
  for (const raw of ['null', '{}', '"text"', '{broken']) {
    localStorage.setItem('enso_inventory_logs', raw);
    assert.deepEqual(getInventoryLogs(), []);
    assert.equal(appendInventoryLog({ id: 1 }), false);
    assert.equal(localStorage.getItem('enso_inventory_logs'), raw);
  }
  localStorage.setItem('enso_inventory_logs', '[null,1,{"id":2}]');
  assert.deepEqual(getInventoryLogs(), [{ id: 2 }]);
});
