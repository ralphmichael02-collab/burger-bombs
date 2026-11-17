// frontend/src/services/orderService.js
import { db } from '../db';
import { uuid } from '../utils/uuid';

export async function createOrder(orderData) {
  const mutationId = uuid();
  const now = new Date().toISOString();

  return await db.transaction('rw', db.orders, db.syncOutbox, async () => {
    const localId = await db.orders.add({
      ...orderData,
      status: 'PENDING',
      createdAt: now,
      syncId: mutationId,
      _syncStatus: 'pending',
    });

    await db.syncOutbox.add({
      mutationId,
      type: 'CREATE_ORDER',
      payload: { ...orderData, localId, createdAt: now, syncId: mutationId },
      status: 'pending',
      retries: 0,
      createdAt: now,
    });

    return { localId, mutationId };
  });
}