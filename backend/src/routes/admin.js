// backend/src/routes/admin.js
import { Router } from 'express';
import { pool, cloudPool } from '../db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../public/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const router = Router();

// ==========================================
// 1. STATS (Overview Tab)
// ==========================================
router.get('/admin/stats', async (_req, res) => {
  try {
    const totalsRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total), 0)::float as total_sales,
        COUNT(id)::int as total_orders,
        COUNT(CASE WHEN order_type = 'ONLINE' THEN 1 END)::int as online_orders,
        COUNT(CASE WHEN order_type = 'POS' THEN 1 END)::int as pos_orders
      FROM orders WHERE status != 'VOIDED'
    `);

    const cogsRes = await pool.query(`
      SELECT COALESCE(SUM(
        (item->>'qty')::int * COALESCE((SELECT cost FROM menu_items WHERE id = (item->>'id')::int), 0)
      ), 0)::float as total_cost
      FROM orders, jsonb_array_elements(items::jsonb) as item
      WHERE status IN ('PENDING', 'COMPLETED', 'DELIVERED', 'RECEIVED')
    `);

        // Change the recentOrdersRes query to:
    const recentOrdersRes = await pool.query(`
      SELECT id, total::float, order_type, status, ip_address, delivery_address, created_at 
      FROM orders ORDER BY created_at DESC LIMIT 10
    `);

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
// 2. CHART DATA
// ==========================================
router.get('/admin/chart-data', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon DD') as date,
        SUM(total)::float as daily_sales
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '7 days' AND status != 'VOIDED'
      GROUP BY TO_CHAR(created_at, 'Mon DD'), DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. MENU MANAGEMENT
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

router.put('/admin/menu/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, image_url, cost } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE menu_items 
       SET name = $1, price = $2, category = $3, image_url = $4, cost = $5 
       WHERE id = $6 RETURNING *`,
      [name, price, category, image_url, cost, id]
    );
    
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
// 4. LOCAL IMAGE UPLOAD FALLBACK
// ==========================================
router.post('/admin/upload-local', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const protocol = req.get('host').includes('.test') ? 'https' : req.protocol;
  const localUrl = `${protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
  res.json({ url: localUrl });
});

// ==========================================
// 5. INVENTORY MANAGEMENT
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

// ==========================================
// 6. RECIPE / BOM MANAGEMENT
// ==========================================
router.get('/admin/menu/:id/recipe', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT ingredient_id, component_menu_item_id, quantity FROM recipes WHERE menu_item_id = $1`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/menu/:id/recipe', async (req, res) => {
  const { id } = req.params;
  const { ingredients } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM recipes WHERE menu_item_id = $1`, [id]);

    for (const ing of ingredients) {
      if (ing.quantity > 0) {
        await client.query(
          `INSERT INTO recipes (menu_item_id, ingredient_id, component_menu_item_id, quantity) VALUES ($1, $2, $3, $4)`,
          [id, ing.ingredient_id, ing.component_menu_item_id, ing.quantity]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 7. CATEGORY MANAGEMENT
// ==========================================
router.get('/admin/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/categories', async (req, res) => {
  const { name } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    
    if (cloudPool) {
      await cloudPool.query('INSERT INTO categories (name) VALUES ($1)', [name]);
    }
    res.json({ ok: true, category: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Category already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const catRes = await pool.query('SELECT name FROM categories WHERE id = $1', [id]);
    if (catRes.rowCount === 0) return res.status(404).json({ error: 'Category not found' });
    
    const catName = catRes.rows[0].name;
    const itemsRes = await pool.query('SELECT id FROM menu_items WHERE category = $1', [catName]);
    
    if (itemsRes.rowCount > 0) {
      return res.status(400).json({ error: `Cannot delete. ${itemsRes.rowCount} items are using this category.` });
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    if (cloudPool) await cloudPool.query('DELETE FROM categories WHERE id = $1', [id]);
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add to admin.js
router.get('/admin/pending-payments', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, total::float, payment_method, payment_reference, created_at 
      FROM orders 
      WHERE status = 'PENDING_PAYMENT' 
      ORDER BY created_at ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;