// frontend/src/components/CustomerStore.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CustomerStore() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); 
  const [errorMsg, setErrorMsg] = useState('');
  
  // State for past orders
  const [pastOrders, setPastOrders] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`)
      .then(res => res.json())
      .then(data => setMenu(data))
      .catch(err => console.error('Failed to load menu', err));

    // Load past orders from local storage
    const saved = JSON.parse(localStorage.getItem('burger_bombs_orders') || '[]');
    setPastOrders(saved);
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
      
      // Save order ID to local storage
      if (data.orderId) {
        const newOrder = { id: data.orderId, date: new Date().toLocaleDateString(), total };
        const updatedOrders = [newOrder, ...pastOrders];
        localStorage.setItem('burger_bombs_orders', JSON.stringify(updatedOrders));
        setPastOrders(updatedOrders);
      }

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

  if (checkoutStatus === 'loading') {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="relative w-40 h-40 flex items-center justify-center mb-8">
          <div className="absolute inset-0 border-[6px] border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-6xl animate-bounce mt-2">🛵</div>
        </div>
        <h2 className="text-3xl font-black mb-3 text-yellow-500 animate-pulse">Processing your order...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-black text-white p-6 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-widest uppercase">Burger Bombs</h1>
          <p className="text-sm text-gray-400 mt-1">Blowing diets since day one</p>
        </div>
        {/* Simple navigation back to home */}
        <button onClick={() => navigate('/')} className="text-sm bg-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-700">Home</button>
      </header>

      <div className="max-w-md mx-auto p-4 mt-2">
        
        {/* PAST ORDERS SECTION */}
        {pastOrders.length > 0 && (
          <div className="mb-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Your Recent Orders</h2>
            <div className="space-y-2">
              {pastOrders.slice(0, 3).map(order => (
                <div key={order.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="font-bold text-gray-800">Order #{order.id}</p>
                    <p className="text-xs text-gray-500">{order.date} • ₱{order.total}</p>
                  </div>
                  <button onClick={() => navigate(`/track/${order.id}`)} className="text-sm font-bold text-blue-600 hover:underline">Track</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4 text-gray-800">Our Menu</h2>
        
        <div className="space-y-4">
          {menu.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-40 object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
              )}
              
              <div className="p-4 flex justify-between items-center flex-1">
                <div>
                  <div className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-1">{item.category || 'Burgers'}</div>
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