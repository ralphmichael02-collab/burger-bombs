// frontend/src/components/CustomerStore.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CustomerStore() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch directly from the cloud backend (simulating a customer's phone)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`)
      .then(res => res.json())
      .then(data => setMenu(data))
      .catch(err => console.error('Failed to load menu', err));
  }, []);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === item.id);
      if (existing) return prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const checkout = async () => {
    setCheckoutStatus('loading');
    setErrorMsg('');
    const mutationId = crypto.randomUUID();
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mutationId,
          type: 'CREATE_ORDER',
          payload: {
            items: cart,
            total,
            createdAt: new Date().toISOString(),
            orderType: 'ONLINE' // Mark this as an online order!
          }
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Checkout failed');
      }

      setCheckoutStatus('success');
      setCart([]);
    } catch (err) {
      setErrorMsg(err.message);
      setCheckoutStatus('error');
    }
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  // Success Screen
  if (checkoutStatus === 'success') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black text-green-600 mb-2">Order Confirmed! 🎉</h1>
        <p className="text-gray-700 mb-8 text-lg">Your food is being prepared. Please wait for delivery.</p>
        <Link to="/store" onClick={() => setCheckoutStatus('idle')} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold transition">
          Order Again
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-black text-white p-6 text-center shadow-md">
        <h1 className="text-3xl font-black tracking-widest uppercase">Burger Bombs</h1>
        <p className="text-sm text-gray-400 mt-1">Blowing diets since day one</p>
      </header>

      {/* Menu List */}
      <div className="max-w-md mx-auto p-4 mt-2">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Our Menu</h2>
        <div className="space-y-3">
          {menu.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-gray-100">
              <div>
                <div className="font-bold text-lg text-gray-900">{item.name}</div>
                <div className="text-gray-500 font-medium">₱{item.price}</div>
              </div>
              <button 
                disabled={!item.available}
                onClick={() => addToCart(item)}
                className="bg-black text-white px-5 py-2 rounded-lg font-bold disabled:bg-gray-300 disabled:text-gray-500 hover:bg-gray-800 transition"
              >
                {item.available ? 'Add' : 'Sold Out'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cart / Checkout Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white border-t p-4 shadow-2xl">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div>
              <div className="font-bold text-xl text-gray-900">₱{total}</div>
              <div className="text-sm text-gray-500 font-medium">{cart.reduce((s,c) => s + c.qty, 0)} items</div>
            </div>
            <button 
              onClick={checkout}
              disabled={checkoutStatus === 'loading'}
              className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition"
            >
              {checkoutStatus === 'loading' ? 'Processing...' : 'Checkout'}
            </button>
          </div>
          {checkoutStatus === 'error' && (
            <div className="text-red-500 text-sm text-center mt-2 font-bold">{errorMsg}</div>
          )}
        </div>
      )}
    </div>
  );
}