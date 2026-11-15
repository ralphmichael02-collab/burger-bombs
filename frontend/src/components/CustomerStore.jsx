// frontend/src/components/CustomerStore.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import AddressPicker from './AddressPicker';

const DEFAULT_CATS = ['Burgers', 'Combos', 'Sides', 'Drinks', 'Desserts'];

export default function CustomerStore() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); 
  const [errorMsg, setErrorMsg] = useState('');
  
  const [filterCategory, setFilterCategory] = useState('All'); 
  const [categories, setCategories] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('GCash');

  // Auth & Address State
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [deliveryData, setDeliveryData] = useState(null);

  useEffect(() => {
    // Check for existing login
    const savedUser = localStorage.getItem('burger_user');
    const savedToken = localStorage.getItem('burger_token');
    if (savedUser && savedToken) setUser(JSON.parse(savedUser));

    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`).then(res => res.json()).then(setMenu);
    fetch(`${import.meta.env.VITE_API_BASE}/api/categories`).then(res => res.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) setCategories(data);
    });
  }, []);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === item.id);
      if (existing) return prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const handleAuthSuccess = (userData, token) => {
    setUser(userData);
    localStorage.setItem('burger_user', JSON.stringify(userData));
    localStorage.setItem('burger_token', token);
    setShowAuth(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('burger_user');
    localStorage.removeItem('burger_token');
  };

  // When clicking Checkout, force login, then force address
  const initiateCheckout = () => {
    if (!user) {
      setShowAuth(true);
    } else {
      setShowAddressPicker(true);
    }
  };

  const handleAddressConfirm = (addressText, lat, lng) => {
    setDeliveryData({ address: addressText, lat, lng });
    setShowAddressPicker(false);
    processOrder(addressText, lat, lng);
  };

  const processOrder = async (address, lat, lng) => {
    setCheckoutStatus('loading');
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
            orderType: 'ONLINE',
            paymentMethod: paymentMethod,
            customerId: user.id,
            deliveryAddress: address,
            deliveryLat: lat,
            deliveryLng: lng
          }
        })
      });

      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      
      setTimeout(() => {
        navigate(`/track/${data.orderId}`);
      }, 3000);

    } catch (err) {
      setErrorMsg(err.message);
      setCheckoutStatus('error');
    }
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATS;
  const filteredMenu = menu.filter(item => filterCategory === 'All' || item.category === filterCategory);

  // --- RENDER LOADING SCREEN ---
  if (checkoutStatus === 'loading') {
    return (
      <div className="fixed inset-0 bg-gray-900 z-[100] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="relative w-40 h-40 flex items-center justify-center mb-8">
          <div className="absolute inset-0 border-[6px] border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-6xl animate-bounce mt-2">🛵</div>
        </div>
        <h2 className="text-3xl font-black mb-3 text-yellow-500 animate-pulse">Processing your order...</h2>
        <p className="text-gray-400">Sending address to kitchen.</p>
      </div>
    );
  }

  // --- RENDER STORE ---
  return (
    <div className="min-h-screen bg-gray-50 pb-48">
      <header className="bg-black text-white p-6 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-widest uppercase">Burger Bombs</h1>
          <p className="text-sm text-gray-400 mt-1">Welcome, {user ? user.name : 'Guest'}</p>
        </div>
        {user ? (
          <button onClick={handleLogout} className="text-sm bg-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-700">Logout</button>
        ) : (
          <button onClick={() => setShowAuth(true)} className="text-sm bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-400">Login / Sign Up</button>
        )}
      </header>

      <div className="max-w-md mx-auto p-4 mt-2">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Our Menu</h2>
        
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
          {['All', ...displayCategories].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} 
              className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap shadow-sm transition ${filterCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredMenu.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-40 object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
              )}
              
              <div className="p-4 flex justify-between items-center flex-1">
                <div>
                  <div className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-1">{item.category}</div>
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

      {/* Checkout Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 p-4 shadow-2xl z-40 rounded-t-3xl">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {['GCash', 'Maya', 'Cash'].map(method => (
                  <button key={method} onClick={() => setPaymentMethod(method)}
                    className={`py-2 rounded-lg font-bold text-sm border transition ${paymentMethod === method ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-xl text-gray-900">₱{total}</div>
                <div className="text-sm text-gray-500 font-medium">{cart.reduce((s,c) => s + c.qty, 0)} items</div>
              </div>
              <button onClick={initiateCheckout} className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition shadow-lg">
                {user ? 'Proceed to Address' : 'Login to Checkout'}
              </button>
            </div>
            {checkoutStatus === 'error' && <div className="text-red-500 text-sm text-center mt-2 font-bold">{errorMsg}</div>}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={handleAuthSuccess} />}
      {showAddressPicker && <AddressPicker onClose={() => setShowAddressPicker(false)} onConfirm={handleAddressConfirm} />}
    </div>
  );
}