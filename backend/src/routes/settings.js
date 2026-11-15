import { Router } from 'express';
import { pool, cloudPool } from '../db.js';

const router = Router();

const DEFAULT_SETTINGS = {
  restaurant_name: 'Burger Bombs',
  tagline: 'Blowing diets since day one',
  site_title: 'Burger Bombs',
  favicon_url: '',
  logo_url: '',
  hero_image_url: '',
  hero_title: 'The Best Burgers in Town',
  hero_subtitle: 'Order online and get it delivered hot and fresh.',
  hero_button_text: 'Start Your Order',
  hero_button_link: '/store',
  currency_symbol: '₱',
  tax_rate: 0.12,
  theme_primary_color: '#EA580C',
  theme_bg_color: '#FDFBF7',
  theme_text_color: '#1A1C23',
  theme_card_color: '#FFFFFF',
  about_title: 'The Story Behind Burger Bombs',
  about_text: 'We serve the best burgers in town, made with 100% fresh ingredients.',
  about_image_url: '',
  feature_1_title: '100% Quality',
  feature_1_desc: 'Fresh ingredients sourced daily',
  feature_1_icon: 'ShieldCheck',
  feature_2_title: 'Live GPS Tracking',
  feature_2_desc: 'Watch your order arrive in real-time',
  feature_2_icon: 'MapPin',
  feature_3_title: 'Fast Delivery',
  feature_3_desc: 'Under 30 minutes guaranteed',
  feature_3_icon: 'Zap',
  show_features: true,
  show_about: true,
  footer_text: '© 2026 Burger Bombs. All rights reserved.',
  social_facebook: '',
  social_instagram: '',
  social_tiktok: '',
  social_twitter: '',
  contact_phone: '+63 912 345 6789',
  contact_email: 'hello@burgerbombs.com',
  promo_banner_text: '🔥 Free delivery on orders over ₱500! 🔥',
  brand_url: 'burger-bombs',
};

router.get('/settings', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM store_settings WHERE id = 1');
    res.json(rows[0] || DEFAULT_SETTINGS);
  } catch (err) {
    console.warn('[settings] DB error:', err.message);
    res.json(DEFAULT_SETTINGS);
  }
});

router.put('/settings', async (req, res) => {
  try {
    const columns = Object.keys(DEFAULT_SETTINGS);
    const values = columns.map(col => req.body[col] !== undefined ? req.body[col] : DEFAULT_SETTINGS[col]);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const { rows } = await pool.query(
      `UPDATE store_settings SET ${setClause} WHERE id = 1 RETURNING *`,
      values
    );

    if (cloudPool) {
      await cloudPool.query(`UPDATE store_settings SET ${setClause} WHERE id = 1`, values);
    }

    res.json({ ok: true, settings: rows[0] });
  } catch (err) {
    console.error('[settings] update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;