import { z } from 'zod';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const text = (max) => z.string().trim().max(max);
const money = z.number().finite().min(0).max(1000000).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001, '金額最多兩位小數');
const flag = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean);
const image = text(2048).refine((value) => {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}, '圖片必須是 HTTP 網址或站內路徑');
export const productSchema = z.object({
  title: text(200).min(1), category: text(100).min(1), unit: text(30).default('盒'),
  price: money, origin_price: money, inventory: z.number().int().min(0).max(1000000),
  is_enabled: flag, description: text(5000).default(''), content: text(10000).default(''),
  imageUrl: image.default(''), imagesUrl: z.array(image).max(5).default([]),
  scenes: z.array(text(300)).max(3).default([]), version: z.number().int().positive().optional(),
  feature: text(5000).default(''), top_smell: text(300).default(''),
  heart_smell: text(300).default(''), base_smell: text(300).default(''),
  inventory_note: text(500).optional(),
});
export const couponSchema = z.object({
  title: text(200).min(1), code: text(60).regex(/^[A-Za-z0-9_-]+$/),
  percent: z.number().int().min(1).max(100), due_date: z.number().int().min(0).max(4102444800),
  is_enabled: flag, version: z.number().int().positive().optional(),
});
export const userSchema = z.object({
  name: text(100).min(1), email: z.string().email().max(254),
  tel: text(40).min(1), address: text(500).min(1),
});
export const orderCreateSchema = z.object({
  user: userSchema, items: z.array(z.object({ product_id: z.string().uuid(), qty: z.number().int().min(1).max(1000) })).min(1).max(50),
  coupon_code: text(60).optional(), message: text(2000).default(''),
});
export function requireVersion(value, current) {
  if (value !== current) throw new HttpError(409, '資料已更新或缺少版本，請重新載入後再操作。');
}
export const idSchema = z.string().uuid();
export const pageSchema = z.coerce.number().int().min(1).max(100000).default(1);
export const cents = (value) => Math.round(value * 100);
