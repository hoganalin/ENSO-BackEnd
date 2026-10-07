const PRODUCTS = {
  1: ['amber-twilight', '琥珀黃昏'],
  2: ['forest-morning', '晨林沈靜'],
  3: ['dragon-resin', '龍血沉香'],
  4: ['white-sage', '白鼠尾草淨化'],
  5: ['jasmine-night', '茉莉月夜'],
  6: ['spring-dew', '春分雨露'],
};
const ROLES = ['main', 'detail', 'lifestyle', 'material', 'scale'];
const LEGACY_IMAGES = [
  'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773124274099.png',
  'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773126097700.png',
  'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773129441675.png',
];

function imageUrl(slug, role, variant = 'full') {
  const base = import.meta.env?.BASE_URL || '/';
  const pathname = `${base}products/enso-v1/${slug}/${slug}-${role}-v1-${variant}.webp`;
  return new URL(pathname, globalThis.location?.origin || 'http://localhost').href;
}

export function getDemoProductImages(id) {
  const product = PRODUCTS[id];
  if (!product) return {};
  return {
    imageUrl: imageUrl(product[0], 'main'),
    imagesUrl: ROLES.slice(1).map((role) => imageUrl(product[0], role)),
  };
}

// Only upgrade untouched legacy image fields of the six known fixtures.
// A custom title, main image, or gallery is evidence to leave the record alone.
export function upgradeLegacyProductImages(products) {
  return products.map((product) => {
    const known = PRODUCTS[product.id];
    if (
      !known ||
      product.title !== known[1] ||
      product.imageUrl !== LEGACY_IMAGES[(Number(product.id) - 1) % 3] ||
      (product.imagesUrl &&
        (!Array.isArray(product.imagesUrl) || product.imagesUrl.some(Boolean)))
    ) return product;
    return { ...product, ...getDemoProductImages(product.id) };
  });
}

// Match exact local fixture URLs, never rewrite arbitrary uploaded or API images.
export function getDemoImageVariant(src, variant) {
  if (!['thumb', 'card'].includes(variant)) return src;
  for (const [slug] of Object.values(PRODUCTS)) {
    for (const role of ROLES) {
      if (src === imageUrl(slug, role)) return imageUrl(slug, role, variant);
    }
  }
  return src;
}
