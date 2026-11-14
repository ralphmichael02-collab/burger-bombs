// frontend/src/components/CustomerStore.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CustomerStore() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); // idle, loading, error
  const [errorMsg, setErrorMsg] = useState('');

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
            orderType: 'ONLINE'
          }
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Checkout failed');
      }

      const data = await res.json();
      
      // Wait 3 seconds so the user can see the nice loading animation, then redirect
      setTimeout(() => {
        if (data.orderId) {
          navigate(`/track/${data.orderId}`);
        } else {
          setErrorMsg('Order placed, but no ID was returned.');
          setCheckoutStatus('error');
        }
      }, 3000);

    } catch (err) {
      setErrorMsg(err.message);
      setCheckoutStatus('error');
    }
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  // --- 1. FULL SCREEN LOADING OVERLAY ---
  if (checkoutStatus === 'loading') {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center p-6 text-white text-center">
        {/* Animated Scooter */}
        <div className="relative w-40 h-40 flex items-center justify-center mb-8">
          {/* Spinning Ring */}
          <div className="absolute inset-0 border-[6px] border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          {/* Bouncing Scooter */}
          <div className="text-6xl animate-bounce mt-2">🛵</div>
        </div>
        
        <h2 className="text-3xl font-black mb-3 text-yellow-500 animate-pulse">
          Processing your order...
        </h2>
        <p className="text-gray-400 text-lg">
          Sending your food to the kitchen.
        </p>
      </div>
    );
  }

  // --- 2. NORMAL STORE UI ---
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-black text-white p-6 text-center shadow-md">
        <h1 className="text-3xl font-black tracking-widest uppercase">Burger Bombs</h1>
        <p className="text-sm text-gray-400 mt-1">Blowing diets since day one</p>
      </header>

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

      {cart.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white border-t p-4 shadow-2xl z-40">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div>
              <div className="font-bold text-xl text-gray-900">₱{total}</div>
              <div className="text-sm text-gray-500 font-medium">{cart.reduce((s,c) => s + c.qty, 0)} items</div>
            </div>
            <button 
              onClick={checkout}
              className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition"
            >
              Checkout
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