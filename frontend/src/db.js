import Dexie from 'dexie';

export const db = new Dexie('BurgerBombsDB');

db.version(1).stores({
  menuItems:  '++id, name, price, available',
  orders:     '++id, syncId, status, createdAt, _syncStatus',
  syncOutbox: '++id, mutationId, type, status, createdAt',
});

export async function refreshMenuFromBackend() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/menu`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    await db.menuItems.clear();
    await db.menuItems.bulkPut(items);
    console.log('[menu] refreshed from backend:', items.length, 'items');
  } catch (err) {
    console.warn('[menu] backend unavailable, using cached menu', err.message);
  }
}