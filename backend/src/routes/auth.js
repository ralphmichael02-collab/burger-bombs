// backend/src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, cloudPool } from '../db.js';

const router = Router();
const JWT_SECRET = 'burger-bombs-secret-key-123'; 

router.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO customers (email, password_hash, name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, name`,
      [email, hash, name, phone]
    );
    if (cloudPool) {
      await cloudPool.query(
        `INSERT INTO customers (id, email, password_hash, name, phone) VALUES ($1, $2, $3, $4, $5)`,
        [rows[0].id, email, hash, name, phone]
      );
    }
    const token = jwt.sign({ id: rows[0].id, name: rows[0].name }, JWT_SECRET);
    res.json({ ok: true, token, user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(`SELECT * FROM customers WHERE email = $1`, [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: rows[0].id, name: rows[0].name }, JWT_SECRET);
    res.json({ ok: true, token, user: { id: rows[0].id, email: rows[0].email, name: rows[0].name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;