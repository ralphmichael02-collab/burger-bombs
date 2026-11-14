// backend/src/routes/menu.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/menu', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        m.id::int, 
        m.name, 
        m.price::float, 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM recipes r 
            JOIN ingredients i ON r.ingredient_id = i.id 
            WHERE r.menu_item_id = m.id AND i.stock < r.quantity
          ) THEN false 
          ELSE m.available 
        END as available
      FROM menu_items m 
      ORDER BY m.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('[menu] error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;