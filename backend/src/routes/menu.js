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
        m.description,
        m.category,
        m.image_url,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM recipes r 
            JOIN ingredients i ON r.ingredient_id = i.id 
            WHERE r.menu_item_id = m.id AND i.stock < r.quantity
          ) THEN false 
          ELSE m.available 
        END as available,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'name', COALESCE(i.name, cm.name), 
            'quantity', r.quantity, 
            'unit', COALESCE(i.unit, 'item')
          ))
           FROM recipes r
           LEFT JOIN ingredients i ON r.ingredient_id = i.id
           LEFT JOIN menu_items cm ON r.component_menu_item_id = cm.id
           WHERE r.menu_item_id = m.id),
          '[]'::json
        ) as ingredients
      FROM menu_items m 
      ORDER BY m.category, m.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('[menu] error', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT name FROM categories ORDER BY name ASC');
    res.json(rows.map(r => r.name));
  } catch (err) {
    console.warn('[categories] Returning fallback:', err.message);
    res.json(['Burgers', 'Combos', 'Sides', 'Drinks', 'Desserts']);
  }
});

export default router;