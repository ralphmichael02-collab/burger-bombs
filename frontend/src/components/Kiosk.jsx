// frontend/src/components/Kiosk.jsx
import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';

export default function Kiosk() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [settings, setSettings] = useState({ restaurant_name: 'Burger Bombs', tagline: '' });
  const [filterCategory, setFilterCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [idle, setIdle] = useState(false);

  // Idle timer ref
  const idleTimer = useRef(null);

  useEffect(() => {
    // Fetch data
    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`).then(res => res.json()).then(setMenu);
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`).then(res => res.json()).then(setSettings);
    fetch(`${import.meta.env.VITE_API_BASE}/api/categories`).then(res => res.json()).then(setCategories);

    // Set up idle timer (e.g., 60 seconds of no interaction)
    resetIdleTimer();

    return () => clearTimeout(idleTimer.current);
  }, []);

  const resetIdleTimer = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIdle(true);
      setCart([]); // Clear cart on idle
      setShowReceipt(false);
    }, 60000); // 60 seconds
  };

  const addToCart = (item) => {
    resetIdleTimer();
    setCart(prev => {
      const existing = prev.find(x => x.id === item.id);
      if (existing) return prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    resetIdleTimer();
    setCart(prev => prev.filter(x => x.id !== itemId));
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const qrData = JSON.stringify({ items: cart, total });
  const displayCategories = categories.length > 0 ? categories : ['Burgers', 'Combos', 'Sides', 'Drinks'];
  const filteredMenu = menu.filter(item => filterCategory === 'All' || item.category === filterCategory);

  // --- IDLE SCREEN ---
  if (idle) {
    return (
      <div 
        onClick={resetIdleTimer} 
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center cursor-pointer"
      >
        <div className="text-8xl mb-8 animate-bounce">🍔</div>
        <h1 className="text-5xl font-black mb-4 tracking-tight">Welcome to {settings.restaurant_name}</h1>
        <p className="text-xl text-slate-400 mb-8">Tap anywhere to start your order</p>
        <div className="bg-orange-500 text-black px-8 py-4 rounded-2xl font-black text-2xl shadow-lg animate-pulse">
          Start Order
        </div>
      </div>
    );
  }

  // --- RECEIPT SCREEN ---
  if (showReceipt) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
          <h1 className="text-3xl font-black mb-2 text-center text-slate-900">Scan at Counter</h1>
          <p className="text-slate-500 mb-8 text-center text-lg">Please present this QR code to the cashier to pay.</p>
          
          <div className="bg-white p-4 border-4 border-slate-900 rounded-xl mb-8">
            <QRCode value={qrData} size={250} />
          </div>

          <div className="w-full bg-slate-100 p-4 rounded-xl mb-6 flex justify-between items-center">
            <span className="font-bold text-slate-500">Total to pay:</span>
            <span className="font-black text-2xl text-slate-900">₱{total}</span>
          </div>

          <button 
            onClick={() => { setCart([]); setShowReceipt(false); resetIdleTimer(); }}
            className="w-full bg-orange-500 text-black font-bold py-4 rounded-xl text-lg hover:bg-orange-400 transition"
          >
            Start New Order
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN KIOSK UI ---
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 text-white p-6 shadow-md flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-4">
          {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover shadow-sm" />}
          <div>
            <h1 className="text-4xl font-black tracking-widest uppercase">{settings.restaurant_name}</h1>
            <p className="text-sm font-bold text-orange-400">{settings.tagline}</p>
          </div>
        </div>
        <span className="text-lg font-bold bg-slate-800 px-4 py-1 rounded-full shadow-sm text-slate-300">Self-Service</span>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left Panel: Menu Grid */}
        <div className="flex-1 flex flex-col">
          
          {/* Category Filter */}
          <div className="flex gap-3 overflow-x-auto pb-6">
            {['All', ...displayCategories].map(cat => (
              <button key={cat} onClick={() => { setFilterCategory(cat); resetIdleTimer(); }} 
                className={`px-8 py-4 text-lg font-bold rounded-2xl whitespace-nowrap shadow-sm transition-all min-w-[64px] min-h-[64px]
                  ${filterCategory === cat 
                    ? 'bg-orange-500 text-black shadow-orange-500/30 shadow-lg' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMenu.map(item => (
              <button
                key={item.id}
                disabled={!item.available}
                onClick={() => addToCart(item)}
                className={`relative rounded-3xl shadow-xl flex flex-col overflow-hidden transition-all duration-300 transform active:scale-95 text-left h-72
                  ${item.available ? 'bg-slate-800 hover:bg-slate-700 cursor-pointer' : 'bg-slate-800/50 opacity-60 cursor-not-allowed'}`}
              >
                {/* Image */}
                <div className="h-40 w-full relative">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center text-slate-500 font-bold">No Image</div>
                  )}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur px-3 py-1 rounded-lg text-xs font-black text-white uppercase tracking-wider">
                    {item.category}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <h3 className="text-xl font-bold text-white leading-tight line-clamp-2">{item.name}</h3>
                  <p className="text-2xl font-black text-orange-500">₱{item.price}</p>
                </div>

                {/* Sold Out Overlay */}
                {!item.available && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-red-600 text-white font-black text-xl px-8 py-3 rounded-xl transform -rotate-12 shadow-2xl border-4 border-white">
                      SOLD OUT
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Cart Sidebar */}
        <div className="w-full lg:w-[400px] bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-800">
          <div className="bg-slate-950 text-white p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-2xl font-black">Your Order</h2>
            <span className="bg-slate-800 text-slate-300 font-bold px-3 py-1 rounded-full text-sm">{cart.reduce((s,c) => s + c.qty, 0)} items</span>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <span className="text-6xl mb-4">🛒</span>
                <p className="font-bold text-xl">Tap items to add</p>
              </div>
            ) : (
              cart.map(c => (
                <div key={c.id} className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <div className="font-bold text-white text-lg">{c.name}</div>
                    <div className="text-sm text-slate-400">₱{c.price} × {c.qty}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => removeFromCart(c.id)} className="text-red-500 p-2 font-bold hover:bg-slate-800 rounded-lg transition">✕</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-slate-950 border-t border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-400 font-bold text-xl">Total</span>
              <span className="text-4xl font-black text-white">₱{total}</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={() => { setShowReceipt(true); resetIdleTimer(); }}
              className="w-full bg-orange-500 text-black font-black text-2xl py-5 rounded-2xl hover:bg-orange-400 transition disabled:opacity-50 shadow-lg min-h-[64px]"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}