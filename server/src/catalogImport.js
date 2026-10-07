import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { transaction } from './db.js';
import { productSchema, cents } from './validation.js';

const assetsRoot = fileURLToPath(new URL('../../assets/product-images/', import.meta.url));
const publicRoot = fileURLToPath(new URL('../../public/products/enso-v1/', import.meta.url));
const roles = ['main', 'detail', 'lifestyle', 'material', 'scale'];
const digest = (data) => createHash('sha256').update(data).digest('hex');
export function catalogId(key) {
  const hex = digest(`enso-catalog-import-v1:${key}`).slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
function inside(root, child) {
  const target = resolve(root, child);
  const path = relative(root, target);
  if (!path || path.startsWith('..') || isAbsolute(path)) throw new Error('Asset path must stay inside the catalog directory');
  return target;
}
export async function prepareCatalog(publicUrl) {
  const base = new URL(publicUrl);
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Invalid public image URL');
  const catalog = JSON.parse(await readFile(new URL('../data/catalog-drafts.json', import.meta.url), 'utf8'));
  const source = JSON.parse(await readFile(resolve(assetsRoot, 'manifest.json'), 'utf8'));
  const web = JSON.parse(await readFile(resolve(assetsRoot, 'web-manifest.json'), 'utf8'));
  const products = [];
  for (const entry of catalog.products) {
    if (!/^[a-z-]+$/.test(entry.slug)) throw new Error('Invalid product slug');
    const sourceProduct = source.products.find((p) => p.slug === entry.slug && p.productName === entry.title);
    if (!sourceProduct) throw new Error(`Source mapping missing: ${entry.slug}`);
    const images = [];
    for (const role of roles) {
      const raw = sourceProduct.assets.find((asset) => asset.role === role);
      const asset = web.assets.find((a) => a.slug === entry.slug && a.role === role && a.variant === 'full');
      if (!raw || !asset) throw new Error(`Missing image role: ${entry.slug}/${role}`);
      const original = await readFile(inside(assetsRoot, raw.localPath));
      if (digest(original) !== raw.sha256.toLowerCase()) throw new Error(`Original hash mismatch: ${raw.localPath}`);
      const content = await readFile(inside(assetsRoot, asset.localPath));
      const publicCopy = await readFile(inside(publicRoot, `${entry.slug}/${entry.slug}-${role}-v1-full.webp`));
      const hash = digest(content);
      if (hash !== asset.sha256.toLowerCase() || digest(publicCopy) !== hash) throw new Error(`Web image hash mismatch: ${asset.localPath}`);
      const info = await sharp(content, { limitInputPixels: 16000000 }).metadata();
      if (info.format !== 'webp' || info.width !== asset.width || info.height !== asset.height || content.length > 3 * 1024 * 1024) throw new Error(`Invalid image: ${asset.localPath}`);
      const id = catalogId(`image:${entry.slug}:${role}`);
      images.push({ id, role, content, sha256: hash, url: `${base.origin}/uploads/${id}` });
    }
    const data = productSchema.parse({
      ...entry, unit: '盒', inventory: 0, is_enabled: false,
      content: '概念商品草稿。成分、產地、尺寸、數量規格與包裝英文名稱尚待確認，圖片不是實拍。',
      feature: '售價沿用既有展示資料，未確認前不開放販售。圖片中的道具不代表隨附配件。',
      imageUrl: images[0].url, imagesUrl: images.slice(1).map((image) => image.url),
    });
    products.push({ id: catalogId(`product:${entry.slug}`), slug: entry.slug, data, images });
  }
  if (products.length !== 6 || new Set(products.map((p) => p.id)).size !== 6) throw new Error('Expected six unique products');
  return products;
}

// The entire batch is atomic. Stable IDs and a transaction lock make reruns safe,
// including after manual edits or soft deletion of an imported product.
export async function importCatalog(pool, { products, adminEmail, apply = false }) {
  return transaction(pool, async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(70101002)');
    const admin = (await db.query('SELECT id FROM admins WHERE email=$1 AND active=true', [adminEmail.toLowerCase()])).rows[0];
    if (!admin) throw new Error('An active importing administrator is required');
    const results = [];
    for (const item of products) {
      const existing = (await db.query('SELECT id FROM products WHERE id=$1 OR title=$2', [item.id, item.data.title])).rows;
      if (existing.length) {
        results.push({ title: item.data.title, action: 'skipped-existing', images: 0 });
        continue;
      }
      for (const image of item.images) {
        const old = (await db.query('SELECT content,mime FROM uploads WHERE id=$1', [image.id])).rows[0];
        if (old && (digest(old.content) !== image.sha256 || old.mime !== 'image/webp')) throw new Error(`Existing image differs: ${item.slug}/${image.role}`);
        if (apply && !old) await db.query('INSERT INTO uploads(id,content,mime,actor_id) VALUES ($1,$2,$3,$4)', [image.id, image.content, 'image/webp', admin.id]);
      }
      if (apply) {
        const p = item.data;
        await db.query(`INSERT INTO products(id,title,category,price_cents,origin_price_cents,inventory,is_enabled,details)
          VALUES ($1,$2,$3,$4,$5,0,false,$6)`,
        [item.id, p.title, p.category, cents(p.price), cents(p.origin_price), p]);
      }
      results.push({ title: item.data.title, action: apply ? 'created-draft' : 'would-create-draft', price: item.data.price, inventory: 0, images: item.images.length });
    }
    return results;
  });
}
