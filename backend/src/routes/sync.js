// backend/src/routes/sync.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.post('/sync', async (req, res) => {
  const { mutationId, type, payload } = req.body;

  if (!mutationId || !type || !payload) {
    return res.status(400).json({ error: 'mutationId, type, payload required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Idempotency Guard
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

    // 2. Process the Order
    if (type === 'CREATE_ORDER') {
      
      // Step A: Deduct Inventory based on Recipes (BOM)
      for (const item of payload.items) {
        // Find the ingredients for this menu item
        const recipeRes = await client.query(
          `SELECT ingredient_id, quantity FROM recipes WHERE menu_item_id = $1`,
          [item.id]
        );

        for (const recipe of recipeRes.rows) {
          const amountToDeduct = recipe.quantity * item.qty;
          
          // Deduct from stock. The "WHERE stock >= $1" ensures we NEVER go negative.
          const updateStock = await client.query(
            `UPDATE ingredients 
             SET stock = stock - $1 
             WHERE id = $2 AND stock >= $1
             RETURNING stock`,
            [amountToDeduct, recipe.ingredient_id]
          );

          // If 0 rows updated, it means stock was too low. Throw error to rollback!
          if (updateStock.rowCount === 0) {
            throw new Error(`OUT_OF_STOCK: Not enough ingredients to make ${item.name}`);
          }
        }
      }

      // Step B: Insert the Order into the database
      const result = await client.query(
        `INSERT INTO orders (sync_id, status, total, items, created_at, order_type)
         VALUES ($1, 'PENDING', $2, $3, $4, $5)
         RETURNING id`,
        [mutationId, payload.total, JSON.stringify(payload.items), payload.createdAt, payload.orderType || 'POS']
      );

      // Step C: Broadcast to Kitchen Display (if Socket.IO is running)
      const io = req.app.get('io');
      if (io) {
        io.emit('new_order', {
          id: result.rows[0].id,
          items: payload.items,
          total: payload.total,
          createdAt: payload.createdAt,
          orderType: payload.orderType || 'POS'
        });
        console.log(`[socket] Emitted new_order for Order #${result.rows[0].id}`);
      }
    }

    // 3. Commit everything if no errors occurred
    await client.query('COMMIT');
     res.json({ ok: true, orderId: result ? result.rows[0].id : null }); 
    
    } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sync] error', err.message);
    
    // If it's a business logic error (out of stock), send 409. Otherwise 500.
    if (err.message.startsWith('OUT_OF_STOCK')) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  } finally {
    client.release();
  }
});

// Add this to sync.js
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

export default router;