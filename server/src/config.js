export function readConfig(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const shop = env.SHOP_PATH || 'enso';
  if (!/^[a-z0-9_-]{1,50}$/.test(shop)) throw new Error('Invalid SHOP_PATH');
  const publicUrl = new URL(env.PUBLIC_API_URL || 'http://127.0.0.1:3001');
  if (!['http:', 'https:'].includes(publicUrl.protocol)) throw new Error('Invalid PUBLIC_API_URL');
  if (env.NODE_ENV === 'production' && publicUrl.protocol !== 'https:') throw new Error('Production requires HTTPS');
  if (env.NODE_ENV === 'production' && env.ENABLE_GUEST_CHECKOUT === 'true') throw new Error('Guest checkout is local-only until payment, delivery and abuse policies are reviewed');
  return {
    databaseUrl: env.DATABASE_URL,
    port: Number(env.PORT || 3001), host: env.HOST || '127.0.0.1', shop,
    publicUrl: publicUrl.origin,
    origins: (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    checkoutEnabled: env.ENABLE_GUEST_CHECKOUT === 'true',
  };
}
