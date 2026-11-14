// backend/src/services/cloudSync.js
import { cloudPool } from '../db.js';

const syncQueue = [];

export function queueCloudSync(orderData) {
  // If we are in the cloud (Render), we don't need to sync to Neon twice.
  // The primary DB *is* Neon.
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
          `INSERT INTO orders (sync_id, status, total, items, created_at, order_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (sync_id) DO NOTHING`,
          [order.mutationId, 'PENDING', order.total, JSON.stringify(order.items), order.createdAt, order.orderType]
        );
        syncQueue.splice(i, 1);
        console.log(`[cloud-sync] Successfully synced order ${order.mutationId} to Neon.`);
      } catch (err) {
        console.error(`[cloud-sync] Failed to sync to Neon. Will retry.`);
      }
    }
  }, 5000);
}