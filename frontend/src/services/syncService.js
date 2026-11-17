// frontend/src/services/syncService.js
import { db, refreshMenuFromBackend } from '../db';
import { API_BASE } from '../config/api';

const TICK_MS = 5000;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60000;

let timer = null;
let running = false;

export function startSyncWorker() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  window.addEventListener('online', tick);
  console.log('[sync] worker started');
}

export function stopSyncWorker() {
  if (timer) clearInterval(timer);
  timer = null;
  window.removeEventListener('online', tick);
}

function isDuplicateAck(body) {
  if (!body) return false;
  if (body.duplicate === true || body.alreadyApplied === true) return true;
  const text = String(body.error || body.message || '');
  return /duplicate|already (exists|applied|processed|received)/i.test(text);
}

async function tick() {
  if (running) return;
  if (!navigator.onLine) return;

  running = true;
  try {
    const now = Date.now();
    const pending = await db.syncOutbox.where('status').equals('pending').toArray();
    const due = pending.filter((i) => !i.nextAttemptAt || i.nextAttemptAt <= now);
    for (const item of due) {
      await pushOne(item);
      if (!navigator.onLine) break;
    }
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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        mutationId: item.mutationId,
        type: item.type,
        payload: item.payload,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 409) {
        if (isDuplicateAck(errData)) {
          await markSent(item, errData);
          return;
        }
        throw new Error(`FATAL:${errData.error || 'rejected by server'}`);
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const body = await res.json().catch(() => null);
    await markSent(item, body);
  } catch (err) {
    if (err.message.startsWith('FATAL:')) {
      await db.transaction('rw', db.syncOutbox, db.orders, async () => {
        await db.syncOutbox.update(item.id, {
          status: 'failed',
          lastError: err.message,
          failedAt: new Date().toISOString(),
        });
        if (item.type === 'CREATE_ORDER' && item.payload?.localId) {
          await db.orders.update(item.payload.localId, {
            _syncStatus: 'rejected',
            status: 'REJECTED',
          });
        }
      });
      return;
    }

    const retries = (item.retries || 0) + 1;
    const exhausted = retries >= MAX_RETRIES;
    const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (retries - 1), MAX_BACKOFF_MS);
    await db.syncOutbox.update(item.id, {
      retries,
      status: exhausted ? 'failed' : 'pending',
      lastError: err.message,
      nextAttemptAt: Date.now() + backoff,
    });
  }
}

async function markSent(item, body) {
  const now = new Date().toISOString();

  await db.transaction('rw', db.syncOutbox, db.orders, async () => {
    await db.syncOutbox.update(item.id, {
      status: 'sent',
      sentAt: now,
      lastError: null,
      nextAttemptAt: 0,
    });

    if (item.type === 'CREATE_ORDER' && item.payload?.localId) {
      const patch = { _syncStatus: 'synced', syncedAt: now };
      if (body?.orderId != null) patch.serverId = body.orderId;
      await db.orders.update(item.payload.localId, patch);
    }

    if (item.type === 'UPDATE_STATUS') {
      const syncId = item.payload?.syncId;
      if (syncId) {
        const local = await db.orders.where('syncId').equals(syncId).first();
        if (local) {
          const patch = { _syncStatus: 'synced', syncedAt: now };
          if (body?.orderId != null) patch.serverId = body.orderId;
          await db.orders.update(local.id, patch);
        }
      }
    }
  });

  refreshMenuFromBackend().catch(() => {});
}