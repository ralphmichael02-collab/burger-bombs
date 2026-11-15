// backend/src/routes/order.js
import { Router } from 'express';
import { pool, cloudPool } from '../db.js';

const router = Router();

// ─── STOCK HELPERS ────────────────────────────────────────────
async function deductStock(client, menuItemId, quantityOrdered) {
  const recipeRes = await client.query(
    `SELECT ingredient_id, component_menu_item_id, quantity FROM recipes WHERE menu_item_id = $1`,
    [menuItemId]
  );
  for (const recipe of recipeRes.rows) {
    const amountToDeduct = recipe.quantity * quantityOrdered;
    if (recipe.ingredient_id) {
      const updateStock = await client.query(
        `UPDATE ingredients SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING stock`,
        [amountToDeduct, recipe.ingredient_id]
      );
      if (updateStock.rowCount === 0) {
        throw new Error(`OUT_OF_STOCK: Not enough ingredients to fulfill this order.`);
      }
    }
    if (recipe.component_menu_item_id) {
      await deductStock(client, recipe.component_menu_item_id, amountToDeduct);
    }
  }
}

async function refundStock(client, menuItemId, quantityRefunded) {
  const recipeRes = await client.query(
    `SELECT ingredient_id, component_menu_item_id, quantity FROM recipes WHERE menu_item_id = $1`,
    [menuItemId]
  );
  for (const recipe of recipeRes.rows) {
    const amountToRefund = recipe.quantity * quantityRefunded;
    if (recipe.ingredient_id) {
      await client.query(`UPDATE ingredients SET stock = stock + $1 WHERE id = $2`, [amountToRefund, recipe.ingredient_id]);
    }
    if (recipe.component_menu_item_id) {
      await refundStock(client, recipe.component_menu_item_id, amountToRefund);
    }
  }
}

// ─── LOOKUP BY INTEGER ID (Used for Customer Tracking) ───────
router.get('/orders/by-id/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, sync_id, status, total::float, items, created_at, payment_method, payment_reference, customer_id
       FROM orders WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[orders] by-id lookup failed', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── LOOKUP BY SYNC_ID (Used for QR scan) ────────────────────
router.get('/orders/by-sync-id/:syncId', async (req, res) => {
  const { syncId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, sync_id, status, total::float, items, created_at, payment_method, payment_reference
       FROM orders WHERE sync_id = $1`,
      [syncId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found. Wait a few seconds and try again.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('[orders] lookup failed', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── LOOKUP BY REFERENCE (manual entry fallback) ─────────────
router.get('/orders/by-ref/:ref', async (req, res) => {
  const { ref } = req.params;
  const cleanRef = ref.trim().toUpperCase().replace(/-/g, '');
  
  if (cleanRef.length < 4) {
    return res.status(400).json({ error: 'Reference code must be at least 4 characters' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, sync_id, status, total::float, items, created_at, payment_method, payment_reference
       FROM orders 
       WHERE UPPER(sync_id::text) LIKE $1 
         AND status IN ('PENDING_PAYMENT', 'PENDING')
         AND created_at > NOW() - INTERVAL '4 hours'
       ORDER BY created_at DESC
       LIMIT 5`,
      [cleanRef + '%']
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'No matching order found. Check the code and try again.' 
      });
    }

    if (rows.length > 1) {
      return res.status(409).json({ 
        error: `Multiple orders start with "${cleanRef}". Please scan the QR or type more characters.` 
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('[orders] lookup by ref failed', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PENDING KIOSK QUEUE ─────────────────────────────────────
router.get('/orders/pending-kiosk', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, sync_id, total::float, items, created_at, payment_method, payment_reference, order_type
       FROM orders 
       WHERE status = 'PENDING_PAYMENT'
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MARK PAID (verify kiosk/online order) ───────────────────
router.post('/orders/:id/mark-paid', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      `UPDATE orders SET status = 'PENDING' 
       WHERE id = $1 AND status = 'PENDING_PAYMENT' 
       RETURNING *`,
      [id]
    );
    
    if (result.rowCount === 0) {
      throw new Error("Order not found or already verified");
    }

    if (cloudPool) {
      await cloudPool.query(`UPDATE orders SET status = 'PENDING' WHERE sync_id = $1`, [result.rows[0].sync_id]);
    }

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('order:new', {
        id: result.rows[0].id,
        items: result.rows[0].items,
        total: result.rows[0].total,
        createdAt: result.rows[0].created_at,
        orderType: result.rows[0].order_type,
        paymentMethod: result.rows[0].payment_method
      });
      io.to('cashier').emit('kiosk:pending-removed', { id: parseInt(id) });
    }

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── EDIT ITEMS (cashier modifies pending order) ─────────────
router.put('/orders/:id/items', async (req, res) => {
  const { id } = req.params;
  const { items, total } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must have at least one item' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT items, status, sync_id FROM orders WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (orderRes.rowCount === 0) throw new Error('Order not found');

    const currentStatus = orderRes.rows[0].status;
    if (!['PENDING_PAYMENT', 'PENDING'].includes(currentStatus)) {
      throw new Error(`Cannot edit order with status "${currentStatus}".`);
    }

    for (const item of orderRes.rows[0].items) {
      await refundStock(client, item.id, item.qty);
    }
    for (const item of items) {
      await deductStock(client, item.id, item.qty);
    }

    await client.query(
      `UPDATE orders SET items = $1, total = $2 WHERE id = $3`,
      [JSON.stringify(items), total, id]
    );

    if (cloudPool) {
      await cloudPool.query(
        `UPDATE orders SET items = $1, total = $2 WHERE sync_id = $3`,
        [JSON.stringify(items), total, orderRes.rows[0].sync_id]
      );
    }

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.to('cashier').emit('kiosk:pending-updated', {
        id: parseInt(id),
        items,
        total,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message.startsWith('OUT_OF_STOCK')) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  } finally {
    client.release();
  }
});

// ─── RIDER: MARK AS DELIVERED ────────────────────────────────
router.post('/orders/:id/deliver', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE orders SET status = 'DELIVERED' WHERE id = $1 RETURNING *`, 
      [id]
    );
    if (result.rowCount === 0) throw new Error("Order not found");

    if (cloudPool) {
      await cloudPool.query(`UPDATE orders SET status = 'DELIVERED' WHERE sync_id = $1`, [result.rows[0].sync_id]);
    }

    const io = req.app.get('io');
    if (io) {
      // Notify the customer tracking map to show the confirmation modal
      io.to(`order:${id}`).emit('order:delivered', { orderId: id });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CUSTOMER: CONFIRM RECEIPT ───────────────────────────────
router.post('/orders/:id/confirm-receipt', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE orders SET status = 'RECEIVED' WHERE id = $1 RETURNING *`, 
      [id]
    );
    if (result.rowCount === 0) throw new Error("Order not found");

    if (cloudPool) {
      await cloudPool.query(`UPDATE orders SET status = 'RECEIVED' WHERE sync_id = $1`, [result.rows[0].sync_id]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;