// backend/src/routes/crm.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// SUBMIT REVIEW
router.post('/reviews', async (req, res) => {
  const { orderId, customerId, rating, comment } = req.body;
  try {
    await pool.query(
      `INSERT INTO reviews (order_id, customer_id, rating, comment) VALUES ($1, $2, $3, $4)`,
      [orderId, customerId, rating, comment]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Get All Reviews
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
    console.warn('[admin-reviews] Returning empty array:', err.message);
    res.json([]);
  }
});

export default router;