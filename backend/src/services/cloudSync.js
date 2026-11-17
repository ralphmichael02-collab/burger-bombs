// backend/src/services/cloudSync.js
import { cloudPool } from '../db.js';

const syncQueue = [];

export function queueCloudSync(orderData) {
  if (!cloudPool) return;
  syncQueue.push(orderData);
}

export function startCloudSyncWorker() {
  if (!cloudPool) {
    console.log('[cloud-sync] Running in Cloud Mode (Render). Sync worker disabled.');
    return;
  }

  console.log('[cloud-sync] Running in Local Mode (Docker). Bridging to Neon...');

  setInterval(async () => {
    if (syncQueue.length === 0) return;

    for (let i = syncQueue.length - 1; i >= 0; i--) {
      const order = syncQueue[i];
      try {
        await cloudPool.query(
          `INSERT INTO orders (sync_id, status, total, items, created_at, order_type, branch_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (sync_id) DO NOTHING`,
          [
            order.mutationId,
            'PENDING',
            order.total,
            JSON.stringify(order.items),
            order.createdAt,
            order.orderType,
            order.branchId ?? null
          ]
        );
        syncQueue.splice(i, 1);
        console.log(`[cloud-sync] ✅ Synced order ${order.mutationId.slice(0, 8)}`);
      } catch (err) {
        console.error(`[cloud-sync] ❌ Failed: ${err.message}`);
      }
    }
  }, 5000);
}