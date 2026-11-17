// backend/src/routes/branches.js
import { Router } from 'express';
import { pool, cloudPool } from '../db.js';

const router = Router();

// PUBLIC — active branches for LandingPage map
router.get('/branches', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, address, lat::float, lng::float, phone, hours,
              delivery_radius_km::float, is_main
         FROM branches
        WHERE is_active = TRUE
        ORDER BY is_main DESC, id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.warn('[branches] list failed, returning []', err.message);
    res.json([]);
  }
});

// ADMIN — all branches including inactive
router.get('/branches/all', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, address, lat::float, lng::float, phone, hours,
              delivery_radius_km::float, is_active, is_main,
              created_at, updated_at
         FROM branches
        ORDER BY is_main DESC, id ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN — create
router.post('/branches', async (req, res) => {
  const { name, address, lat, lng, phone, hours,
          delivery_radius_km, is_active, is_main } = req.body;
  if (!name || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, lat, lng are required' });
  }
  try {
    if (is_main) {
      await pool.query(`UPDATE branches SET is_main = FALSE`);
      if (cloudPool) await cloudPool.query(`UPDATE branches SET is_main = FALSE`);
    }
    const { rows } = await pool.query(
      `INSERT INTO branches
         (name, address, lat, lng, phone, hours, delivery_radius_km, is_active, is_main)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, address || null, lat, lng, phone || null, hours || null,
       delivery_radius_km ?? 5.0, is_active ?? true, is_main ?? false]
    );
    if (cloudPool) {
      await cloudPool.query(
        `INSERT INTO branches
           (id, name, address, lat, lng, phone, hours, delivery_radius_km, is_active, is_main)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [rows[0].id, name, address || null, lat, lng, phone || null, hours || null,
         delivery_radius_km ?? 5.0, is_active ?? true, is_main ?? false]
      );
    }
    res.json({ ok: true, branch: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN — update
router.put('/branches/:id', async (req, res) => {
  const { id } = req.params;
  const { name, address, lat, lng, phone, hours,
          delivery_radius_km, is_active, is_main } = req.body;
  try {
    if (is_main) {
      await pool.query(`UPDATE branches SET is_main = FALSE WHERE id != $1`, [id]);
      if (cloudPool) await cloudPool.query(`UPDATE branches SET is_main = FALSE WHERE id != $1`, [id]);
    }
    const { rows } = await pool.query(
      `UPDATE branches SET
         name               = COALESCE($1, name),
         address            = COALESCE($2, address),
         lat                = COALESCE($3, lat),
         lng                = COALESCE($4, lng),
         phone              = COALESCE($5, phone),
         hours              = COALESCE($6, hours),
         delivery_radius_km = COALESCE($7, delivery_radius_km),
         is_active          = COALESCE($8, is_active),
         is_main            = COALESCE($9, is_main),
         updated_at         = NOW()
       WHERE id = $10 RETURNING *`,
      [name, address, lat, lng, phone, hours,
       delivery_radius_km, is_active, is_main, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    if (cloudPool) {
      await cloudPool.query(
        `UPDATE branches SET
           name               = COALESCE($1, name),
           address            = COALESCE($2, address),
           lat                = COALESCE($3, lat),
           lng                = COALESCE($4, lng),
           phone              = COALESCE($5, phone),
           hours              = COALESCE($6, hours),
           delivery_radius_km = COALESCE($7, delivery_radius_km),
           is_active          = COALESCE($8, is_active),
           is_main            = COALESCE($9, is_main),
           updated_at         = NOW()
         WHERE id = $10`,
        [name, address, lat, lng, phone, hours,
         delivery_radius_km, is_active, is_main, id]
      );
    }
    res.json({ ok: true, branch: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN — delete (guards against deleting the last one)
router.delete('/branches/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM branches`);
    if (rows[0].c <= 1) {
      return res.status(400).json({
        error: 'Cannot delete the last branch. Add another first.',
      });
    }
    await pool.query(`DELETE FROM branches WHERE id = $1`, [id]);
    if (cloudPool) await cloudPool.query(`DELETE FROM branches WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;