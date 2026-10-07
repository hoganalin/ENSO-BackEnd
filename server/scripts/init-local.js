import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const dbPassword = randomBytes(24).toString('hex');
const adminPassword = randomBytes(24).toString('base64url');
const content = [
  'PORT=3001', 'HOST=127.0.0.1',
  `DATABASE_URL=postgresql://enso:${dbPassword}@127.0.0.1:55439/enso_local`,
  `POSTGRES_PASSWORD=${dbPassword}`, 'SHOP_PATH=enso',
  'PUBLIC_API_URL=http://127.0.0.1:3001',
  'CORS_ORIGINS=http://127.0.0.1:5175,http://127.0.0.1:4175',
  'BOOTSTRAP_ADMIN_EMAIL=admin@enso.local',
  `BOOTSTRAP_ADMIN_PASSWORD=${adminPassword}`, '',
].join('\n');
// Exclusive creation prevents accidental rotation of a running database password.
await writeFile(new URL('../.env', import.meta.url), content, { flag: 'wx', mode: 0o600 });
console.log('Created server/.env with unique local credentials. Values are not printed.');
