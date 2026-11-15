// backend/src/routes/crm.js
import { Router } from 'express';
import { pool, cloudPool } from '../db.js';

const router = Router();

router.post('/reviews', async (req, res) => {
  const { orderId, customerId, rating, comment } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO reviews (order_id, customer_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING id`,
      [orderId, customerId, rating, comment]
    );

    if (cloudPool) {
      // FIXED: Look up the sync_id so we can map to the cloud order ID
      const orderRes = await pool.query('SELECT sync_id FROM orders WHERE id = $1', [orderId]);
      if (orderRes.rowCount > 0) {
        const syncId = orderRes.rows[0].sync_id;
        await cloudPool.query(
          `INSERT INTO reviews (order_id, customer_id, rating, comment) 
           SELECT id, $2, $3, $4 FROM orders WHERE sync_id = $1`,
          [syncId, customerId, rating, comment]
        );
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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