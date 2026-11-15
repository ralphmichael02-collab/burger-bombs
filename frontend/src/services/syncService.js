// frontend/src/services/syncService.js
import { db, refreshMenuFromBackend } from '../db';
import { API_BASE } from '../config/api';

const TICK_MS = 5000;
const MAX_RETRIES = 5;

let timer = null;
let running = false;

export function startSyncWorker() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  window.addEventListener('online', tick);
}

async function tick() {
  if (running || !navigator.onLine) return;
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
        const errData = await res.json();
        throw new Error(`FATAL:${errData.error}`);
      }
      throw new Error(`HTTP ${res.status}`);
    }

    await db.transaction('rw', db.syncOutbox, db.orders, async () => {
      await db.syncOutbox.update(item.id, { status: 'sent', sentAt: new Date().toISOString() });
      if (item.type === 'CREATE_ORDER' && item.payload.localId) {
        await db.orders.update(item.payload.localId, { _syncStatus: 'synced' });
      }
    });
    
    refreshMenuFromBackend();
  } catch (err) {
    if (err.message.startsWith('FATAL:')) {
      await db.transaction('rw', db.syncOutbox, db.orders, async () => {
        await db.syncOutbox.update(item.id, { status: 'failed', lastError: err.message });
        if (item.type === 'CREATE_ORDER' && item.payload.localId) {
          await db.orders.update(item.payload.localId, { _syncStatus: 'rejected', status: 'REJECTED' });
        }
      });
      return;
    }

    const retries = (item.retries || 0) + 1;
    await db.syncOutbox.update(item.id, {
      retries,
      status: retries >= MAX_RETRIES ? 'failed' : 'pending',
      lastError: err.message,
    });
  }
}