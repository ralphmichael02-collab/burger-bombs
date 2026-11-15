import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, refreshMenuFromBackend } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import MenuList from './MenuList';
import Cart from './Cart';
import Modal from './ui/Modal';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showRecentOrders, setShowRecentOrders] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');

  useEffect(() => {
    startSyncWorker();
    const interval = setInterval(() => { refreshMenuFromBackend(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const pendingSync = useLiveQuery(() => db.syncOutbox.where('status').equals('pending').count(), []);
  const recentOrders = useLiveQuery(() => db.orders.reverse().limit(10).toArray(), []);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (existing) return prev.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const placeOrder = async () => {
    setSubmitting(true);
    const orderTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    try {
      await createOrder({ items: cart, total: orderTotal });
      setCart([]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidOrder = async (orderId) => {
    if (!window.confirm("Void this order and refund ingredients?")) return;
    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/void`, { method: 'POST' });
      await db.orders.update(orderId, { status: 'VOIDED' });
      alert("Order voided.");
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 font-sans">
      {/* POS Header */}
      <header className="bg-slate-950 text-white h-16 px-6 flex justify-between items-center shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-black">🍔</div>
          <h1 className="text-xl font-bold tracking-tight">Terminal</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowRecentOrders(true)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition">📋 Orders</button>
          <button onClick={() => setShowScanner(true)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition">📷 Scan</button>
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${pendingSync > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-sm font-medium text-slate-300">Queue: {pendingSync ?? '0'}</span>
          </div>
        </div>
      </header>

      {/* POS 2-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[35%] bg-slate-50 flex flex-col border-r border-slate-200 z-10">
          <Cart cart={cart} setCart={setCart} onSubmit={placeOrder} submitting={submitting} />
        </div>
        <div className="flex-1 bg-slate-100 overflow-y-auto">
          <MenuList onAdd={addToCart} />
        </div>
      </div>

      {/* Modals (Using Enterprise Modal) */}
      <Modal isOpen={showRecentOrders} onClose={() => setShowRecentOrders(false)} title="Recent Orders">
        <div className="space-y-2">
          {recentOrders.map(o => (
            <div key={o.id} className="flex justify-between items-center p-3 border rounded-xl bg-slate-50">
              <div>
                <p className="font-bold">#{o.id}</p>
                <p className="text-xs text-slate-500">₱{o.total}</p>
              </div>
              <button onClick={() => handleVoidOrder(o.id)} className="text-red-500 font-bold text-sm">Void</button>
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={showScanner} onClose={() => setShowScanner(false)} title="Scan QR">
        <textarea value={scanInput} onChange={(e) => setScanInput(e.target.value)} className="w-full h-32 p-3 border rounded-xl font-mono text-sm mb-4" placeholder='{"items":[...]}' />
        <button onClick={() => { setScanInput(''); setShowScanner(false); }} className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl">Load Order</button>
      </Modal>
    </div>
  );
}