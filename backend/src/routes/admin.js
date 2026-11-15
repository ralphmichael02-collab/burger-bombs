// backend/src/routes/admin.js
import { Router } from 'express';
import { pool } from '../db.js';
import { cloudPool } from '../db.js'; // Make sure to import this

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

router.post('/ingredients/:id/restock', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body; // How much to add
  
  try {
    // Update Local Docker
    const { rows } = await pool.query(
      `UPDATE ingredients SET stock = stock + $1 WHERE id = $2 RETURNING *`,
      [amount, id]
    );
    
    // Sync to Neon (if cloudPool exists)
    if (cloudPool) {
      await cloudPool.query(
        `UPDATE ingredients SET stock = $1 WHERE id = $2`,
        [rows[0].stock, id]
      );
    }
    res.json({ ok: true, ingredient: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD NEW MENU ITEM (Local Only)
router.post('/menu', async (req, res) => {
  const { name, price, category, image_url, cost } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO menu_items (name, price, category, image_url, cost) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, price, category, image_url, cost]
    );
    
    if (cloudPool) {
      await cloudPool.query(
        `INSERT INTO menu_items (id, name, price, category, image_url, cost) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [rows[0].id, name, price, category, image_url, cost]
      );
    }
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DELETE MENU ITEM
router.delete('/menu/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM menu_items WHERE id = $1`, [id]);
    if (cloudPool) await cloudPool.query(`DELETE FROM menu_items WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. UPDATE INVENTORY LIST (Fetch all ingredients)
router.get('/ingredients', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM ingredients ORDER BY name ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;