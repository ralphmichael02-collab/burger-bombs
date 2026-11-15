// backend/src/routes/admin.js
import { Router } from 'express';
import { pool, cloudPool } from '../db.js';

const router = Router();

// ==========================================
// 1. STATS (Overview Tab)
// ==========================================
router.get('/admin/stats', async (_req, res) => {
  try {
    // Total Revenue & Order Counts
    const totalsRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total), 0)::float as total_sales,
        COUNT(id)::int as total_orders,
        COUNT(CASE WHEN order_type = 'ONLINE' THEN 1 END)::int as online_orders,
        COUNT(CASE WHEN order_type = 'POS' THEN 1 END)::int as pos_orders
      FROM orders
    `);

    // Calculate Total Cost of Goods Sold (COGS) for Profit
    const cogsRes = await pool.query(`
      SELECT COALESCE(SUM(
        (item->>'qty')::int * COALESCE((SELECT cost FROM menu_items WHERE id = (item->>'id')::int), 0)
      ), 0)::float as total_cost
      FROM orders,
      jsonb_array_elements(items::jsonb) as item
      WHERE status IN ('PENDING', 'COMPLETED', 'DELIVERED', 'RECEIVED')
    `);

    // Recent Orders
    const recentOrdersRes = await pool.query(`
      SELECT id, total::float, order_type, status, created_at 
      FROM orders ORDER BY created_at DESC LIMIT 10
    `);

    // Low Stock Ingredients
    const lowStockRes = await pool.query(`
      SELECT name, stock::float, unit, low_stock::float 
      FROM ingredients WHERE stock <= low_stock
    `);

    res.json({
      metrics: {
        ...totalsRes.rows[0],
        total_cost: cogsRes.rows[0].total_cost,
        net_profit: totalsRes.rows[0].total_sales - cogsRes.rows[0].total_cost
      },
      recentOrders: recentOrdersRes.rows,
      lowStock: lowStockRes.rows
    });
  } catch (err) {
    console.error('[admin-stats] error', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. MENU MANAGEMENT (Menu Tab)
// ==========================================
router.get('/admin/menu', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM menu_items ORDER BY category, name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/menu', async (req, res) => {
  const { name, price, category, image_url, cost } = req.body;
  try {
    // Save to Local Docker
    const { rows } = await pool.query(
      `INSERT INTO menu_items (name, price, category, image_url, cost) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, price, category, image_url, cost]
    );
    
    // Sync to Cloud Neon
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

router.put('/admin/menu/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, image_url, cost } = req.body;
  
  try {
    // Update Local Docker
    const { rows } = await pool.query(
      `UPDATE menu_items 
       SET name = $1, price = $2, category = $3, image_url = $4, cost = $5 
       WHERE id = $6 RETURNING *`,
      [name, price, category, image_url, cost, id]
    );
    
    // Sync to Cloud Neon
    if (cloudPool) {
      await cloudPool.query(
        `UPDATE menu_items 
         SET name = $1, price = $2, category = $3, image_url = $4, cost = $5 
         WHERE id = $6`,
        [name, price, category, image_url, cost, id]
      );
    }
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/menu/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM menu_items WHERE id = $1`, [id]);
    if (cloudPool) await cloudPool.query(`DELETE FROM menu_items WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. INVENTORY MANAGEMENT (Inventory Tab)
// ==========================================
router.get('/ingredients', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM ingredients ORDER BY name ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ingredients/:id/restock', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body; 
  
  try {
    const { rows } = await pool.query(
      `UPDATE ingredients SET stock = stock + $1 WHERE id = $2 RETURNING *`, 
      [amount, id]
    );
    
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

export default router;