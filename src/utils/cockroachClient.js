import pg from 'pg';
const { Pool } = pg;

let pool = null;

export function isCockroachConfigured() {
  return !!process.env.DATABASE_URL && (process.env.DB_PROVIDER === 'cockroach' || /cockroach|postgres/i.test(process.env.DATABASE_URL));
}

export function getPgPool() {
  if (!isCockroachConfigured()) return null;
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30000, ssl: { rejectUnauthorized: true } });
  pool.on('error', (err) => console.error('Postgres pool error:', err));
  console.log('✅ CockroachDB (pg) pool initialized');
  return pool;
}

export async function pgQuery(text, params = []) {
  const p = getPgPool();
  if (!p) throw new Error('Cockroach not configured');
  const client = await p.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}