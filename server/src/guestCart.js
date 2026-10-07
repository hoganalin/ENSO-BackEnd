import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { transaction } from './db.js';
import { newToken, tokenHash } from './auth.js';
import { storefrontProductView } from './storefront.js';
import { createOrder } from './orders.js';
import { HttpError, idSchema, userSchema, requireVersion } from './validation.js';

const itemSchema = z.object({ product_id: idSchema, qty: z.number().int().min(1).max(1000) });
const checkoutSchema = z.object({
  user: userSchema, message: z.string().trim().max(2000).default(''),
  cart_version: z.number().int().positive(),
  expected_total_cents: z.number().int().min(0).max(5000000000000),
});
async function readCart(db, guest) {
  const { rows } = await db.query(`SELECT c.id AS cart_id,c.qty,p.* FROM cart_items c
    JOIN products p ON p.id=c.product_id WHERE c.guest_id=$1 ORDER BY c.id`, [guest.id]);
  let total = 0;
  const carts = rows.map((row) => {
    const visible = row.is_enabled && !row.deleted_at;
    const available = visible && row.inventory >= row.qty;
    const amount = visible ? Number(row.price_cents) * row.qty : 0;
    total += amount;
    return { id: row.cart_id, product_id: row.id, qty: row.qty,
      product: visible ? storefrontProductView(row) : { id: row.id, title: '商品已下架', is_enabled: 0, is_in_stock: false },
      total: amount / 100, final_total: amount / 100, available,
    };
  });
  return { carts, total: total / 100, final_total: total / 100, total_cents: total,
    version: guest.cart_version, can_checkout: carts.length > 0 && carts.every((item) => item.available) };
}

