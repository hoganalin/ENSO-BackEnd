import { readConfig } from './config.js';
import { createPool } from './db.js';
import { createApp } from './app.js';

const config = readConfig();
const pool = createPool(config.databaseUrl);
await pool.query('SELECT 1');
const app = await createApp(pool, config);
const server = app.listen(config.port, config.host, () => console.log(`ENSO API listening on ${config.host}:${config.port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.close(async () => { await pool.end(); process.exit(0); });
});
