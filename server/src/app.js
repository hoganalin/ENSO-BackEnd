import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import { z, ZodError } from 'zod';
import { authMiddleware, hashPassword, newToken, tokenHash, verifyPassword } from './auth.js';
import { catalogRoutes } from './catalog.js';
import { orderRoutes } from './orders.js';
import { storefrontRoutes } from './storefront.js';
import { guestCartRoutes } from './guestCart.js';
import { HttpError, idSchema } from './validation.js';

export async function createApp(pool, config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin(origin, callback) {
    if (!origin || config.origins.includes(origin)) return callback(null, true);
    callback(new HttpError(403, '此網站來源未獲授權。'));
  }, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Token', 'Idempotency-Key'] }));
  app.use(express.json({ limit: '256kb' }));
  app.use(rateLimit({ windowMs: 60000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: '請求過於頻繁，請稍後再試。' } }));
  const auth = authMiddleware(pool);
  const dummyHash = await hashPassword(newToken());
  app.get('/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ success: true, service: 'enso-api' });
  });
  app.post('/admin/signin', rateLimit({ windowMs: 15 * 60000, limit: 10, skipSuccessfulRequests: true,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: '登入嘗試過多，請稍後再試。' } }), async (req, res) => {
    const input = z.object({ username: z.string().email().max(254), password: z.string().min(1).max(256) }).parse(req.body);
    const admin = (await pool.query('SELECT * FROM admins WHERE email=$1', [input.username.toLowerCase()])).rows[0];
    const valid = await verifyPassword(input.password, admin?.password_hash || dummyHash);
    if (!valid || !admin?.active) throw new HttpError(401, '帳號或密碼錯誤。');
    const token = newToken();
    const expired = Date.now() + 8 * 60 * 60 * 1000;
    await pool.query('DELETE FROM sessions WHERE expires_at<=now()');
    await pool.query('INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES ($1,$2,$3)', [tokenHash(token), admin.id, new Date(expired)]);
    res.set('Cache-Control', 'no-store').json({ success: true, token, expired });
  });
  app.post('/api/user/check', auth, (_req, res) => res.set('Cache-Control', 'no-store').json({ success: true }));
  app.post('/logout', auth, async (req, res) => {
    await pool.query('DELETE FROM sessions WHERE token_hash=$1', [req.tokenHash]);
    res.json({ success: true });
  });
  const admin = express.Router();
  admin.use(auth, (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  if (config.showcase) admin.use(async (req, _res, next) => {
    const limits = { '/upload': ['uploads', 10], '/product': ['products', 30], '/coupon': ['coupons', 20], '/order': ['orders', 40] };
    const limit = req.method === 'POST' && limits[req.path];
    if (limit && Number((await pool.query(`SELECT count(*) FROM ${limit[0]}`)).rows[0].count) >= limit[1]) throw new HttpError(409, '此展示空間已達資料上限，請建立新空間。');
    next();
  });
  admin.use(catalogRoutes(pool), orderRoutes(pool));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 0, parts: 1 } });
  admin.post('/upload', rateLimit({ windowMs: 60000, limit: 10 }), upload.single('file-to-upload'), async (req, res) => {
    if (!req.file || !['image/png', 'image/jpeg', 'image/webp'].includes(req.file.mimetype)) throw new HttpError(400, '請選擇 3 MB 以下的 JPG、PNG 或 WebP 圖片。');
    let content;
    try {
      const image = sharp(req.file.buffer, { limitInputPixels: 16000000, animated: false });
      const metadata = await image.metadata();
      if (!['png', 'jpeg', 'webp'].includes(metadata.format)) throw new Error('Unsupported image');
      content = await image.rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    } catch { throw new HttpError(400, '圖片內容無法解析，請重新選擇有效圖片。'); }
    const id = randomUUID();
    await pool.query('INSERT INTO uploads(id,content,mime,actor_id) VALUES ($1,$2,$3,$4)', [id, content, 'image/webp', req.adminId]);
    res.status(201).json({ success: true, imageUrl: `${config.publicUrl}/uploads/${id}` });
  });
  app.use(`/api/${config.shop}/admin`, admin);
  app.use(`/api/${config.shop}`, storefrontRoutes(pool));
  app.use(`/api/${config.shop}`, guestCartRoutes(pool, config));
  app.get('/uploads/:id', async (req, res) => {
    const row = (await pool.query('SELECT content,mime FROM uploads WHERE id=$1', [idSchema.parse(req.params.id)])).rows[0];
    if (!row) throw new HttpError(404, '找不到圖片。');
    res.set({ 'Content-Type': row.mime, 'Cache-Control': 'public, max-age=31536000, immutable' }).send(row.content);
  });
  app.use((_req, res) => res.status(404).json({ success: false, message: '找不到 API。' }));
  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError) return res.status(400).json({ success: false, message: '欄位格式不正確。', fields: error.issues.map((issue) => issue.path.join('.')) });
    if (error instanceof multer.MulterError) return res.status(400).json({ success: false, message: '一次限上傳一張 3 MB 以下圖片。' });
    if (error.code === '23505') return res.status(409).json({ success: false, message: '資料已存在，請確認代碼是否重複。' });
    const status = error.status >= 400 && error.status < (error instanceof HttpError ? 600 : 500) ? error.status : 500;
    res.status(status).json({ success: false, message: error instanceof HttpError ? error.message : status === 500 ? '服務暫時無法處理，請稍後再試。' : '請求格式不正確。' });
    if (status === 500) console.error('API failure:', error.code || error.name);
  });
  return app;
}
