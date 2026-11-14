// frontend/src/components/POS.jsx
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, refreshMenuFromBackend } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import MenuList from './MenuList';
import Cart from './Cart';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);

  // 1. Start the background sync worker AND poll for menu updates
  useEffect(() => {
    startSyncWorker();
    
    // Refresh menu every 30 seconds to catch online orders or stock changes
    const interval = setInterval(() => {
      refreshMenuFromBackend();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 2. Live queries to update the UI automatically
  const pendingSync = useLiveQuery(
    () => db.syncOutbox.where('status').equals('pending').count(), []
  );
  const totalOrders = useLiveQuery(() => db.orders.count(), []);

  // 3. Listen for REJECTED orders (e.g., Out of Stock)
  const rejectedOrders = useLiveQuery(
    () => db.orders.where('_syncStatus').equals('rejected').toArray(), []
  );

  useEffect(() => {
    if (rejectedOrders && rejectedOrders.length > 0) {
      alert(`⚠️ Order Failed: Out of Stock!\nThe system rejected the latest order because ingredients ran out.`);
      
      // Clear the rejected status so the alert doesn't pop up again in a loop
      db.orders.where('_syncStatus').equals('rejected').modify({ _syncStatus: 'cleared' });
    }
  }, [rejectedOrders]);

  // 4. Cart Logic
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (existing) return prev.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const placeOrder = async () => {
    setSubmitting(true);
    try {
      const localId = await createOrder({
        items: cart,
        total: cart.reduce((s, c) => s + c.price * c.qty, 0),
      });
      setLastOrderId(localId);
      setCart([]);
      
      // Hide the green toast after 3 seconds
      setTimeout(() => setLastOrderId(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Render UI
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-yellow-500 text-white p-3 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">🍔 Burger Bombs POS</h1>
        <div className="text-sm flex gap-4 bg-yellow-600 px-4 py-1.5 rounded-full font-medium">
          <span>Pending sync: <b>{pendingSync ?? '–'}</b></span>
          <span className="border-l border-yellow-400 pl-4">Local orders: <b>{totalOrders ?? '–'}</b></span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 max-w-7xl mx-auto">
        {/* Menu Grid */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <MenuList onAdd={addToCart} />
        </div>
        
        {/* Cart */}
        <div className="h-[calc(100vh-120px)] sticky top-4">
          <Cart cart={cart} setCart={setCart} onSubmit={placeOrder} submitting={submitting} />
        </div>
      </div>

      {/* Success Toast Notification */}
      {lastOrderId && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl animate-bounce">
          ✅ Order #{lastOrderId} saved locally
        </div>
      )}
    </div>
  );
}