import { Router } from 'express';
import { z } from 'zod';
import { transaction } from './db.js';
import { HttpError, idSchema, pageSchema } from './validation.js';

const querySchema = z.object({
  page: z.string().regex(/^[1-9]\d*$/).optional().pipe(pageSchema),
  category: z.string().trim().max(100).default(''),
});
const visibleProducts = 'deleted_at IS NULL AND is_enabled=true';

// Explicit allowlist: admin notes, exact inventory and edit versions stay private.
export function storefrontProductView(row) {
  const details = row.details;
  return {
    id: row.id, title: row.title, category: row.category,
    price: Number(row.price_cents) / 100, origin_price: Number(row.origin_price_cents) / 100,
    is_enabled: 1, is_in_stock: row.inventory > 0,
    unit: details.unit ?? '', description: details.description ?? '', content: details.content ?? '',
    imageUrl: details.imageUrl ?? '', imagesUrl: details.imagesUrl ?? [],
    scenes: details.scenes ?? [], feature: details.feature ?? '',
    top_smell: details.top_smell ?? '', heart_smell: details.heart_smell ?? '', base_smell: details.base_smell ?? '',
  };
}

export function storefrontRoutes(pool) {
  const router = Router();
  // A product taken offline must disappear on the next request, including browser reloads.
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/products', async (req, res) => {
    const { page, category } = querySchema.parse(req.query);
    const result = await transaction(pool, async (db) => {
      await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      const where = `WHERE ${visibleProducts} AND ($1::text='' OR category=$1)`;
      const total = Number((await db.query(`SELECT count(*) FROM products ${where}`, [category])).rows[0].count);
      const { rows } = await db.query(`SELECT * FROM products ${where} ORDER BY created_at DESC,id LIMIT 20 OFFSET $2`, [category, (page - 1) * 20]);
      const pages = Math.max(1, Math.ceil(total / 20));
      return { products: rows.map(storefrontProductView), pagination: {
        current_page: page, total_pages: pages, has_pre: page > 1, has_next: page < pages, total_items: total,
      } };
    });
    res.json({ success: true, ...result });
  });
  // Matches the existing storefront's category discovery contract.
  router.get('/products/all', async (_req, res) => {
    const { rows } = await pool.query(`SELECT * FROM products WHERE ${visibleProducts} ORDER BY created_at DESC,id`);
    res.json({ success: true, products: rows.map(storefrontProductView) });
  });
  router.get('/product/:id', async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM products WHERE id=$1 AND ${visibleProducts}`, [idSchema.parse(req.params.id)]);
    if (!rows[0]) throw new HttpError(404, '找不到商品或商品尚未上架。');
    res.json({ success: true, product: storefrontProductView(rows[0]) });
  });
  return router;
}
