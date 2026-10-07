import { readConfig } from '../src/config.js';
import { createPool } from '../src/db.js';
import { createAdmin } from '../src/auth.js';

const pool = createPool(readConfig().databaseUrl);
try {
  await createAdmin(pool, process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD);
  console.log('Local administrator ready. Existing accounts were not changed. No business data seeded.');
} finally { await pool.end(); }
