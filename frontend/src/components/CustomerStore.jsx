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
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); // idle, address, payment, processing
  const [filterCategory, setFilterCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('GCash');

  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('burger_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`).then(r => r.json()).then(setMenu);
    fetch(`${import.meta.env.VITE_API_BASE}/api/categories`).then(r => r.json()).then(data => {
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

  const initiateCheckout = () => {
    if (!user) setShowAuth(true);
    else setShowAddressPicker(true);
  };

  const handleAddressConfirm = (addressText, lat, lng) => {
    setShowAddressPicker(false);
    if (paymentMethod === 'Cash') {
      processOrder(addressText, lat, lng, null);
    } else {
      setCheckoutStatus('payment');
      window._tempAddress = { address: addressText, lat, lng }; 
    }
  };

  const processOrder = async (address, lat, lng, paymentRef) => {
    setCheckoutStatus('processing');
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mutationId: crypto.randomUUID(),
          type: 'CREATE_ORDER',
          payload: { items: cart, total, createdAt: new Date().toISOString(), orderType: 'ONLINE', paymentMethod, customerId: user.id, deliveryAddress: address, deliveryLat: lat, deliveryLng: lng, paymentReference: paymentRef }
        })
      });
      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      setTimeout(() => { navigate(`/track/${data.orderId}`); }, 3000);
    } catch (err) { alert(err.message); setCheckoutStatus('idle'); }
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATS;
  const filteredMenu = menu.filter(item => filterCategory === 'All' || item.category === filterCategory);

  if (checkoutStatus === 'payment') {
    const addr = window._tempAddress;
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-white text-4xl font-black">G</span></div>
          <h2 className="text-2xl font-black mb-2">GCash Payment</h2>
          <p className="text-slate-500 mb-6">Amount: <b>₱{total}</b></p>
          <div className="bg-slate-100 p-4 rounded-xl mb-6">
            <p className="text-xs text-slate-500 mb-1">Reference Number</p>
            <p className="font-mono text-xl font-bold tracking-widest">{Math.random().toString().slice(2, 12)}</p>
          </div>
          <button onClick={() => processOrder(addr.address, addr.lat, addr.lng, 'GCASH-' + Date.now())} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mb-3">Simulate Successful Payment</button>
          <button onClick={() => setCheckoutStatus('idle')} className="text-slate-500 text-sm hover:underline">Cancel</button>
        </div>
      </div>
    );
  }

  if (checkoutStatus === 'processing') {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-40 h-40 border-[6px] border-orange-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-3xl font-black text-orange-500 animate-pulse">Processing your order...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-48">
      <header className="bg-slate-900 text-white p-6 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Burger Bombs</h1>
          <p className="text-sm text-slate-400 mt-1">Welcome, {user ? user.name : 'Guest'}</p>
        </div>
        {user ? (
          <div className="flex gap-2">
            <button onClick={() => navigate('/profile')} className="text-sm bg-slate-800 px-4 py-2 rounded-lg font-bold hover:bg-slate-700 transition">My Profile</button>
          </div>
        ) : (
          <button onClick={() => setShowAuth(true)} className="text-sm bg-orange-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-orange-400 transition">Login</button>
        )}
      </header>

      <div className="max-w-md mx-auto p-4 mt-2">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {['All', ...displayCategories].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition ${filterCategory === cat ? 'bg-orange-500 text-black shadow-md' : 'bg-white text-slate-600 border'}`}>{cat}</button>
          ))}
        </div>

        <div className="space-y-6">
          {filteredMenu.map(item => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-lg transition">
              <div className="h-48 overflow-hidden">
                {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full bg-slate-200" />}
              </div>
              <div className="p-4 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-orange-500 uppercase">{item.category}</div>
                  <div className="font-bold text-lg text-slate-900">{item.name}</div>
                  <div className="text-slate-500 font-medium">₱{item.price}</div>
                </div>
                <button disabled={!item.available} onClick={() => addToCart(item)} className="bg-slate-900 text-white px-5 py-2 rounded-xl font-bold disabled:opacity-50 hover:bg-slate-800 transition">
                  {item.available ? 'Add' : 'Sold Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 p-4 shadow-2xl z-40 rounded-t-3xl">
          <div className="max-w-md mx-auto">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['GCash', 'Maya', 'Cash'].map(method => (
                <button key={method} onClick={() => setPaymentMethod(method)} className={`py-2 rounded-lg font-bold text-sm border transition ${paymentMethod === method ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-white border-slate-200 text-slate-500'}`}>{method}</button>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <div><div className="font-bold text-xl text-slate-900">₱{total}</div><div className="text-sm text-slate-500">{cart.reduce((s,c) => s + c.qty, 0)} items</div></div>
              <button onClick={initiateCheckout} className="bg-orange-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-orange-400 transition shadow-lg">{user ? 'Checkout' : 'Login to Checkout'}</button>
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={(u, t) => { setUser(u); localStorage.setItem('burger_user', JSON.stringify(u)); localStorage.setItem('burger_token', t); setShowAuth(false); }} />}
      {showAddressPicker && <AddressPicker onClose={() => setShowAddressPicker(false)} onConfirm={handleAddressConfirm} />}
    </div>
  );
}