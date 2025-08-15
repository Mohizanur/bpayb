import mysql from 'mysql2/promise';

let pool = null;

export function isPlanetConfigured() {
  return !!process.env.DATABASE_URL && (process.env.DB_PROVIDER === 'planetscale' || /planetscale|mysql/i.test(process.env.DATABASE_URL));
}

export async function getMysql() {
  if (!isPlanetConfigured()) return null;
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  pool = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    ssl: { rejectUnauthorized: true }
  });
  console.log('✅ PlanetScale MySQL pool initialized');
  return pool;
}

export async function query(sql, params = []) {
  const db = await getMysql();
  if (!db) throw new Error('PlanetScale not configured');
  const [rows] = await db.execute(sql, params);
  return rows;
}