import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// Run with Node and an installed Sharp package, or pass its absolute directory.
// Originals are hash-checked and never written. Existing outputs are refused.
const require = createRequire(import.meta.url);
const sharpIndex = process.argv.indexOf('--sharp');
const sharp = require(sharpIndex >= 0 ? process.argv[sharpIndex + 1] : 'sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const variants = [
  { name: 'full', width: 1122, quality: 86, usage: '商品詳情與圖庫' },
  { name: 'card', width: 560, quality: 82, usage: '商品卡片' },
  { name: 'thumb', width: 240, quality: 80, usage: '後台列表縮圖' },
];
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex').toUpperCase();
const resolveAsset = (relative) => {
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Asset path escapes root');
  return resolved;
};
const jobs = [];
for (const product of manifest.products) {
  for (const asset of product.assets) {
    const sourcePath = resolveAsset(asset.localPath);
    const source = await readFile(sourcePath);
    if (sha256(source) !== asset.sha256) throw new Error(`Original changed: ${asset.localPath}`);
    const inputMeta = await sharp(source).metadata();
    if (inputMeta.width !== asset.width || inputMeta.height !== asset.height) {
      throw new Error(`Original dimensions mismatch: ${asset.localPath}`);
    }
    for (const variant of variants) {
      const localPath = `web-v1/${product.slug}/${path.basename(asset.localPath, '.png')}-${variant.name}.webp`;
      const target = resolveAsset(localPath);
      try {
        await access(target);
        throw new Error(`Output already exists, use a new version directory: ${localPath}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      jobs.push({ product, asset, variant, sourcePath, target, localPath });
    }
  }
}

const results = [];
for (const job of jobs) {
  const { data, info } = await sharp(job.sourcePath)
    .rotate()
    .resize({ width: job.variant.width, withoutEnlargement: true })
    .toColourspace('srgb')
    .webp({ quality: job.variant.quality, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  // Decode every output, not just its header, before saving.
  const decoded = await sharp(data).raw().toBuffer({ resolveWithObject: true });
  const expectedWidth = Math.min(job.variant.width, job.asset.width);
  const expectedHeight = Math.round(job.asset.height * expectedWidth / job.asset.width);
  if (decoded.info.width !== expectedWidth || decoded.info.height !== expectedHeight) {
    throw new Error(`Output dimensions mismatch: ${job.localPath}`);
  }
  if (data.length >= job.asset.bytes || data.length > 3 * 1024 * 1024) {
    throw new Error(`Output exceeds size limit: ${job.localPath}`);
  }
  await mkdir(path.dirname(job.target), { recursive: true });
  await writeFile(job.target, data, { flag: 'wx' });
  results.push({
    slug: job.product.slug,
    productName: job.product.productName,
    role: job.asset.role,
    variant: job.variant.name,
    usage: job.variant.usage,
    sourcePath: job.asset.localPath,
    localPath: job.localPath,
    alt: job.asset.alt,
    targetField: job.asset.targetField,
    galleryIndex: job.asset.galleryIndex,
    width: info.width,
    height: info.height,
    bytes: data.length,
    quality: job.variant.quality,
    sha256: sha256(data),
  });
}

for (const product of manifest.products) {
  for (const asset of product.assets) {
    if (sha256(await readFile(resolveAsset(asset.localPath))) !== asset.sha256) {
      throw new Error(`Original changed during processing: ${asset.localPath}`);
    }
  }
}

const originalBytes = manifest.products.flatMap((p) => p.assets).reduce((sum, a) => sum + a.bytes, 0);
const totals = Object.fromEntries(variants.map((v) => {
  const items = results.filter((r) => r.variant === v.name);
  const bytes = items.reduce((sum, r) => sum + r.bytes, 0);
  return [v.name, { count: items.length, bytes, reductionPercent: Number(((1 - bytes / originalBytes) * 100).toFixed(2)) }];
}));
console.log(JSON.stringify({
  schemaVersion: 1,
  status: 'local-web-derivatives-not-published',
  sourceManifest: 'manifest.json',
  pathBase: 'assets/product-images',
  encoder: { name: 'sharp', version: sharp.versions.sharp, webp: sharp.versions.webp },
  originalBytes,
  originalHashesVerified: true,
  allOutputsDecoded: true,
  crop: false,
  resizedWithoutEnlargement: true,
  metadata: 'Web copies omit source metadata. Prompts remain in original PNGs and prompts directory.',
  totals,
  assets: results,
}, null, 2));
