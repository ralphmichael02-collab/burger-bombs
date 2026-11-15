// frontend/src/components/POS.jsx
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, refreshMenuFromBackend } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import QRCode from 'react-qr-code';
import { 
  Beef, List, ScanLine, RefreshCw, CheckCircle, X, 
  AlertCircle, Trash2, ArrowRight 
} from 'lucide-react';
import MenuList from './MenuList';
import Cart from './Cart';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';

export default function POS() {
  // Cart & Transaction States
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Modal States
  const [showRecentOrders, setShowRecentOrders] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');

  const { addToast } = useToast();

  // Initialize Sync Worker and Menu Refresher
  useEffect(() => {
    startSyncWorker();
    const interval = setInterval(() => { refreshMenuFromBackend(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Live Queries from IndexedDB
  const pendingSync = useLiveQuery(() => db.syncOutbox.where('status').equals('pending').count(), []);
  const recentOrders = useLiveQuery(() => db.orders.reverse().limit(10).toArray(), []);

  // Listen for Rejected Orders (Out of Stock)
  const rejectedOrders = useLiveQuery(() => db.orders.where('_syncStatus').equals('rejected').toArray(), []);
  useEffect(() => {
    if (rejectedOrders && rejectedOrders.length > 0) {
      addToast('Order Failed: Out of Stock! The system rejected the latest order.', 'error');
      db.orders.where('_syncStatus').equals('rejected').modify({ _syncStatus: 'cleared' });
    }
  }, [rejectedOrders, addToast]);

  // --- HANDLERS ---

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
      addToast('Could not read QR code. Make sure the format is correct.', 'error');
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (existing) {
        return prev.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      }
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
      addToast('Order saved locally!', 'success');
    } catch (err) {
      addToast('Failed to save order: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to VOID this order? Ingredients will be refunded to inventory.")) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/void`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to void on backend");
      
      await db.orders.update(orderId, { status: 'VOIDED' });
      addToast("Order voided and ingredients refunded.", 'success');
      setShowRecentOrders(false);
    } catch (err) {
      addToast("Error: " + err.message, 'error');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F7F7F7] font-['Source_Sans_Pro',sans-serif]">
      
      {/* TOP HEADER */}
      <header className="bg-[#1A1C23] text-white h-16 px-6 flex justify-between items-center shrink-0 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2B4FB9] rounded-lg flex items-center justify-center">
            <Beef size={20} className="text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Terminal</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowRecentOrders(true)} 
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            <List size={16} /> Recent Orders
          </button>
          <button 
            onClick={() => setShowScanner(true)} 
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            <ScanLine size={16} /> Scan QR
          </button>
          
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
            <RefreshCw size={14} className={`${pendingSync > 0 ? 'animate-spin text-[#FE9339]' : 'text-slate-500'}`} />
            <span className="text-sm font-semibold text-slate-300">Queue: {pendingSync ?? '0'}</span>
          </div>
        </div>
      </header>

      {/* 2-PANEL SPLIT (30% Cart / 70% Menu) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: ORDER / CHECK */}
        <div className="w-[30%] min-w-[320px] bg-white flex flex-col border-r border-[#E5E7EB] z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <Cart 
            cart={cart} 
            setCart={setCart} 
            onSubmit={placeOrder} 
            submitting={submitting} 
          />
        </div>
        
        {/* RIGHT PANEL: MENU GRID */}
        <div className="flex-1 bg-[#F7F7F7] overflow-y-auto">
          <MenuList onAdd={addToCart} />
        </div>
      </div>

      {/* RECENT ORDERS MODAL */}
      <Modal 
        isOpen={showRecentOrders} 
        onClose={() => setShowRecentOrders(false)} 
        title="Recent Orders"
        variant="info"
      >
        <div className="max-h-96 overflow-y-auto space-y-2">
          {recentOrders && recentOrders.length > 0 ? recentOrders.map(o => (
            <div key={o.id} className="flex justify-between items-center p-4 border border-[#E5E7EB] rounded-lg bg-[#F7F7F7] hover:bg-white transition">
              <div>
                <div className="font-bold text-[#1A1C23]">Order #{o.id}</div>
                <div className="text-xs text-[#6B7280]">
                  {new Date(o.createdAt).toLocaleTimeString()} • ₱{o.total}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                  o.status === 'VOIDED' 
                    ? 'bg-[#EA001E]/10 text-[#EA001E]' 
                    : 'bg-[#45C65A]/10 text-[#45C65A]'
                }`}>
                  {o.status || 'PENDING'}
                </span>
                {o.status !== 'VOIDED' && (
                  <button 
                    onClick={() => handleVoidOrder(o.id)} 
                    className="text-[#EA001E] hover:bg-[#EA001E]/10 font-bold text-sm px-3 py-1 rounded-md transition flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Void
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center text-[#6B7280] font-medium py-8">
              No recent orders
            </div>
          )}
        </div>
      </Modal>

      {/* KIOSK SCANNER MODAL */}
      <Modal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        title="Scan Kiosk QR"
        variant="info"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#6B7280]">
            Paste the JSON data from the customer's Kiosk receipt, or scan the QR code.
          </p>
          <textarea 
            value={scanInput} 
            onChange={(e) => setScanInput(e.target.value)} 
            placeholder='{"items":[{"id":1,"name":"Classic Burger","price":120,"qty":1}],"total":120}'
            className="w-full h-32 p-3 border border-[#E5E7EB] rounded-lg font-mono text-sm bg-[#F7F7F7] focus:bg-white focus:ring-2 focus:ring-[#2B4FB9] outline-none transition" 
          />
          <div className="flex gap-3">
            <button 
              onClick={() => setShowScanner(false)} 
              className="flex-1 py-3 bg-[#F7F7F7] text-[#6B7280] font-bold rounded-lg hover:bg-[#E5E7EB] transition border border-[#E5E7EB]"
            >
              Cancel
            </button>
            <button 
              onClick={handleScan} 
              className="flex-1 py-3 bg-[#2B4FB9] text-white font-bold rounded-lg hover:bg-[#1E3A8A] transition shadow-md"
            >
              Load Order
            </button>
          </div>
        </div>
      </Modal>

      {/* RECEIPT MODAL (after successful order) */}
      <Modal 
        isOpen={!!completedOrder} 
        onClose={() => setCompletedOrder(null)} 
        title="Payment Successful"
        variant="success"
      >
        {completedOrder && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 bg-[#45C65A]/10 text-[#45C65A] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={40} />
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-[#1A1C23] mb-1">Order #{completedOrder.id}</h2>
              <p className="text-[#6B7280]">Saved locally. Syncing to cloud...</p>
            </div>

            <div className="bg-[#F7F7F7] p-4 rounded-lg text-left">
              <ul className="space-y-2 mb-3">
                {completedOrder.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm text-[#1A1C23]">
                    <span>{item.qty}x {item.name}</span>
                    <span className="font-bold">₱{item.price * item.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[#E5E7EB] pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-[#6B7280] uppercase">Total</span>
                <span className="text-2xl font-black text-[#1A1C23]">₱{completedOrder.total}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Customer Tracking QR
              </p>
              <div className="bg-white p-3 border border-[#E5E7EB] rounded-lg shadow-sm">
                <QRCode 
                  value={`${window.location.origin}/track/${completedOrder.id}`} 
                  size={120} 
                />
              </div>
            </div>

            <button 
              onClick={() => setCompletedOrder(null)} 
              className="w-full py-3 bg-[#2B4FB9] text-white font-bold rounded-lg hover:bg-[#1E3A8A] transition shadow-md flex items-center justify-center gap-2"
            >
              Done <ArrowRight size={18} />
            </button>
          </div>
        )}
      </Modal>

    </div>
  );
}