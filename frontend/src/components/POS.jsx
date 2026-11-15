// frontend/src/components/POS.jsx
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, refreshMenuFromBackend } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import QRCode from 'react-qr-code';
import MenuList from './MenuList';
import Cart from './Cart';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Receipt & Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null); // Holds receipt data

  useEffect(() => {
    startSyncWorker();
    const interval = setInterval(() => { refreshMenuFromBackend(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const pendingSync = useLiveQuery(() => db.syncOutbox.where('status').equals('pending').count(), []);
  const totalOrders = useLiveQuery(() => db.orders.count(), []);

  const rejectedOrders = useLiveQuery(() => db.orders.where('_syncStatus').equals('rejected').toArray(), []);
  useEffect(() => {
    if (rejectedOrders && rejectedOrders.length > 0) {
      alert(`⚠️ Order Failed: Out of Stock!\nThe system rejected the latest order because ingredients ran out.`);
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
      } else {
        alert("Invalid QR Format.");
      }
    } catch (e) {
      alert("Could not read QR code. Make sure you pasted the exact JSON text.");
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
      const localId = await createOrder({
        items: cart,
        total: orderTotal,
      });
      
      // Save the order details for the receipt modal
      setCompletedOrder({ id: localId, items: cart, total: orderTotal });
      setCart([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-yellow-500 text-white p-3 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">🍔 Burger Bombs POS</h1>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setShowScanner(true)} className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-sm">
            📷 Scan Kiosk QR
          </button>
          
          <div className="text-sm flex gap-4 bg-yellow-600 px-4 py-1.5 rounded-full font-medium">
            <span>Pending sync: <b>{pendingSync ?? '–'}</b></span>
            <span className="border-l border-yellow-400 pl-4">Local orders: <b>{totalOrders ?? '–'}</b></span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 max-w-7xl mx-auto">
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <MenuList onAdd={addToCart} />
        </div>
        <div className="h-[calc(100vh-120px)] sticky top-4">
          <Cart cart={cart} setCart={setCart} onSubmit={placeOrder} submitting={submitting} />
        </div>
      </div>

      {/* KIOSK SCANNER MODAL */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">Scan Kiosk QR</h2>
            <p className="text-sm text-gray-500 mb-4">Scan the customer's receipt or paste the JSON data below.</p>
            <textarea
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder='{"items":[{"id":1...'
              className="w-full h-32 p-3 border border-gray-300 rounded-lg mb-4 font-mono text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowScanner(false)} className="flex-1 py-3 bg-gray-200 font-bold rounded-lg hover:bg-gray-300">Cancel</button>
              <button onClick={handleScan} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Load Order</button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL (Shows after checkout) */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-2xl font-black mb-1">Payment Successful</h2>
            <p className="text-gray-500 mb-6">Order #{completedOrder.id}</p>
            
            <div className="bg-gray-50 p-4 rounded-xl mb-6">
              <ul className="text-left mb-4 space-y-2">
                {completedOrder.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm">
                    <span>{item.qty}x {item.name}</span>
                    <span>₱{item.price * item.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₱{completedOrder.total}</span>
              </div>
            </div>

            {/* QR Code that links to the live tracking page */}
            <div className="flex flex-col items-center mb-6">
              <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">Scan to Track Order</p>
              <div className="bg-white p-2 border-2 border-gray-200 rounded-xl">
                <QRCode value={`${window.location.origin}/track/${completedOrder.id}`} size={120} />
              </div>
            </div>

            <button 
              onClick={() => setCompletedOrder(null)} 
              className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}