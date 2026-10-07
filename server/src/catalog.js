import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { transaction } from './db.js';
import { HttpError, productSchema, couponSchema, requireVersion, idSchema, pageSchema, cents } from './validation.js';

export const productView = (row) => ({
  ...row.details, id: row.id, title: row.title, category: row.category,
  price: Number(row.price_cents) / 100, origin_price: Number(row.origin_price_cents) / 100,
  inventory: row.inventory, is_enabled: Number(row.is_enabled), version: row.version,
});
export const couponView = (row) => ({ ...row, due_date: Number(row.due_date), is_enabled: Number(row.is_enabled) });
export async function listPage(db, table, page, where = '') {
  // table/where are internal constants, never request input.
  const total = Number((await db.query(`SELECT count(*) FROM ${table} ${where}`)).rows[0].count);
  const rows = (await db.query(`SELECT * FROM ${table} ${where} ORDER BY created_at DESC,id LIMIT 20 OFFSET $1`, [(page - 1) * 20])).rows;
  const pages = Math.max(1, Math.ceil(total / 20));
  return { rows, pagination: { current_page: page, total_pages: pages, has_pre: page > 1, has_next: page < pages } };
}
export async function recordStock(db, product, next, actor, reason, guestId = null) {
  if (next < 0 || next > 1000000) throw new HttpError(409, '庫存不足或超過上限。');
  if (next === product.inventory) return;
  await db.query(`INSERT INTO inventory_logs(id,product_id,actor_id,delta,before_stock,after_stock,reason,guest_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [randomUUID(), product.id, actor, next - product.inventory, product.inventory, next, reason, guestId]);
}
export function catalogRoutes(pool) {
  const router = Router();
  router.get('/products', async (req, res) => {
    const result = await listPage(pool, 'products', pageSchema.parse(req.query.page), 'WHERE deleted_at IS NULL');
    res.json({ success: true, products: result.rows.map(productView), pagination: result.pagination });
  });
  router.post('/product', async (req, res) => {
    const p = productSchema.parse(req.body?.data);
    const product = await transaction(pool, async (db) => {
      const id = randomUUID();
      const row = (await db.query(`INSERT INTO products(id,title,category,price_cents,origin_price_cents,inventory,is_enabled,details)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, p.title, p.category, cents(p.price), cents(p.origin_price), p.inventory, p.is_enabled, p])).rows[0];
      await recordStock(db, { ...row, inventory: 0 }, p.inventory, req.adminId, '商品初始庫存');
      return productView(row);
    });
    res.status(201).json({ success: true, product });
  });
  router.put('/product/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const p = productSchema.parse(req.body?.data);
    const product = await transaction(pool, async (db) => {
      const old = (await db.query('SELECT * FROM products WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [id])).rows[0];
      if (!old) throw new HttpError(404, '找不到商品。');
      requireVersion(p.version, old.version);
      await recordStock(db, old, p.inventory, req.adminId, p.inventory_note || '商品或庫存管理調整');
      return productView((await db.query(`UPDATE products SET title=$2,category=$3,price_cents=$4,origin_price_cents=$5,
        inventory=$6,is_enabled=$7,details=$8,version=version+1 WHERE id=$1 RETURNING *`,
      [id, p.title, p.category, cents(p.price), cents(p.origin_price), p.inventory, p.is_enabled, p])).rows[0]);
    });
    res.json({ success: true, product });
  });
  router.delete('/product/:id', async (req, res) => {
    const result = await pool.query('UPDATE products SET deleted_at=now(),is_enabled=false,version=version+1 WHERE id=$1 AND deleted_at IS NULL', [idSchema.parse(req.params.id)]);
    if (!result.rowCount) throw new HttpError(404, '找不到商品。');
    res.json({ success: true });
  });
  router.get('/inventory/logs', async (req, res) => {
    if (req.query.product_id) {
      const id = idSchema.parse(req.query.product_id);
      const { rows } = await pool.query('SELECT * FROM inventory_logs WHERE product_id=$1 ORDER BY created_at DESC,id DESC LIMIT 5', [id]);
      return res.json({ success: true, logs: rows });
    }
    const result = await listPage(pool, 'inventory_logs', pageSchema.parse(req.query.page));
    res.json({ success: true, logs: result.rows, pagination: result.pagination });
  });
  router.get('/coupons', async (req, res) => {
    const result = await listPage(pool, 'coupons', pageSchema.parse(req.query.page));
    res.json({ success: true, coupons: result.rows.map(couponView), pagination: result.pagination });
  });
  router.post('/coupon', async (req, res) => {
    const p = couponSchema.parse(req.body?.data);
    const row = (await pool.query(`INSERT INTO coupons(id,title,code,percent,due_date,is_enabled) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), p.title, p.code, p.percent, p.due_date, p.is_enabled])).rows[0];
    res.status(201).json({ success: true, coupon: couponView(row) });
  });
  router.put('/coupon/:id', async (req, res) => {
    const p = couponSchema.parse(req.body?.data);
    if (!p.version) throw new HttpError(409, '請重新載入優惠券後再操作。');
    const row = (await pool.query(`UPDATE coupons SET title=$2,code=$3,percent=$4,due_date=$5,is_enabled=$6,version=version+1
      WHERE id=$1 AND version=$7 RETURNING *`, [idSchema.parse(req.params.id), p.title, p.code, p.percent, p.due_date, p.is_enabled, p.version])).rows[0];
    if (!row) throw new HttpError(409, '優惠券已變更，請重新載入。');
    res.json({ success: true, coupon: couponView(row) });
  });
  router.delete('/coupon/:id', async (req, res) => {
    const result = await pool.query('DELETE FROM coupons WHERE id=$1', [idSchema.parse(req.params.id)]);
    if (!result.rowCount) throw new HttpError(404, '找不到優惠券。');
    res.json({ success: true });
  });
  return router;
}
