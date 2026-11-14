// backend/src/routes/sync.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// 1. Create Order (POS & Online Store)
router.post('/sync', async (req, res) => {
  const { mutationId, type, payload } = req.body;

  if (!mutationId || !type || !payload) {
    return res.status(400).json({ error: 'mutationId, type, payload required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const claim = await client.query(
      `INSERT INTO processed_mutations (mutation_id, type)
       VALUES ($1, $2)
       ON CONFLICT (mutation_id) DO NOTHING
       RETURNING mutation_id`,
      [mutationId, type]
    );

    if (claim.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.json({ ok: true, duplicate: true });
    }

    let newOrderId = null;

    if (type === 'CREATE_ORDER') {
      // Deduct Inventory
      for (const item of payload.items) {
        const recipeRes = await client.query(
          `SELECT ingredient_id, quantity FROM recipes WHERE menu_item_id = $1`,
          [item.id]
        );

        for (const recipe of recipeRes.rows) {
          const amountToDeduct = recipe.quantity * item.qty;
          
          const updateStock = await client.query(
            `UPDATE ingredients 
             SET stock = stock - $1 
             WHERE id = $2 AND stock >= $1
             RETURNING stock`,
            [amountToDeduct, recipe.ingredient_id]
          );

          if (updateStock.rowCount === 0) {
            throw new Error(`OUT_OF_STOCK: Not enough ingredients to make ${item.name}`);
          }
        }
      }

      // Insert Order
      const result = await client.query(
        `INSERT INTO orders (sync_id, status, total, items, created_at, order_type)
         VALUES ($1, 'PENDING', $2, $3, $4, $5)
         RETURNING id`,
        [mutationId, payload.total, JSON.stringify(payload.items), payload.createdAt, payload.orderType || 'POS']
      );

      newOrderId = result.rows[0].id;

      // Broadcast to Kitchen
      const io = req.app.get('io');
      if (io) {
        io.emit('new_order', {
          id: newOrderId,
          items: payload.items,
          total: payload.total,
          createdAt: payload.createdAt,
          orderType: payload.orderType || 'POS'
        });
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, orderId: newOrderId }); 

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sync] error', err.message);
    
    if (err.message.startsWith('OUT_OF_STOCK')) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  } finally {
    client.release();
  }
});

// 2. Mark Order as Completed (Kitchen)
router.post('/orders/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE orders SET status = 'COMPLETED' WHERE id = $1`,
      [id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[complete-order] error', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Get Orders Ready for Delivery (Rider Dashboard)
router.get('/orders/ready-for-delivery', async (_req, res) => {
  try {
    // We removed `order_type` from the query to avoid 500 errors if the column doesn't exist in your Neon DB yet
    const { rows } = await pool.query(
      `SELECT id, total::float, items, created_at 
       FROM orders 
       WHERE status = 'COMPLETED' 
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[ready-for-delivery] error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;