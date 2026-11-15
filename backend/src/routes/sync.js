// backend/src/routes/sync.js
import { Router } from 'express';
import { pool } from '../db.js';
import { queueCloudSync } from '../services/cloudSync.js';

const router = Router();

// Helper function to recursively deduct stock
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

// Helper function to recursively refund stock (for voided orders)
async function refundStock(client, menuItemId, quantityRefunded) {
  const recipeRes = await client.query(
    `SELECT ingredient_id, component_menu_item_id, quantity FROM recipes WHERE menu_item_id = $1`,
    [menuItemId]
  );

  for (const recipe of recipeRes.rows) {
    const amountToRefund = recipe.quantity * quantityRefunded;

    if (recipe.ingredient_id) {
      await client.query(
        `UPDATE ingredients SET stock = stock + $1 WHERE id = $2`,
        [amountToRefund, recipe.ingredient_id]
      );
    }

    if (recipe.component_menu_item_id) {
      await refundStock(client, recipe.component_menu_item_id, amountToRefund);
    }
  }
}

// ==========================================
// 1. CREATE ORDER
// ==========================================
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

      // Capture Client IP and Payment Method
      // Inside the router.post('/sync') -> if (type === 'CREATE_ORDER') block:

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
      const paymentMethod = payload.paymentMethod || 'Cash';
      
      // NEW: Extract delivery and customer info from payload
      const customerId = payload.customerId || null;
      const deliveryAddress = payload.deliveryAddress || null;
      const deliveryLat = payload.deliveryLat || null;
      const deliveryLng = payload.deliveryLng || null;

      const result = await client.query(
        `INSERT INTO orders (
          sync_id, status, total, items, created_at, order_type, ip_address, payment_method, 
          customer_id, delivery_address, delivery_lat, delivery_lng
         ) VALUES ($1, 'PENDING', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          mutationId, payload.total, JSON.stringify(payload.items), payload.createdAt, payload.orderType || 'POS', 
          clientIp, paymentMethod, customerId, deliveryAddress, deliveryLat, deliveryLng
        ]
      );

      newOrderId = result.rows[0].id;

      const io = req.app.get('io');
      if (io) {
        io.emit('new_order', {
          id: newOrderId, items: payload.items, total: payload.total,
          createdAt: payload.createdAt, orderType: payload.orderType || 'POS',
          paymentMethod: paymentMethod
        });
      }

      queueCloudSync({
        mutationId, total: payload.total, items: payload.items, 
        createdAt: payload.createdAt, orderType: payload.orderType || 'POS'
      });
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

// ==========================================
// 2. VOID ORDER (Cancel & Refund)
// ==========================================
router.post('/orders/:id/void', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const orderRes = await client.query(`SELECT items, status FROM orders WHERE id = $1`, [id]);
    if (orderRes.rowCount === 0) throw new Error("Order not found");
    if (orderRes.rows[0].status === 'VOIDED') throw new Error("Order already voided");
    
    const items = orderRes.rows[0].items;
    
    for (const item of items) {
      await refundStock(client, item.id, item.qty);
    }
    
    await client.query(`UPDATE orders SET status = 'VOIDED' WHERE id = $1`, [id]);
    
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 3. KITCHEN & RIDER ROUTES
// ==========================================
router.get('/orders/active', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, total::float, items, created_at, order_type, payment_method FROM orders WHERE status = 'PENDING' ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/orders/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE orders SET status = 'COMPLETED' WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/orders/ready-for-delivery', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, total::float, items, created_at FROM orders WHERE status = 'COMPLETED' ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/orders/:id/deliver', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE orders SET status = 'DELIVERED' WHERE id = $1`, [id]);
    const io = req.app.get('io');
    if (io) io.emit('delivery_completed', { orderId: id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/orders/:id/confirm-receipt', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE orders SET status = 'RECEIVED' WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;