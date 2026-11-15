// frontend/src/components/POS.jsx
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, refreshMenuFromBackend } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import QRCode from 'react-qr-code';
import { Beef, List, ScanLine, CheckCircle, RefreshCw, X } from 'lucide-react';
import MenuList from './MenuList';
import Cart from './Cart';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showRecentOrders, setShowRecentOrders] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);

  useEffect(() => {
    startSyncWorker();
    const interval = setInterval(() => { refreshMenuFromBackend(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const pendingSync = useLiveQuery(() => db.syncOutbox.where('status').equals('pending').count(), []);
  const recentOrders = useLiveQuery(() => db.orders.reverse().limit(10).toArray(), []);

  const rejectedOrders = useLiveQuery(() => db.orders.where('_syncStatus').equals('rejected').toArray(), []);
  useEffect(() => {
    if (rejectedOrders && rejectedOrders.length > 0) {
      alert(`Order Failed: Out of Stock!`);
      db.orders.where('_syncStatus').equals('rejected').modify({ _syncStatus: 'cleared' });
    }
  }, [rejectedOrders]);

  const handleScan = () => {
    try {
      const parsed = JSON.parse(scanInput);
      if (parsed.items && Array.isArray(parsed.items)) {
        setCart(parsed.items);
        setShowScanner(false);
        setScanInput('');
      } else { alert("Invalid QR Format."); }
    } catch (e) { alert("Could not read QR code."); }
  };

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
      const localId = await createOrder({ items: cart, total: orderTotal });
      setCompletedOrder({ id: localId, items: cart, total: orderTotal });
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
      <header className="bg-slate-950 text-white h-16 px-6 flex justify-between items-center shrink-0 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Beef size={20} className="text-white" /></div>
          <h1 className="text-xl font-bold tracking-tight">Terminal</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setShowRecentOrders(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2">
            <List size={16} /> Orders
          </button>
          <button onClick={() => setShowScanner(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2">
            <ScanLine size={16} /> Scan
          </button>
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
            <RefreshCw size={14} className={`text-slate-400 ${pendingSync > 0 ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium text-slate-300">Queue: {pendingSync ?? '0'}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[35%] bg-slate-50 flex flex-col border-r border-slate-200 z-10">
          <Cart cart={cart} setCart={setCart} onSubmit={placeOrder} submitting={submitting} />
        </div>
        <div className="flex-1 bg-slate-100 overflow-y-auto">
          <MenuList onAdd={addToCart} />
        </div>
      </div>

      {showRecentOrders && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black text-gray-900">Recent Local Orders</h2>
              <button onClick={() => setShowRecentOrders(false)} className="text-gray-400 hover:text-gray-800"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {recentOrders.map(o => (
                <div key={o.id} className="flex justify-between items-center p-4 border rounded-xl bg-white shadow-sm">
                  <div>
                    <div className="font-bold text-gray-800">Order #{o.id}</div>
                    <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleTimeString()} • ₱{o.total}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${o.status === 'VOIDED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {o.status || 'PENDING'}
                    </span>
                    {o.status !== 'VOIDED' && (
                      <button onClick={() => handleVoidOrder(o.id)} className="text-red-500 font-bold text-sm hover:underline bg-red-50 px-3 py-1 rounded-md">Void</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Scan Kiosk QR</h2>
            <textarea value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder='{"items":[...]}' className="w-full h-32 p-3 border border-gray-300 rounded-xl mb-4 font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowScanner(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleScan} className="flex-1 py-3 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-400 transition">Load Order</button>
            </div>
          </div>
        </div>
      )}

      {completedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
            <h2 className="text-2xl font-black mb-1 text-gray-900">Payment Successful</h2>
            <p className="text-gray-500 mb-6 font-medium">Order #{completedOrder.id}</p>
            
            <div className="bg-gray-50 p-5 rounded-2xl mb-6">
              <ul className="text-left mb-4 space-y-2">
                {completedOrder.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm font-medium text-gray-700">
                    <span>{item.qty}x {item.name}</span>
                    <span>₱{item.price * item.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t pt-3 flex justify-between font-black text-xl text-gray-900">
                <span>Total</span>
                <span>₱{completedOrder.total}</span>
              </div>
            </div>

            <div className="flex flex-col items-center mb-6">
              <p className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">Scan to Track Order</p>
              <div className="bg-white p-3 border border-gray-200 rounded-2xl shadow-sm">
                <QRCode value={`${window.location.origin}/track/${completedOrder.id}`} size={120} />
              </div>
            </div>

            <button onClick={() => setCompletedOrder(null)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}