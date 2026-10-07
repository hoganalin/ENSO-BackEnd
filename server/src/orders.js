import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { transaction } from './db.js';
import { listPage, productView, recordStock } from './catalog.js';
import { HttpError, orderCreateSchema, userSchema, requireVersion, idSchema, pageSchema } from './validation.js';

const orderView = (row) => ({
  id: row.id, user: row.customer, products: row.items,
  total: Number(row.total_cents) / 100, is_paid: row.is_paid,
  create_at: Math.floor(new Date(row.created_at).getTime() / 1000),
  message: row.message, version: row.version, discount_percent: row.discount_percent,
});
const totalCents = (items, percent) => Math.round(Object.values(items).reduce((sum, item) => sum + item.price_cents * item.qty, 0) * percent / 100);
async function adjustStock(db, id, delta, actor, reason, guestId = null) {
  const product = (await db.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!product) throw new HttpError(404, '找不到訂單商品。');
  await recordStock(db, product, product.inventory + delta, actor, reason, guestId);
  if (delta) await db.query('UPDATE products SET inventory=inventory+$2,version=version+1 WHERE id=$1', [id, delta]);
}
const editSchema = z.object({
  version: z.number().int().positive(), is_paid: z.boolean().optional(), user: userSchema.optional(),
  message: z.string().max(2000).optional(),
  products: z.record(z.string(), z.object({ qty: z.coerce.number().int().min(1).max(1000) })).optional(),
});
// Caller owns the transaction. Staff orders and guest checkout share pricing and locks.
export async function createOrder(db, input, { adminId = null, guestId = null, expectedTotal } = {}) {
  if (new Set(input.items.map((item) => item.product_id)).size !== input.items.length) throw new HttpError(400, '同一商品請合併數量。');
  let percent = 100;
  if (input.coupon_code) {
    const coupon = (await db.query('SELECT * FROM coupons WHERE code=$1 AND is_enabled=true AND due_date>$2 FOR SHARE', [input.coupon_code, Math.floor(Date.now() / 1000)])).rows[0];
    if (!coupon) throw new HttpError(400, '優惠券不存在或已到期。');
    percent = coupon.percent;
  }
  const items = {};
  for (const item of [...input.items].sort((a, b) => a.product_id.localeCompare(b.product_id))) {
    const product = (await db.query('SELECT * FROM products WHERE id=$1 AND deleted_at IS NULL AND is_enabled=true FOR UPDATE', [item.product_id])).rows[0];
    if (!product) throw new HttpError(409, '商品未上架或不存在，請重新整理購物車。');
    await adjustStock(db, product.id, -item.qty, adminId, guestId ? '訪客結帳扣庫存' : '建立訂單扣庫存', guestId);
    items[product.id] = { id: product.id, product_id: product.id, qty: item.qty, price_cents: Number(product.price_cents), product: productView(product) };
  }
  const total = totalCents(items, percent);
  if (expectedTotal !== undefined && expectedTotal !== total) throw new HttpError(409, '商品金額已變更，請重新整理購物車並確認金額。');
  const row = (await db.query(`INSERT INTO orders(id,customer,items,discount_percent,total_cents,message,guest_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [randomUUID(), input.user, items, percent, total, input.message, guestId])).rows[0];
  return orderView(row);
}
export function orderRoutes(pool) {
  const router = Router();
  router.get('/orders', async (req, res) => {
    const result = await listPage(pool, 'orders', pageSchema.parse(req.query.page), 'WHERE cancelled_at IS NULL');
    res.json({ success: true, orders: result.rows.map(orderView), pagination: result.pagination });
  });
  // Staff-created order endpoint. Guest checkout has separate ownership and retry checks.
  router.post('/order', async (req, res) => {
    const input = orderCreateSchema.parse(req.body?.data);
    const order = await transaction(pool, (db) => createOrder(db, input, { adminId: req.adminId }));
    res.status(201).json({ success: true, order, orderId: order.id });
  });
  router.put('/order/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const input = editSchema.parse(req.body?.data);
    const order = await transaction(pool, async (db) => {
      const row = (await db.query('SELECT * FROM orders WHERE id=$1 AND cancelled_at IS NULL FOR UPDATE', [id])).rows[0];
      if (!row) throw new HttpError(404, '找不到訂單。');
      requireVersion(input.version, row.version);
      if (row.is_paid && input.is_paid === false) throw new HttpError(409, '已付款紀錄不可直接改為未付款，尚未提供退款流程。');
      const items = structuredClone(row.items);
      if (input.products) {
        const keys = Object.keys(items).sort();
        if (JSON.stringify(keys) !== JSON.stringify(Object.keys(input.products).sort())) throw new HttpError(400, '訂單僅能修改既有品項數量。');
        for (const key of keys) {
          const qty = input.products[key].qty;
          if (row.is_paid && qty !== items[key].qty) throw new HttpError(409, '已付款訂單不可修改數量。');
          await adjustStock(db, key, items[key].qty - qty, req.adminId, '修改訂單調整庫存');
          items[key].qty = qty;
        }
      }
      const result = await db.query(`UPDATE orders SET customer=$2,items=$3,total_cents=$4,is_paid=$5,message=$6,version=version+1 WHERE id=$1 RETURNING *`,
        [id, input.user || row.customer, items, totalCents(items, row.discount_percent), input.is_paid ?? row.is_paid, input.message ?? row.message]);
      return orderView(result.rows[0]);
    });
    res.json({ success: true, order });
  });
  router.delete('/orders/all', (_req, _res) => {
    throw new HttpError(409, '自建後端不提供清空全部訂單。請逐筆確認未付款訂單後取消，保留稽核紀錄。');
  });
  router.delete('/order/:id', async (req, res) => {
    await transaction(pool, async (db) => {
      const id = idSchema.parse(req.params.id);
      const row = (await db.query('SELECT * FROM orders WHERE id=$1 AND cancelled_at IS NULL FOR UPDATE', [id])).rows[0];
      if (!row) throw new HttpError(404, '找不到訂單。');
      if (row.is_paid) throw new HttpError(409, '已付款訂單不可刪除，尚未提供退款流程。');
      for (const key of Object.keys(row.items).sort()) await adjustStock(db, key, row.items[key].qty, req.adminId, '取消訂單回補庫存');
      await db.query('UPDATE orders SET cancelled_at=now(),version=version+1 WHERE id=$1', [id]);
    });
    res.json({ success: true, message: '訂單已取消，庫存已回補。' });
  });
  return router;
}
