// backend/src/services/cloudPullSync.js
import { pool, cloudPool } from '../db.js';

const PULL_INTERVAL_MS = 10000;

export function startCloudPullSyncWorker(io) {
  if (!cloudPool) {
    console.log('[cloud-pull] Cloud mode — pull sync disabled');
    return;
  }

  console.log('[cloud-pull] Local mode — syncing FROM Neon every 10s...');

  setInterval(async () => {
    try {
      // 1. Get online orders from the last 24 hours from Neon
      const { rows: cloudOrders } = await cloudPool.query(
        `SELECT id, sync_id, status, total::float, items, created_at, order_type,
                payment_method, customer_id, delivery_address, delivery_lat, delivery_lng
         FROM orders
         WHERE created_at > NOW() - INTERVAL '24 hours'
           AND order_type = 'ONLINE'
         ORDER BY created_at DESC
         LIMIT 50`
      );

      for (const order of cloudOrders) {
        // 2. Check if we already have it locally
        const existing = await pool.query(
          `SELECT id, status FROM orders WHERE sync_id = $1`,
          [order.sync_id]
        );

        let localId;
        let statusChanged = false;

        if (existing.rowCount > 0) {
          localId = existing.rows[0].id;
          // 👇 UPDATE STATUS IF CHANGED IN CLOUD
          if (existing.rows[0].status !== order.status) {
            await pool.query(
              `UPDATE orders SET status = $1 WHERE id = $2`,
              [order.status, localId]
            );
            statusChanged = true;
          }
        } else {
          // 3. Insert brand new order into local Docker
          const insertResult = await pool.query(
            `INSERT INTO orders 
              (sync_id, status, total, items, created_at, order_type, payment_method,
               customer_id, delivery_address, delivery_lat, delivery_lng)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [order.sync_id, order.status, order.total, JSON.stringify(order.items),
             order.created_at, order.order_type, order.payment_method, order.customer_id,
             order.delivery_address, order.delivery_lat, order.delivery_lng]
          );
          localId = insertResult.rows[0].id;
          statusChanged = true; // Treat new orders as "changed" to trigger notification
        }

        // 4. Notify Kitchen or Cashier via Socket.IO
        if (io && statusChanged) {
          if (order.status === 'PENDING') {
            io.to('kitchen').emit('order:new', {
              id: localId, items: order.items, total: order.total,
              createdAt: order.created_at, orderType: 'ONLINE', paymentMethod: order.payment_method
            });
            // Remove from cashier queue if it was there
            io.to('cashier').emit('kiosk:pending-removed', { id: localId });
            console.log(`[cloud-pull] ✅ Sent ONLINE order ${localId} to Kitchen`);
          } else if (order.status === 'PENDING_PAYMENT') {
            io.to('cashier').emit('kiosk:new-pending', {
              id: localId, sync_id: order.sync_id, items: order.items, total: order.total,
              createdAt: order.created_at, order_type: 'ONLINE', payment_method: order.payment_method
            });
          }
        }
      }
    } catch (err) {
      console.error('[cloud-pull] ❌ Failed:', err.message);
    }
  }, PULL_INTERVAL_MS);
}