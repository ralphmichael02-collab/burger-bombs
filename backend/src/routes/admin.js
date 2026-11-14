// backend/src/routes/admin.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/admin/stats', async (_req, res) => {
  try {
    // 1. Total Revenue & Order Counts
    const totalsRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total), 0)::float as total_sales,
        COUNT(id)::int as total_orders,
        COUNT(CASE WHEN order_type = 'ONLINE' THEN 1 END)::int as online_orders,
        COUNT(CASE WHEN order_type = 'POS' THEN 1 END)::int as pos_orders
      FROM orders
    `);

    // 2. Recent Orders (Latest 10)
    const recentOrdersRes = await pool.query(`
      SELECT id, total::float, order_type, status, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    // 3. Low Stock Ingredients (Where stock is less than or equal to low_stock threshold)
    const lowStockRes = await pool.query(`
      SELECT name, stock::float, unit, low_stock::float
      FROM ingredients 
      WHERE stock <= low_stock
    `);

    res.json({
      metrics: totalsRes.rows[0],
      recentOrders: recentOrdersRes.rows,
      lowStock: lowStockRes.rows
    });
  } catch (err) {
    console.error('[admin] error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;