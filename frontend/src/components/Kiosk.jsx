// frontend/src/components/Kiosk.jsx
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

export default function Kiosk() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [settings, setSettings] = useState({ restaurant_name: 'Burger Bombs', tagline: '' });
  const [filterCategory, setFilterCategory] = useState('All'); // 👈 Category Filter State

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`)
      .then(res => res.json())
      .then(data => setMenu(data))
      .catch(err => console.error('Failed to load menu', err));
      
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error('Failed to load settings', err));
  }, []);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === item.id);
      if (existing) return prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(x => x.id !== itemId));
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const qrData = JSON.stringify({ items: cart, total });
  const filteredMenu = menu.filter(item => filterCategory === 'All' || item.category === filterCategory);

  if (showReceipt) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full">
          <h1 className="text-3xl font-black mb-2 text-center">Scan at Counter</h1>
          <p className="text-gray-500 mb-8 text-center text-lg">Please present this QR code to the cashier to pay.</p>
          
          <div className="bg-white p-4 border-4 border-black rounded-xl mb-8">
            <QRCode value={qrData} size={250} />
          </div>

          <div className="w-full bg-gray-100 p-4 rounded-xl mb-6 flex justify-between items-center">
            <span className="font-bold text-gray-500">Total to pay:</span>
            <span className="font-black text-2xl text-green-600">₱{total}</span>
          </div>

          <button 
            onClick={() => { setCart([]); setShowReceipt(false); }}
            className="w-full bg-black text-white font-bold py-4 rounded-xl text-lg hover:bg-gray-800 transition"
          >
            Start New Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col">
      <header className="bg-yellow-500 text-black p-6 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black tracking-widest uppercase">{settings.restaurant_name}</h1>
          <p className="text-sm font-bold text-yellow-800">{settings.tagline}</p>
        </div>
        <span className="text-lg font-bold bg-white px-4 py-1 rounded-full shadow-sm">Self-Service</span>
      </header>

      <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-7xl mx-auto w-full">
        <div className="flex-1 flex flex-col">
          
          {/* Category Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-4">
            {['All', 'Burgers', 'Combos', 'Sides', 'Drinks', 'Desserts'].map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)} 
                className={`px-6 py-3 text-lg font-bold rounded-xl whitespace-nowrap shadow-sm transition ${filterCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMenu.map(item => (
              <button
                key={item.id}
                disabled={!item.available}
                onClick={() => addToCart(item)}
                className={`p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center h-48 transition transform active:scale-95
                  ${item.available ? 'bg-white hover:bg-gray-50' : 'bg-gray-200 opacity-50 cursor-not-allowed'}`}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">{item.name}</h3>
                <p className="text-xl font-black text-green-600">₱{item.price}</p>
                {!item.available && <p className="text-red-500 font-bold mt-2">SOLD OUT</p>}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full md:w-96 bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="bg-black text-white p-4">
            <h2 className="text-xl font-bold">Your Order</h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">Tap items to add them to your order.</div>
            ) : (
              cart.map(c => (
                <div key={c.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <div className="font-bold text-gray-800">{c.name}</div>
                    <div className="text-sm text-gray-500">₱{c.price} x {c.qty}</div>
                  </div>
                  <button onClick={() => removeFromCart(c.id)} className="text-red-500 p-2 font-bold hover:bg-red-50 rounded">✕</button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500 font-bold text-lg">Total</span>
              <span className="text-3xl font-black text-gray-800">₱{total}</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={() => setShowReceipt(true)}
              className="w-full bg-yellow-500 text-black font-black text-xl py-4 rounded-xl hover:bg-yellow-400 transition disabled:opacity-50 shadow-md"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}