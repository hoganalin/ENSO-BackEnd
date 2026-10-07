import { randomBytes, randomUUID, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hex] = stored.split(':');
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}
export const tokenHash = (value) => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export async function createAdmin(pool, email, password) {
  if (!email || !password || password.length < 16) throw new Error('Admin email and password of at least 16 characters are required');
  await pool.query('INSERT INTO admins(id,email,password_hash) VALUES ($1,$2,$3) ON CONFLICT(email) DO NOTHING',
    [randomUUID(), email.toLowerCase(), await hashPassword(password)]);
}
export function authMiddleware(pool) {
  return async (req, res, next) => {
    const token = (req.get('authorization') || '').replace(/^Bearer /i, '');
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(401).json({ success: false, message: '請先登入管理員帳號。' });
    const { rows } = await pool.query(`SELECT a.id FROM sessions s JOIN admins a ON a.id=s.admin_id
      WHERE s.token_hash=$1 AND s.expires_at>now() AND a.active=true`, [tokenHash(token)]);
    if (!rows[0]) return res.status(401).json({ success: false, message: '登入已失效，請重新登入。' });
    req.adminId = rows[0].id;
    req.tokenHash = tokenHash(token);
    next();
  };
}
