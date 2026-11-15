// backend/src/routes/sync.js
import { Router } from 'express';
import { pool, cloudPool } from '../db.js';
import { queueCloudSync } from '../services/cloudSync.js';

const router = Router();

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

// ─── CREATE ORDER (POS, Kiosk, Online Store) ─────────────────
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
       VALUES ($1, $2) ON CONFLICT (mutation_id) DO NOTHING RETURNING mutation_id`,
      [mutationId, type]
    );

    if (claim.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.json({ ok: true, duplicate: true });
    }

    let newOrderId = null;

    if (type === 'CREATE_ORDER') {
      for (const item of payload.items) {
        await deductStock(client, item.id, item.qty);
      }

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
      
      // KIOSK always needs cashier verification
      // ONLINE with non-cash also needs verification
      let initialStatus;
      if (payload.orderType === 'KIOSK') {
        initialStatus = 'PENDING_PAYMENT';
      } else if (payload.orderType === 'ONLINE' && payload.paymentMethod !== 'Cash') {
        initialStatus = 'PENDING_PAYMENT';
      } else {
        initialStatus = 'PENDING';
      }

      const result = await client.query(
        `INSERT INTO orders (sync_id, status, total, items, created_at, order_type, ip_address, payment_method, customer_id, delivery_address, delivery_lat, delivery_lng, payment_reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
        [mutationId, initialStatus, payload.total, JSON.stringify(payload.items), payload.createdAt, payload.orderType || 'POS', clientIp, payload.paymentMethod || 'Cash', payload.customerId || null, payload.deliveryAddress || null, payload.deliveryLat || null, payload.deliveryLng || null, payload.paymentReference || null]
      );

      newOrderId = result.rows[0].id;

      const io = req.app.get('io');
      if (io) {
        if (initialStatus === 'PENDING_PAYMENT') {
          io.to('cashier').emit('kiosk:new-pending', {
            id: newOrderId,
            sync_id: mutationId,
            items: payload.items,
            total: payload.total,
            createdAt: payload.createdAt,
            order_type: payload.orderType || 'POS',
            payment_method: payload.paymentMethod || 'Cash',
            payment_reference: payload.paymentReference || null
          });
        } else {
          io.to('kitchen').emit('order:new', {
            id: newOrderId,
            items: payload.items,
            total: payload.total,
            createdAt: payload.createdAt,
            orderType: payload.orderType || 'POS',
            paymentMethod: payload.paymentMethod || 'Cash'
          });
        }
      }

      queueCloudSync({ mutationId, total: payload.total, items: payload.items, createdAt: payload.createdAt, orderType: payload.orderType || 'POS' });
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

// ─── VOID ORDER ──────────────────────────────────────────────
router.post('/orders/:id/void', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const orderRes = await client.query(
      `SELECT sync_id, items, status FROM orders WHERE id = $1`, 
      [id]
    );
    if (orderRes.rowCount === 0) throw new Error("Order not found");
    if (orderRes.rows[0].status === 'VOIDED') throw new Error("Already voided");
    
    const items = orderRes.rows[0].items;
    for (const item of items) {
      await refundStock(client, item.id, item.qty);
    }
    
    await client.query(`UPDATE orders SET status = 'VOIDED' WHERE id = $1`, [id]);
    
    if (cloudPool) {
      await cloudPool.query(`UPDATE orders SET status = 'VOIDED' WHERE sync_id = $1`, [orderRes.rows[0].sync_id]);
    }
    
    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.to('cashier').emit('kiosk:pending-removed', { id: parseInt(id) });
      io.to('kitchen').emit('order:voided', { id: parseInt(id) });
    }

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── VERIFY PAYMENT (Cloud/Cashier) ──────────────────────────
router.post('/orders/:id/verify-payment', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE orders SET status = 'PENDING' 
       WHERE id = $1 AND status = 'PENDING_PAYMENT' 
       RETURNING *`,
      [id]
    );
    if (result.rowCount === 0) throw new Error("Order not found or already verified");

    if (cloudPool) {
      await cloudPool.query(`UPDATE orders SET status = 'PENDING' WHERE sync_id = $1`, [result.rows[0].sync_id]);
    }

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
    res.status(500).json({ error: err.message });
  }
});

// ─── GET ACTIVE ORDERS (Kitchen) ─────────────────────────────
router.get('/orders/active', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, total::float, items, created_at, order_type, payment_method 
       FROM orders 
       WHERE status = 'PENDING' 
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── COMPLETE ORDER (Kitchen Done) ───────────────────────────
router.post('/orders/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE orders SET status = 'COMPLETED' WHERE id = $1 RETURNING sync_id`, 
      [id]
    );
    
    if (cloudPool && result.rowCount > 0) {
      await cloudPool.query(`UPDATE orders SET status = 'COMPLETED' WHERE sync_id = $1`, [result.rows[0].sync_id]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET READY FOR DELIVERY (Rider) ──────────────────────────
router.get('/orders/ready-for-delivery', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, total::float, items, delivery_address, created_at 
       FROM orders 
       WHERE status = 'COMPLETED' 
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MARK AS DELIVERED (Rider) ───────────────────────────────
router.post('/orders/:id/deliver', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE orders SET status = 'DELIVERED' WHERE id = $1 RETURNING sync_id`, 
      [id]
    );
    
    if (cloudPool && result.rowCount > 0) {
      await cloudPool.query(`UPDATE orders SET status = 'DELIVERED' WHERE sync_id = $1`, [result.rows[0].sync_id]);
    }
    
    const io = req.app.get('io');
    if (io) {
      // 👇 THIS IS WHAT TRIGGERS THE CUSTOMER MODAL
      io.to(`order:${id}`).emit('order:delivered', { orderId: id });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONFIRM RECEIPT (Customer) ──────────────────────────────
router.post('/orders/:id/confirm-receipt', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE orders SET status = 'RECEIVED' WHERE id = $1 RETURNING sync_id`, 
      [id]
    );
    
    if (cloudPool && result.rowCount > 0) {
      await cloudPool.query(`UPDATE orders SET status = 'RECEIVED' WHERE sync_id = $1`, [result.rows[0].sync_id]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;