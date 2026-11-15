// backend/seedStaff.js
import bcrypt from 'bcryptjs';
import { pool } from './src/db.js';

console.log('🔄 Running schema migrations...');
try {
  await pool.query(`
    ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_token TEXT,
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
  `);
  console.log('✅ Schema updated.');

  // backend/seedStaff.js (updated staff array)
const staff = [
  { email: 'admin@burgerbombs.com',      name: 'Boss Admin',      role: 'admin' },
  { email: 'manager@burgerbombs.com',    name: 'Maria Manager',   role: 'manager' },
  { email: 'supervisor@burgerbombs.com', name: 'Pedro Supervisor', role: 'supervisor' },
  { email: 'cashier@burgerbombs.com',    name: 'Juan Cashier',    role: 'cashier' },
  { email: 'kitchen@burgerbombs.com',    name: 'Chef Boy',        role: 'kitchen' },
  { email: 'inventory@burgerbombs.com',  name: 'Ana Inventory',   role: 'inventory' },
];

  const password = await bcrypt.hash('password123', 10);

  for (const s of staff) {
    try {
      await pool.query(
        `INSERT INTO customers (email, password_hash, name, role, is_verified) 
         VALUES ($1, $2, $3, $4, TRUE) 
         ON CONFLICT (email) DO UPDATE 
         SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, is_verified = TRUE`,
        [s.email, password, s.name, s.role]
      );
      console.log(`✅ ${s.role}: ${s.email}`);
    } catch (err) {
      console.error(`❌ ${s.email}:`, err.message);
    }
  }

  console.log('\n🎉 Login with admin@burgerbombs.com / password123\n');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
} finally {
  process.exit(0);
}