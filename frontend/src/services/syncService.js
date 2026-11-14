// frontend/src/services/syncService.js
import { db, refreshMenuFromBackend } from '../db';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const TICK_MS = 5000;
const MAX_RETRIES = 5;

let timer = null;
let running = false;

export function startSyncWorker() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  window.addEventListener('online', tick);
  console.log('[sync] worker started');
}

async function tick() {
  if (running) return;
  if (!navigator.onLine) {
    console.log('[sync] offline — skipping');
    return;
  }

  running = true;
  try {
    const pending = await db.syncOutbox.where('status').equals('pending').toArray();
    if (pending.length === 0) return;
    for (const item of pending) await pushOne(item);
  } catch (err) {
    console.error('[sync] tick error', err);
  } finally {
    running = false;
  }
}

async function pushOne(item) {
  try {
    const res = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mutationId: item.mutationId,
        type: item.type,
        payload: item.payload,
      }),
    });

    if (!res.ok) {
      if (res.status === 409) {
        // This is a permanent failure (e.g., OUT_OF_STOCK)
        const errData = await res.json();
        throw new Error(`FATAL:${errData.error}`);
      }
      throw new Error(`HTTP ${res.status}`);
    }

    // Success → mark outbox entry done AND update order status
    await db.transaction('rw', db.syncOutbox, db.orders, async () => {
      await db.syncOutbox.update(item.id, { status: 'sent', sentAt: new Date().toISOString() });
      if (item.type === 'CREATE_ORDER' && item.payload.localId) {
        await db.orders.update(item.payload.localId, { _syncStatus: 'synced' });
      }
    });
    console.log(`[sync] ✅ ${item.type} ${item.mutationId.slice(0, 8)}`);
    
    // 👇 NEW: Refresh the menu cache so the UI updates stock availability
    refreshMenuFromBackend();

  } catch (err) {
    // Check if it's a fatal error (out of stock). If so, do NOT retry.
    if (err.message.startsWith('FATAL:')) {
      console.error(`[sync] 🛑 ${err.message}`);
      await db.transaction('rw', db.syncOutbox, db.orders, async () => {
        // Mark outbox as failed so it stops trying
        await db.syncOutbox.update(item.id, { status: 'failed', lastError: err.message });
        // Mark the local order as REJECTED
        if (item.type === 'CREATE_ORDER' && item.payload.localId) {
          await db.orders.update(item.payload.localId, { _syncStatus: 'rejected', status: 'REJECTED' });
        }
      });
      return;
    }

    // Otherwise, it's a network error, so retry as normal
    const retries = (item.retries || 0) + 1;
    console.warn(`[sync] ❌ retry ${retries}/${MAX_RETRIES}`, err.message);
    await db.syncOutbox.update(item.id, {
      retries,
      status: retries >= MAX_RETRIES ? 'failed' : 'pending',
      lastError: err.message,
    });
  }
}