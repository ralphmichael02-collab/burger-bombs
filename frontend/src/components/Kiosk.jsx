// frontend/src/components/Kiosk.jsx
import { useState, useEffect } from 'react';
import { db } from '../db';
import { createOrder } from '../services/orderService';
import { ShoppingCart, Plus, Minus, X, CheckCircle, Utensils, Loader2, WifiOff } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function Kiosk() {
  const [step, setStep] = useState('menu');
  const [cart, setCart] = useState([]);
  const [syncId, setSyncId] = useState(null);
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    db.menuItems.toArray().then(setMenu);
  }, []);

  useEffect(() => {
    if (step !== 'syncing' || !syncId) return;
    const interval = setInterval(async () => {
      const item = await db.syncOutbox.where('mutationId').equals(syncId).first();
      if (item && item.status === 'sent') {
        clearInterval(interval);
        setStep('receipt');
      } else if (item && item.status === 'failed') {
        clearInterval(interval);
        setStep('offline');
      }
    }, 500);
    if (!navigator.onLine) {
      clearInterval(interval);
      setStep('offline');
    }
    return () => clearInterval(interval);
  }, [step, syncId]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === item.id);
      if (existing) return prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x).filter(x => x.qty > 0));
  };

  const placeOrder = async () => {
    const { mutationId } = await createOrder({
      items: cart,
      total: cart.reduce((s, c) => s + c.price * c.qty, 0),
      channel: 'KIOSK',
      orderType: 'KIOSK',
      paymentMethod: 'Cash',
    });
    setSyncId(mutationId);
    setStep('syncing');
  };

  if (step === 'syncing') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 size={80} className="text-primary mb-6 animate-spin" />
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-text">Confirming your order…</h1>
      </div>
    );
  }

  if (step === 'offline') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <WifiOff size={80} className="text-orange-500 mb-6" />
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-text">Please show this to the cashier</h1>
        <div className="bg-surface p-8 rounded-3xl shadow-xl border border-border mb-8">
          <p className="text-xs text-text-muted uppercase font-bold mb-2">Order Reference</p>
          <p className="text-2xl font-mono font-black text-text tracking-widest">{syncId?.slice(0, 8).toUpperCase()}</p>
        </div>
        <button onClick={() => { setCart([]); setStep('menu'); setSyncId(null); }} className="bg-primary text-white text-xl font-black py-5 px-16 rounded-2xl hover:bg-primary-hover transition shadow-xl">
          Start New Order
        </button>
      </div>
    );
  }

  if (step === 'receipt') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle size={80} className="text-success mb-6 animate-scale-in" />
        <h1 className="text-4xl md:text-5xl font-black mb-4 text-text">Order Confirmed!</h1>
        <p className="text-text-muted mb-8 text-xl">Show this at the counter to pay</p>
        <div className="bg-surface p-8 rounded-3xl shadow-xl border border-border mb-6">
          <QRCode value={syncId} size={256} />
        </div>
        
        <div className="bg-background border-2 border-dashed border-border rounded-2xl px-8 py-4 mb-8">
          <p className="text-xs text-text-muted uppercase font-bold mb-1 tracking-wider">Order Reference</p>
          <p className="font-mono text-4xl font-black text-primary tracking-widest">
            {syncId.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-xs text-text-muted mt-2">Read this to the cashier if scanning fails</p>
        </div>

        <p className="text-sm text-text-muted mb-8">Order total: ₱{cart.reduce((s, c) => s + c.price * c.qty, 0)}</p>
        <button onClick={() => { setCart([]); setStep('menu'); setSyncId(null); }} className="bg-primary text-white text-xl font-black py-5 px-16 rounded-2xl hover:bg-primary-hover transition shadow-xl">
          Start New Order
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface border-b border-border p-4 md:p-6 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <Utensils size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-text hidden sm:block">Burger Bombs</h1>
        </div>
        {cart.length > 0 && (
          <button onClick={() => setStep('cart')} className="bg-primary text-white px-6 md:px-8 py-3 rounded-xl font-bold flex items-center gap-3 shadow-lg hover:bg-primary-hover transition">
            <ShoppingCart size={24} /> 
            <span className="hidden sm:inline">{cart.reduce((s, c) => s + c.qty, 0)} Items •</span> ₱{cart.reduce((s, c) => s + c.price * c.qty, 0)}
          </button>
        )}
      </header>

      <div className="flex-1 p-4 md:p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 overflow-y-auto">
        {menu.filter(m => m.available).map(item => (
          <button key={item.id} onClick={() => addToCart(item)}
            className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-primary transition flex flex-col text-left group">
            <div className="h-32 md:h-48 bg-background flex items-center justify-center overflow-hidden shrink-0">
              {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <Utensils size={48} className="text-gray-300" />}
            </div>
            <div className="p-4 md:p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-text text-base md:text-xl truncate">{item.name}</h3>
                <p className="text-text-muted text-[11px] md:text-sm mt-1 line-clamp-2 min-h-[2.5rem]">{item.description || item.category}</p>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-xl md:text-2xl font-black text-primary">₱{item.price}</span>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold group-hover:bg-primary group-hover:text-white transition">
                  <Plus size={20} />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {step === 'cart' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface h-full flex flex-col animate-slide-in shadow-2xl">
            <div className="p-6 border-b border-border flex justify-between items-center bg-background shrink-0">
              <h2 className="text-2xl font-black text-text">Your Order</h2>
              <button onClick={() => setStep('menu')} className="p-2 bg-gray-100 rounded-lg text-text-muted hover:bg-gray-200 transition"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-text-muted py-10 font-bold">Your cart is empty</p>
              ) : cart.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-background p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-text text-lg truncate">{c.name}</p>
                    <p className="text-primary font-black mt-1">₱{c.price}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-surface rounded-lg p-1 border border-border shadow-sm shrink-0">
                    <button onClick={() => updateQty(c.id, -1)} className="w-10 h-10 flex items-center justify-center bg-background rounded-md text-text hover:bg-gray-100 transition"><Minus size={18} /></button>
                    <span className="font-bold w-6 text-center text-text text-lg">{c.qty}</span>
                    <button onClick={() => updateQty(c.id, 1)} className="w-10 h-10 flex items-center justify-center bg-background rounded-md text-text hover:bg-gray-100 transition"><Plus size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-border bg-background shrink-0">
              <div className="flex justify-between text-3xl font-black text-text mb-6">
                <span>Total</span>
                <span>₱{cart.reduce((s, c) => s + c.price * c.qty, 0)}</span>
              </div>
              <button disabled={cart.length === 0} onClick={placeOrder} className="w-full bg-primary text-white font-black py-5 rounded-xl shadow-lg hover:bg-primary-hover disabled:opacity-50 transition text-xl">
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}