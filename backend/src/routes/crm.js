// backend/src/routes/crm.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Submit a review
router.post('/reviews', async (req, res) => {
  const { orderId, customerId, rating, comment } = req.body;
  try {
    await pool.query(
      `INSERT INTO reviews (order_id, customer_id, rating, comment) 
       VALUES ($1, $2, $3, $4)`,
      [orderId, customerId, rating, comment]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all reviews
router.get('/admin/reviews', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, c.name as customer_name, o.total::float as order_total
      FROM reviews r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN orders o ON r.order_id = o.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all customers (CRM)
router.get('/admin/customers', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        c.id, c.name, c.email, c.phone, c.created_at,
        COUNT(o.id)::int as total_orders,
        COALESCE(SUM(o.total), 0)::float as total_spent,
        MAX(o.created_at) as last_order
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id 
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;