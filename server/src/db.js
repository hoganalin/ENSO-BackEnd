import pg from 'pg';

export const createPool = (connectionString) => new pg.Pool({
  connectionString, max: 10, connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000, statement_timeout: 10000,
});

export async function transaction(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
