// backend/src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool, cloudPool } from '../db.js';
import { sendVerificationEmail } from '../utils/mailer.js';

const router = Router();
const JWT_SECRET = 'burger-bombs-secret-key-123'; 

router.post('/register', async (req, res) => {
  const { email, password, confirmPassword, name, phone } = req.body;
  
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const { rows } = await pool.query(
      `INSERT INTO customers (email, password_hash, name, phone, verification_token) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name`,
      [email, hash, name, phone, verificationToken]
    );

    if (cloudPool) {
      await cloudPool.query(
        `INSERT INTO customers (id, email, password_hash, name, phone, verification_token) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [rows[0].id, email, hash, name, phone, verificationToken]
      );
    }

    await sendVerificationEmail(email, name, verificationToken);

    res.json({ ok: true, message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/verify', async (req, res) => {
  const { token } = req.query;
  try {
    const { rows } = await pool.query(
      `UPDATE customers SET is_verified = TRUE, verification_token = NULL 
       WHERE verification_token = $1 RETURNING id, email, name`,
      [token]
    );
    
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });

    if (cloudPool) {
      await cloudPool.query(`UPDATE customers SET is_verified = TRUE WHERE id = $1`, [rows[0].id]);
    }

    const jwtToken = jwt.sign({ id: rows[0].id, name: rows[0].name }, JWT_SECRET);
    res.json({ ok: true, token: jwtToken, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(`SELECT * FROM customers WHERE email = $1`, [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (!rows[0].is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: rows[0].id, name: rows[0].name }, JWT_SECRET);
    res.json({ ok: true, token, user: { id: rows[0].id, email: rows[0].email, name: rows[0].name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Order History
router.get('/orders/:customerId', async (req, res) => {
  const { customerId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, status, total::float, created_at, items, delivery_address 
       FROM orders 
       WHERE customer_id = $1 
       ORDER BY created_at DESC`,
      [customerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;