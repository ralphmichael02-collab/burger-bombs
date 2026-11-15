// frontend/src/components/POS.jsx
import { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, X, LayoutDashboard, QrCode, AlertTriangle, KeyRound,
  Smartphone, Bell, Pencil, Trash2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { io } from 'socket.io-client';
import { db } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import MenuList from './MenuList';
import Cart from './Cart';
import QRScanner from './QRScanner';
import ManualEntryModal from './ManualEntryModal';
import EditOrderModal from './EditOrderModal';
import ScannerPairingPanel from './ScannerPairingPanel';

// 👇 Stable Socket.IO Config
const socket = io(window.location.origin, { 
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generatePairCode = () => {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
};

export default function POS() {
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showPairingPanel, setShowPairingPanel] = useState(false);
  const [scannedOrder, setScannedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [manualEntryLoading, setManualEntryLoading] = useState(false);

  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPendingPanel, setShowPendingPanel] = useState(false);
  const pendingPanelRef = useRef(null);

  // Scanner pairing state managed at the POS level
  const [pairCode] = useState(generatePairCode);
  const [mobileConnected, setMobileConnected] = useState(false);
  const [lastMobileScan, setLastMobileScan] = useState(null);

  useEffect(() => {
    startSyncWorker();
    socket.emit('join:cashier');
    socket.emit('scanner:create-session', { pairCode });

    fetch('/api/orders/pending-kiosk')
      .then(r => r.json())
      .then(d => setPendingOrders(Array.isArray(d) ? d : []))
      .catch(console.error);

    const handleNew = (o) => setPendingOrders(p => p.find(x => x.id === o.id) ? p : [...p, o]);
    const handleUpdated = (u) => setPendingOrders(p => p.map(o => o.id === u.id ? { ...o, items: u.items, total: u.total } : o));
    const handleRemoved = ({ id }) => setPendingOrders(p => p.filter(o => o.id !== id));

    const handleMobileConnected = () => setMobileConnected(true);
    const handleMobileDisconnected = () => setMobileConnected(false);
    const handleMobileScan = ({ syncId }) => {
      setLastMobileScan(syncId);
      handleScan(syncId);
    };

    socket.on('kiosk:new-pending', handleNew);
    socket.on('kiosk:pending-updated', handleUpdated);
    socket.on('kiosk:pending-removed', handleRemoved);
    socket.on('scanner:mobile-connected', handleMobileConnected);
    socket.on('scanner:mobile-disconnected', handleMobileDisconnected);
    socket.on('scanner:received', handleMobileScan);

    return () => {
      socket.off('kiosk:new-pending', handleNew);
      socket.off('kiosk:pending-updated', handleUpdated);
      socket.off('kiosk:pending-removed', handleRemoved);
      socket.off('scanner:mobile-connected', handleMobileConnected);
      socket.off('scanner:mobile-disconnected', handleMobileDisconnected);
      socket.off('scanner:received', handleMobileScan);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (pendingPanelRef.current && !pendingPanelRef.current.contains(e.target)) setShowPendingPanel(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingSync = useLiveQuery(() => db.syncOutbox.where('status').equals('pending').count(), []);
  const todayOrders = useLiveQuery(() => db.orders.where('_syncStatus').anyOf('pending', 'synced').count(), []);

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
      const { localId } = await createOrder({ items: cart, total: cart.reduce((s, c) => s + c.price * c.qty, 0) });
      setLastOrderId(localId); setCart([]); setIsMobileCartOpen(false);
      setTimeout(() => setLastOrderId(null), 3000);
    } finally { setSubmitting(false); }
  };

  const handleScan = async (syncId) => {
    setShowScanner(false); setScanError(null);
    try {
      const res = await fetch(`/api/orders/by-sync-id/${encodeURIComponent(syncId)}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Order not found');
      setScannedOrder(await res.json());
    } catch (err) {
      setScanError(err.message); setTimeout(() => setScanError(null), 5000);
    }
  };

  const handleManualEntry = async (ref) => {
    setManualEntryLoading(true); setScanError(null);
    try {
      const res = await fetch(`/api/orders/by-ref/${encodeURIComponent(ref)}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Order not found');
      setScannedOrder(await res.json()); setShowManualEntry(false);
    } catch (err) { setScanError(err.message); } finally { setManualEntryLoading(false); }
  };

  const confirmScannedPayment = async () => {
    try {
      const res = await fetch(`/api/orders/${scannedOrder.id}/mark-paid`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to update');
      setPendingOrders(p => p.filter(o => o.id !== scannedOrder.id)); setScannedOrder(null);
    } catch (err) { setScanError(err.message); setTimeout(() => setScanError(null), 5000); }
  };

  const voidScannedOrder = async () => {
    if (!window.confirm(`Void order #${scannedOrder.id}?`)) return;
    try {
      const res = await fetch(`/api/orders/${scannedOrder.id}/void`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to void');
      setPendingOrders(p => p.filter(o => o.id !== scannedOrder.id)); setScannedOrder(null);
    } catch (err) { setScanError(err.message); setTimeout(() => setScanError(null), 5000); }
  };

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="h-[calc(100dvh-64px)] bg-background flex flex-col font-['Source_Sans_Pro',sans-serif]">
      <header className="bg-surface border-b border-border p-4 flex justify-between items-center shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-md"><LayoutDashboard size={20} /></div>
          <div>
            <h1 className="text-xl font-black text-text">POS Terminal</h1>
            <p className="text-xs text-text-muted font-bold hidden sm:block">Station 1</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-sm font-bold">
          <div className="hidden sm:block text-right pr-2">
            <p className="text-text-muted text-[10px] uppercase mb-0.5">Pending Sync</p>
            <p className={`text-lg ${pendingSync > 0 ? 'text-orange-500' : 'text-success'}`}>{pendingSync ?? '–'}</p>
          </div>

          <div className="relative" ref={pendingPanelRef}>
            <button onClick={() => setShowPendingPanel(!showPendingPanel)} className="relative p-3 bg-background border border-border rounded-xl hover:bg-gray-100 shadow-sm">
              <Bell size={20} className="text-text" />
              {pendingOrders.length > 0 && <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-xs font-bold w-5 h-5 rounded-full border-2 border-surface flex items-center justify-center animate-pulse">{pendingOrders.length}</span>}
            </button>
            {showPendingPanel && (
              <div className="absolute right-0 mt-2 w-80 bg-surface rounded-xl shadow-2xl border border-border z-50 overflow-hidden">
                <div className="p-3 border-b border-border bg-background flex justify-between"><h3 className="font-bold text-text text-sm">Pending Kiosk Orders</h3></div>
                <div className="max-h-96 overflow-y-auto">
                  {pendingOrders.length === 0 ? <p className="p-4 text-center text-text-muted text-sm">No pending orders</p> : pendingOrders.map(o => (
                    <button key={o.id} onClick={() => { setScannedOrder(o); setShowPendingPanel(false); }} className="w-full text-left p-3 border-b border-border hover:bg-background">
                      <div className="flex justify-between mb-1"><span className="font-bold text-text text-sm">#{o.id}</span><span className="font-black text-primary text-sm">₱{o.total.toFixed(2)}</span></div>
                      <div className="flex justify-between text-xs text-text-muted"><span>Ref: {o.sync_id.slice(0, 8).toUpperCase()}</span><span>{new Date(o.created_at).toLocaleTimeString()}</span></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setShowPairingPanel(true)} className="p-3 bg-background border border-border text-text rounded-xl hover:bg-gray-100 shadow-sm relative">
            <Smartphone size={20} />
            {mobileConnected && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-success rounded-full border-2 border-surface"></span>}
          </button>
          
          <button onClick={() => setShowScanner(true)} className="p-3 bg-primary text-white rounded-xl hover:bg-primary-hover shadow-md"><QrCode size={20} /></button>
          <button onClick={() => setShowManualEntry(true)} className="p-3 bg-background border border-border text-text rounded-xl hover:bg-gray-100 shadow-sm"><KeyRound size={20} /></button>

          <button onClick={() => setIsMobileCartOpen(true)} className="lg:hidden relative p-3 bg-background border border-border rounded-xl hover:bg-gray-100 shadow-sm">
            <ShoppingCart size={20} className="text-text" />
            {totalItems > 0 && <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-surface font-bold">{totalItems}</span>}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full"><MenuList onAdd={addToCart} /></div>
        <aside className="hidden lg:flex flex-col w-96 bg-surface border-l border-border shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10"><Cart cart={cart} setCart={setCart} onSubmit={placeOrder} submitting={submitting} /></aside>
      </div>

      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileCartOpen(false)} />
          <div className="relative w-full max-w-sm bg-surface h-full flex flex-col shadow-2xl animate-slide-in">
            <button onClick={() => setIsMobileCartOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full z-10"><X size={20} /></button>
            <Cart cart={cart} setCart={setCart} onSubmit={placeOrder} submitting={submitting} />
          </div>
        </div>
      )}

      {lastOrderId && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-xl shadow-xl font-bold z-50 animate-scale-in">✅ Order placed</div>}
      
      {scanError && !showManualEntry && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-danger text-white px-6 py-3 rounded-xl shadow-xl font-bold flex items-center gap-2 z-[100]">
          <AlertTriangle size={18} /> {scanError} <button onClick={() => setScanError(null)}><X size={16} /></button>
        </div>
      )}

      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      {showManualEntry && <ManualEntryModal onSubmit={handleManualEntry} onClose={() => setShowManualEntry(false)} loading={manualEntryLoading} error={scanError} />}
      
      {showPairingPanel && (
        <ScannerPairingPanel 
          pairCode={pairCode}
          mobileConnected={mobileConnected}
          lastScan={lastMobileScan}
          onClose={() => setShowPairingPanel(false)} 
        />
      )}

      {scannedOrder && !editingOrder && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 shadow-2xl border border-border">
            <h2 className="text-2xl font-black text-text mb-1">Order #{scannedOrder.id}</h2>
            <p className="text-sm text-text-muted mb-4 font-mono">Ref: {scannedOrder.sync_id.slice(0, 8).toUpperCase()}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {scannedOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between p-3 bg-background rounded-lg border border-border">
                  <span className="font-bold">{item.name}</span><span className="text-text-muted">×{item.qty}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xl font-black text-text border-t border-border pt-4 mb-4"><span>Total</span><span>₱{scannedOrder.total.toFixed(2)}</span></div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={() => setEditingOrder(scannedOrder)} className="py-3 bg-background border text-text-muted font-bold rounded-xl flex items-center justify-center gap-2"><Pencil size={16} /> Edit</button>
              <button onClick={voidScannedOrder} className="py-3 bg-red-50 text-danger font-bold rounded-xl flex items-center justify-center gap-2"><Trash2 size={16} /> Void</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setScannedOrder(null)} className="flex-1 py-3 bg-background border text-text-muted font-bold rounded-xl">Close</button>
              <button onClick={confirmScannedPayment} className="flex-1 py-3 bg-success text-white font-bold rounded-xl shadow-md">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}

      {editingOrder && <EditOrderModal order={editingOrder} onSave={(u) => { setPendingOrders(p => p.map(o => o.id === u.id ? u : o)); setScannedOrder(u); setEditingOrder(null); }} onClose={() => setEditingOrder(null)} />}
    </div>
  );
}