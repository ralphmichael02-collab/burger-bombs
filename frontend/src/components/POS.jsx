// frontend/src/components/POS.jsx
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, refreshMenuFromBackend } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import QRCode from 'react-qr-code';
import { Beef, List, ScanLine, CheckCircle, RefreshCw, X, ShoppingCart, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import MenuList from './MenuList';
import Cart from './Cart';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showRecentOrders, setShowRecentOrders] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);
  const { addToast } = useToast();

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
      addToast('Order Failed: Out of Stock! The system rejected the latest order.', 'error');
      db.orders.where('_syncStatus').equals('rejected').modify({ _syncStatus: 'cleared' });
    }
  }, [rejectedOrders, addToast]);

  const handleScan = () => {
    try {
      const parsed = JSON.parse(scanInput);
      if (parsed.items && Array.isArray(parsed.items)) {
        setCart(parsed.items);
        setShowScanner(false);
        setScanInput('');
        addToast(`Loaded ${parsed.items.length} items from Kiosk`, 'success');
      } else {
        addToast('Invalid QR Format.', 'error');
      }
    } catch (e) {
      addToast('Could not read QR code.', 'error');
    }
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
    } catch (err) {
      addToast('Failed to save order: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidOrder = async (orderId) => {
    if (!window.confirm("Void this order and refund ingredients?")) return;
    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/void`, { method: 'POST' });
      await db.orders.update(orderId, { status: 'VOIDED' });
      addToast("Order voided.", 'success');
      setShowRecentOrders(false);
    } catch (err) {
      addToast("Error: " + err.message, 'error');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#FDFBF7] font-['Source_Sans_Pro',sans-serif]">
      <header className="bg-white h-16 px-6 flex justify-between items-center shrink-0 border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#EA580C] rounded-lg flex items-center justify-center text-white shadow-sm">
            <Beef size={20} />
          </div>
          <h1 className="text-lg font-black text-[#1A1C23]">Terminal</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRecentOrders(true)} className="bg-gray-100 hover:bg-gray-200 text-[#1A1C23] px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2">
            <List size={16} /> Recent Orders
          </button>
          <button onClick={() => setShowScanner(true)} className="bg-gray-100 hover:bg-gray-200 text-[#1A1C23] px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2">
            <ScanLine size={16} /> Scan QR
          </button>
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
            <RefreshCw size={14} className={`${pendingSync > 0 ? 'animate-spin text-[#EA580C]' : 'text-gray-400'}`} />
            <span className="text-sm font-bold text-gray-600">Queue: {pendingSync ?? '0'}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[35%] bg-white flex flex-col border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
          <Cart cart={cart} setCart={setCart} onSubmit={placeOrder} submitting={submitting} />
        </div>
        <div className="flex-1 bg-[#FDFBF7] overflow-y-auto">
          <MenuList onAdd={addToCart} />
        </div>
      </div>

      <Modal isOpen={showRecentOrders} onClose={() => setShowRecentOrders(false)} title="Recent Orders" variant="info">
        <div className="max-h-96 overflow-y-auto space-y-2">
          {recentOrders && recentOrders.length > 0 ? recentOrders.map(o => (
            <div key={o.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white transition">
              <div>
                <div className="font-bold text-[#1A1C23]">Order #{o.id}</div>
                <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleTimeString()} • ₱{o.total}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${o.status === 'VOIDED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {o.status || 'PENDING'}
                </span>
                {o.status !== 'VOIDED' && (
                  <button onClick={() => handleVoidOrder(o.id)} className="text-red-500 font-bold text-sm hover:underline bg-red-50 px-3 py-1 rounded-md flex items-center gap-1">
                    <Trash2 size={14} /> Void
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center text-gray-500 font-medium py-8">No recent orders</div>
          )}
        </div>
      </Modal>

      <Modal isOpen={showScanner} onClose={() => setShowScanner(false)} title="Scan Kiosk QR" variant="info">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Paste the JSON data from the customer's Kiosk receipt.</p>
          <textarea
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder='{"items":[{"id":1...'
            className="w-full h-32 p-3 border border-gray-200 rounded-xl font-mono text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none transition"
          />
          <div className="flex gap-3">
            <button onClick={() => setShowScanner(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition">Cancel</button>
            <button onClick={handleScan} className="flex-1 py-3 bg-[#EA580C] text-white font-bold rounded-xl hover:bg-[#C2410C] transition shadow-md">Load Order</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!completedOrder} onClose={() => setCompletedOrder(null)} title="Payment Successful" variant="success">
        {completedOrder && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 bg-[#45C65A]/10 text-[#45C65A] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1A1C23] mb-1">Order #{completedOrder.id}</h2>
              <p className="text-gray-500">Saved locally. Syncing to cloud...</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-left">
              <ul className="space-y-2 mb-3">
                {completedOrder.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm text-[#1A1C23]">
                    <span>{item.qty}x {item.name}</span>
                    <span className="font-bold">₱{item.price * item.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-500 uppercase">Total</span>
                <span className="text-2xl font-black text-[#1A1C23]">₱{completedOrder.total}</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Tracking QR</p>
              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                <QRCode value={`${window.location.origin}/track/${completedOrder.id}`} size={120} />
              </div>
            </div>
            <button onClick={() => setCompletedOrder(null)} className="w-full py-3 bg-[#1A1C23] text-white font-bold rounded-xl hover:bg-black transition flex items-center justify-center gap-2">
              Done <ArrowRight size={18} />
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}