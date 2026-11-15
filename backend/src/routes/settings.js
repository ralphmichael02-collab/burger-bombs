// backend/src/routes/settings.js
import { Router } from 'express';
import { pool, cloudPool } from '../db.js';

const router = Router();

router.get('/settings', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM store_settings WHERE id = 1');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req, res) => {
  const { restaurant_name, tagline, logo_url, hero_image_url, hero_title, hero_subtitle, currency_symbol, tax_rate } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE store_settings SET 
        restaurant_name = $1, tagline = $2, logo_url = $3, 
        hero_image_url = $4, hero_title = $5, hero_subtitle = $6, 
        currency_symbol = $7, tax_rate = $8
       WHERE id = 1 RETURNING *`,
      [restaurant_name, tagline, logo_url, hero_image_url, hero_title, hero_subtitle, currency_symbol, tax_rate]
    );
    
    if (cloudPool) {
      await cloudPool.query(
        `UPDATE store_settings SET 
          restaurant_name = $1, tagline = $2, logo_url = $3, 
          hero_image_url = $4, hero_title = $5, hero_subtitle = $6, 
          currency_symbol = $7, tax_rate = $8
         WHERE id = 1`,
        [restaurant_name, tagline, logo_url, hero_image_url, hero_title, hero_subtitle, currency_symbol, tax_rate]
      );
    }
    res.json({ ok: true, settings: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;