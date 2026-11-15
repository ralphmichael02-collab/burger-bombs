// backend/seedStaff.js
import bcrypt from 'bcryptjs';
import { pool } from './src/db.js';

console.log('🔄 Running schema migrations...');

try {
  // 1. Force update the schema
  await pool.query(`
    ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_token TEXT,
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
  `);
  console.log('✅ Schema updated: password_hash, is_verified, verification_token, role added.');

  // 2. Staff Data
  const staff = [
    { email: 'admin@burgerbombs.com', name: 'Boss Admin', role: 'admin' },
    { email: 'manager@burgerbombs.com', name: 'Maria Manager', role: 'manager' },
    { email: 'cashier@burgerbombs.com', name: 'Juan Cashier', role: 'cashier' },
    { email: 'kitchen@burgerbombs.com', name: 'Chef Boy', role: 'kitchen' },
    { email: 'inventory@burgerbombs.com', name: 'Ana Inventory', role: 'inventory' },
  ];

  const password = await bcrypt.hash('password123', 10);

  console.log('🔄 Seeding staff accounts...');
  for (const s of staff) {
    try {
      await pool.query(
        `INSERT INTO customers (email, password_hash, name, role, is_verified) 
         VALUES ($1, $2, $3, $4, TRUE) 
         ON CONFLICT (email) DO UPDATE 
         SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, is_verified = TRUE`,
        [s.email, password, s.name, s.role]
      );
      console.log(`✅ Created ${s.role}: ${s.email}`);
    } catch (err) { 
      console.error(`❌ Error creating ${s.email}:`, err.message); 
    }
  }

  console.log('\n🎉 Done! You can now log in with:');
  console.log('   Email: admin@burgerbombs.com');
  console.log('   Password: password123\n');

} catch (err) {
  console.error('❌ Migration failed:', err.message);
  console.error('Check that your DATABASE_URL is correct and the database is running.');
} finally {
  process.exit(0);
}