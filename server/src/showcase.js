import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pg from 'pg';
import { createApp } from './app.js';
import { createAdmin, newToken, tokenHash } from './auth.js';
import { transaction } from './db.js';
import { migrate } from '../scripts/migrate.js';

const schemaPattern = /^enso_showcase_[a-f0-9]{32}$/;
const ttl = 30 * 60 * 1000;
export async function createShowcase({ control, databaseUrl, origins = [], publicUrl, maxWorkspaces = 10, trustProxy = false }) {
  await control.query(`CREATE TABLE IF NOT EXISTS enso_demo_workspaces (
    id uuid PRIMARY KEY, schema_name text NOT NULL UNIQUE, expires_at timestamptz NOT NULL
  )`);
  const cache = new Map();
  const opening = new Map();
  const app = express();
  app.disable('x-powered-by');
  if (trustProxy) app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
    connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: null,
  } }, crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use('/demo-api', rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: '展示操作過於頻繁，請稍後再試。' } }));
  app.use('/demo-api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/demo-api', (req, res, next) => {
    if (req.get('origin') && !origins.includes(req.get('origin'))) return res.status(403).json({ success: false, message: '此網站來源未獲授權。' });
    next();
  });
  async function dispose(row) {
    if (!schemaPattern.test(row.schema_name)) throw new Error('Invalid owned demo schema');
    await cache.get(row.id)?.pool.end();
    cache.delete(row.id);
    // Only registered, generated demonstration schemas are eligible for expiry cleanup.
    await transaction(control, async (db) => {
      await db.query(`DROP SCHEMA IF EXISTS "${row.schema_name}" CASCADE`);
      await db.query('DELETE FROM enso_demo_workspaces WHERE id=$1', [row.id]);
    });
  }
  async function cleanup() {
    const { rows } = await control.query('SELECT * FROM enso_demo_workspaces WHERE expires_at<=now()');
    for (const row of rows) await dispose(row);
  }
  async function open(row) {
    if (cache.has(row.id)) return cache.get(row.id);
    if (opening.has(row.id)) return opening.get(row.id);
    if (!schemaPattern.test(row.schema_name)) throw new Error('Invalid demo schema');
    const pending = (async () => {
      const pool = new pg.Pool({ connectionString: databaseUrl, options: `-c search_path=${row.schema_name}`, max: 2, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
      try {
        const api = await createApp(pool, { shop: 'enso', origins, publicUrl: `${publicUrl}/demo-api/${row.id}`, checkoutEnabled: true, showcase: true });
        const entry = { pool, api };
        cache.set(row.id, entry);
        return entry;
      } catch (error) { await pool.end(); throw error; }
    })();
    opening.set(row.id, pending);
    try { return await pending; } finally { opening.delete(row.id); }
  }
  app.get('/health', async (_req, res) => { await control.query('SELECT 1'); res.json({ success: true, service: 'enso-interview-showcase' }); });
  app.post('/demo-api/session', rateLimit({ windowMs: 3600000, limit: 6, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: '展示空間建立次數已達上限，請稍後再試。' } }), async (_req, res) => {
    await cleanup();
    const id = randomUUID(), schema = `enso_showcase_${id.replaceAll('-', '')}`, expires = new Date(Date.now() + ttl);
    const created = await transaction(control, async (db) => {
      await db.query('SELECT pg_advisory_xact_lock(70101003)');
      if (Number((await db.query('SELECT count(*) FROM enso_demo_workspaces')).rows[0].count) >= maxWorkspaces) return false;
      await db.query(`CREATE SCHEMA "${schema}"`);
      await db.query('INSERT INTO enso_demo_workspaces(id,schema_name,expires_at) VALUES ($1,$2,$3)', [id, schema, expires]);
      return true;
    });
    if (!created) return res.status(503).json({ success: false, message: '目前展示空間已滿，請約三十分鐘後重試。' });
    const row = { id, schema_name: schema };
    try {
      const { pool } = await open(row);
      await migrate(pool);
      await createAdmin(pool, 'interview@enso.example', newToken());
      const admin = (await pool.query('SELECT id FROM admins')).rows[0];
      const adminToken = newToken(), guestToken = newToken();
      await pool.query('INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES ($1,$2,$3)', [tokenHash(adminToken), admin.id, expires]);
      await pool.query('INSERT INTO guest_sessions(id,token_hash,expires_at) VALUES ($1,$2,$3)', [randomUUID(), tokenHash(guestToken), expires]);
      const catalog = JSON.parse(await readFile(new URL('../data/catalog-drafts.json', import.meta.url), 'utf8'));
      for (const p of catalog.products) {
        const image = (role) => `/products/enso-v1/${p.slug}/${p.slug}-${role}-v1-full.webp`;
        const details = { unit: '盒', imageUrl: image('main'), imagesUrl: ['detail', 'lifestyle', 'material', 'scale'].map(image),
          description: p.description, content: '面試展示用概念商品，不對外販售。圖片、價格及庫存僅供操作體驗。', scenes: ['閱讀', '靜心'], feature: '概念包裝展示，非實際商品規格' };
        await pool.query('INSERT INTO products(id,title,category,price_cents,origin_price_cents,inventory,is_enabled,details) VALUES ($1,$2,$3,$4,$5,12,true,$6)',
          [randomUUID(), p.title, p.category, p.price * 100, p.origin_price * 100, details]);
      }
      res.status(201).json({ success: true, id, expires: expires.getTime(), adminToken, guestToken });
    } catch (error) { await dispose(row); throw error; }
  });
  app.use('/demo-api/:id', async (req, res, next) => {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(req.params.id)) return res.status(404).json({ success: false, message: '找不到展示空間。' });
    const row = (await control.query('SELECT * FROM enso_demo_workspaces WHERE id=$1 AND expires_at>now()', [req.params.id])).rows[0];
    if (!row) return res.status(410).json({ success: false, message: '展示空間已到期，請回到展示入口建立新空間。' });
    const { api } = await open(row);
    api(req, res, next);
  });
  const root = fileURLToPath(new URL('../../', import.meta.url));
  app.use('/shop', express.static(`${root}storefront/dist`));
  app.use(express.static(`${root}dist`));
  app.use((_req, res) => res.status(404).json({ success: false, message: '找不到頁面。' }));
  app.use((error, _req, res, _next) => {
    console.error('Showcase failure:', error.code || error.name);
    res.status(500).json({ success: false, message: '展示服務暫時無法使用，請稍後再試。' });
  });
  let cleaning = false;
  const timer = setInterval(async () => {
    if (cleaning) return;
    cleaning = true;
    try { await cleanup(); } catch { console.error('Demo expiry cleanup failed'); } finally { cleaning = false; }
  }, 60000);
  timer.unref();
  return { app, cleanup, close: async () => { clearInterval(timer); await Promise.all([...cache.values()].map(({ pool }) => pool.end())); cache.clear(); } };
}