export function guestCartRoutes(pool, config) {
  const router = Router();
  const limited = (limit) => rateLimit({ windowMs: 60000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: '操作過於頻繁，請稍後再試。' } });
  const withGuest = (handler) => async (req, res) => {
    const token = req.get('X-Guest-Token') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, '請建立訪客購物車工作階段。');
    const result = await transaction(pool, async (db) => {
      // Serialize this visitor's mutations and checkout, never other visitors' carts.
      const guest = (await db.query('SELECT * FROM guest_sessions WHERE token_hash=$1 AND expires_at>now() FOR UPDATE', [tokenHash(token)])).rows[0];
      if (!guest) throw new HttpError(401, '購物車工作階段已過期，請重新建立。');
      return handler(db, guest, req);
    });
    res.status(result.status ?? 200).set('Cache-Control', 'no-store').json(result.body);
  };
  router.post('/guest/session', limited(10), async (_req, res) => {
    const token = newToken();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query('INSERT INTO guest_sessions(id,token_hash,expires_at) VALUES ($1,$2,$3)', [randomUUID(), tokenHash(token), expires]);
    res.status(201).set('Cache-Control', 'no-store').json({ success: true, token, expired: expires.getTime() });
  });
  router.delete('/guest/session', withGuest(async (db, guest) => {
    await db.query('UPDATE guest_sessions SET expires_at=now() WHERE id=$1', [guest.id]);
    return { body: { success: true } };
  }));
  router.get('/cart', withGuest(async (db, guest) => ({ body: { success: true, data: await readCart(db, guest) } })));
  const mutateItem = (replace) => withGuest(async (db, guest, req) => {
    const input = itemSchema.parse(req.body?.data);
    const existing = replace
      ? (await db.query('SELECT * FROM cart_items WHERE id=$1 AND guest_id=$2', [idSchema.parse(req.params.id), guest.id])).rows[0]
      : (await db.query('SELECT * FROM cart_items WHERE product_id=$1 AND guest_id=$2', [input.product_id, guest.id])).rows[0];
    if (replace && (!existing || existing.product_id !== input.product_id)) throw new HttpError(404, '找不到購物車品項。');
    const p = (await db.query('SELECT * FROM products WHERE id=$1 AND is_enabled=true AND deleted_at IS NULL', [input.product_id])).rows[0];
    if (!p) throw new HttpError(409, '商品未上架或不存在。');
    const qty = replace ? input.qty : input.qty + (existing?.qty ?? 0);
    if (qty > 1000 || qty > p.inventory) throw new HttpError(409, '數量超過可購買庫存或單項上限。');
    if (!existing && Number((await db.query('SELECT count(*) FROM cart_items WHERE guest_id=$1', [guest.id])).rows[0].count) >= 50) throw new HttpError(409, '購物車最多五十種商品。');
    await db.query(`INSERT INTO cart_items(id,guest_id,product_id,qty) VALUES ($1,$2,$3,$4)
      ON CONFLICT(guest_id,product_id) DO UPDATE SET qty=EXCLUDED.qty`, [existing?.id ?? randomUUID(), guest.id, input.product_id, qty]);
    guest.cart_version = (await db.query('UPDATE guest_sessions SET cart_version=cart_version+1 WHERE id=$1 RETURNING cart_version', [guest.id])).rows[0].cart_version;
    return { body: { success: true, data: await readCart(db, guest) } };
  });
  router.post('/cart', mutateItem(false));
  router.put('/cart/:id', mutateItem(true));
  router.delete('/cart/:id', withGuest(async (db, guest, req) => {
    const result = await db.query('DELETE FROM cart_items WHERE id=$1 AND guest_id=$2', [idSchema.parse(req.params.id), guest.id]);
    if (!result.rowCount) throw new HttpError(404, '找不到購物車品項。');
    await db.query('UPDATE guest_sessions SET cart_version=cart_version+1 WHERE id=$1', [guest.id]);
    return { body: { success: true } };
  }));
  router.delete('/carts', withGuest(async (db, guest) => {
    await db.query('DELETE FROM cart_items WHERE guest_id=$1', [guest.id]);
    await db.query('UPDATE guest_sessions SET cart_version=cart_version+1 WHERE id=$1', [guest.id]);
    return { body: { success: true } };
  }));
  router.post('/order', limited(10), (req, _res, next) => {
    if (!config.checkoutEnabled) throw new HttpError(503, '訪客結帳尚未開放，目前不接受訂單。');
    next();
  }, withGuest(async (db, guest, req) => {
    const key = idSchema.parse(req.get('Idempotency-Key'));
    const input = checkoutSchema.parse(req.body?.data);
    const hash = tokenHash(JSON.stringify(input));
    const previous = (await db.query('SELECT request_hash,order_id AS id,total_cents FROM checkout_requests WHERE guest_id=$1 AND request_key=$2', [guest.id, key])).rows[0];
    if (previous) {
      if (previous.request_hash !== hash) throw new HttpError(409, '相同送單代碼不可用於不同內容。');
      return { body: { success: true, orderId: previous.id, total: Number(previous.total_cents) / 100, payment_required: true, replayed: true } };
    }
    requireVersion(input.cart_version, guest.cart_version);
    if (config.showcase && Number((await db.query('SELECT count(*) FROM orders')).rows[0].count) >= 40) throw new HttpError(409, '此展示空間訂單已達上限。');
    const { rows: items } = await db.query('SELECT product_id,qty FROM cart_items WHERE guest_id=$1 ORDER BY product_id', [guest.id]);
    if (!items.length) throw new HttpError(409, '購物車是空的，無法送出訂單。');
    const order = await createOrder(db, { user: input.user, message: input.message, items }, { guestId: guest.id, expectedTotal: input.expected_total_cents });
    await db.query('INSERT INTO checkout_requests(guest_id,request_key,request_hash,order_id,total_cents) VALUES ($1,$2,$3,$4,$5)', [guest.id, key, hash, order.id, Math.round(order.total * 100)]);
    await db.query('DELETE FROM cart_items WHERE guest_id=$1', [guest.id]);
    await db.query('UPDATE guest_sessions SET cart_version=cart_version+1 WHERE id=$1', [guest.id]);
    return { status: 201, body: { success: true, orderId: order.id, total: order.total, payment_required: true, replayed: false } };
  }));
  return router;
}
