import { createPool } from '../src/db.js';
import { createShowcase } from '../src/showcase.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const control = createPool(process.env.DATABASE_URL);
const port = Number(process.env.SHOWCASE_PORT || (process.env.NODE_ENV === 'production' ? process.env.PORT : '') || 3002);
const publicUrl = process.env.SHOWCASE_PUBLIC_URL || `http://127.0.0.1:${port}`;
if (process.env.NODE_ENV === 'production' && (!process.env.SHOWCASE_PUBLIC_URL || new URL(publicUrl).protocol !== 'https:')) throw new Error('Production showcase requires explicit HTTPS SHOWCASE_PUBLIC_URL');
const service = await createShowcase({ control, databaseUrl: process.env.DATABASE_URL, publicUrl,
  origins: [publicUrl], trustProxy: process.env.TRUST_PROXY === '1' });
const listener = service.app.listen(port, process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => console.log(`ENSO showcase listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  listener.close(async () => { await service.close(); await control.end(); process.exit(0); });
});
