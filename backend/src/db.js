// backend/src/db.js
import pg from 'pg';
import 'dotenv/config';

// 1. Primary Database (Local Docker OR Cloud Neon)
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('[Primary DB] error', err.message));

// 2. Cloud Sync Database (ONLY exists when running locally)
export const cloudPool = process.env.CLOUD_DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.CLOUD_DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
    })
  : null;

if (cloudPool) {
  cloudPool.on('error', (err) => console.error('[Cloud DB] error', err.message));
  console.log('[db] Cloud sync enabled (dual-mode)');
} else {
  console.log('[db] Running in single-database mode (cloud)');
}