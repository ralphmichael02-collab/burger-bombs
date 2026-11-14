// backend/src/routes/sync.js
import { Router } from 'express';
import { pool } from '../db.js'; // Local Docker
import { queueCloudSync } from '../services/cloudSync.js'; // Cloud Bridge

const router = Router();

router.post('/sync', async (req, res) => {
  const { mutationId, type, payload } = req.body;

  if (!mutationId || !type || !payload) {
    return res.status(400).json({ error: 'mutationId, type, payload required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Save to LOCAL Docker Database
    const claim = await client.query(
      `INSERT INTO processed_mutations (mutation_id, type)
       VALUES ($1, $2) ON CONFLICT (mutation_id) DO NOTHING RETURNING mutation_id`,
      [mutationId, type]
    );

    if (claim.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.json({ ok: true, duplicate: true });
    }

    let newOrderId = null;

    if (type === 'CREATE_ORDER') {
      // (Keep your existing inventory deduction logic here!)
      
      const result = await client.query(
        `INSERT INTO orders (sync_id, status, total, items, created_at, order_type)
         VALUES ($1, 'PENDING', $2, $3, $4, $5) RETURNING id`,
        [mutationId, payload.total, JSON.stringify(payload.items), payload.createdAt, payload.orderType || 'POS']
      );
      
      newOrderId = result.rows[0].id;

      // 2. Send to Kitchen Display (Local EnvKit Redis)
      const io = req.app.get('io');
      if (io) {
        io.emit('new_order', { id: newOrderId, items: payload.items, total: payload.total, createdAt: payload.createdAt, orderType: payload.orderType || 'POS' });
      }

      // 3. QUEUE FOR CLOUD SYNC
      queueCloudSync({
        mutationId,
        total: payload.total,
        items: payload.items,
        createdAt: payload.createdAt,
        orderType: payload.orderType || 'POS'
      });
    }

    await client.query('COMMIT');
    res.json({ ok: true, orderId: newOrderId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sync] error', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;