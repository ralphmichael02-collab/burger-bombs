// backend/src/routes/settings.js
import { Router } from 'express';
import { pool, cloudPool } from '../db.js';

const router = Router();

const DEFAULT_SETTINGS = {
  restaurant_name: 'Burger Bombs',
  tagline: 'Blowing diets since day one',
  logo_url: '',
  hero_image_url: '',
  hero_title: 'The Best Burgers in Town',
  hero_subtitle: 'Order online and get it delivered hot and fresh.',
  currency_symbol: '₱',
  tax_rate: 0.12,
  theme_primary_color: '#ea580c',
  theme_bg_color: '#f8fafc',
  about_text: 'We serve the best burgers in town, made with 100% fresh ingredients.',
  contact_phone: '+63 912 345 6789',
  contact_email: 'hello@burgerbombs.com',
  promo_banner_text: '🔥 Free delivery on orders over ₱500! 🔥',
  promo_banner_image: '',
  brand_url: 'burger-bombs'
};

router.get('/settings', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM store_settings WHERE id = 1');
    if (!rows[0]) return res.json(DEFAULT_SETTINGS);
    res.json(rows[0]);
  } catch (err) {
    console.error('[settings] DB error, returning defaults:', err.message);
    res.json(DEFAULT_SETTINGS);
  }
});

router.put('/settings', async (req, res) => {
  const { 
    restaurant_name, tagline, logo_url, hero_image_url, hero_title, hero_subtitle, 
    currency_symbol, tax_rate, theme_primary_color, theme_bg_color, about_text, 
    contact_phone, contact_email, promo_banner_text, brand_url
  } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE store_settings SET 
        restaurant_name = $1, tagline = $2, logo_url = $3, 
        hero_image_url = $4, hero_title = $5, hero_subtitle = $6, 
        currency_symbol = $7, tax_rate = $8, theme_primary_color = $9, 
        theme_bg_color = $10, about_text = $11, contact_phone = $12, 
        contact_email = $13, promo_banner_text = $14, brand_url = $15
       WHERE id = 1 RETURNING *`,
      [
        restaurant_name, tagline, logo_url, hero_image_url, hero_title, hero_subtitle, 
        currency_symbol, tax_rate, theme_primary_color, theme_bg_color, about_text, 
        contact_phone, contact_email, promo_banner_text, brand_url
      ]
    );
    
    if (cloudPool) {
      await cloudPool.query(
        `UPDATE store_settings SET 
          restaurant_name = $1, tagline = $2, logo_url = $3, 
          hero_image_url = $4, hero_title = $5, hero_subtitle = $6, 
          currency_symbol = $7, tax_rate = $8, theme_primary_color = $9, 
          theme_bg_color = $10, about_text = $11, contact_phone = $12, 
          contact_email = $13, promo_banner_text = $14, brand_url = $15
         WHERE id = 1`,
        [
          restaurant_name, tagline, logo_url, hero_image_url, hero_title, hero_subtitle, 
          currency_symbol, tax_rate, theme_primary_color, theme_bg_color, about_text, 
          contact_phone, contact_email, promo_banner_text, brand_url
        ]
      );
    }
    res.json({ ok: true, settings: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;