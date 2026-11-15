// frontend/src/components/CustomerStore.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import AddressPicker from './AddressPicker';
import { 
  Truck, Eye, X, CheckCircle, CreditCard, Smartphone, Banknote, 
  ShoppingBag, Utensils 
} from 'lucide-react';

const DEFAULT_CATS = ['Burgers', 'Combos', 'Sides', 'Drinks', 'Desserts'];

export default function CustomerStore() {
  const navigate = useNavigate();

  // ===== STATE DECLARATIONS (must all be here) =====
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); // idle | payment | processing | error
  const [errorMsg, setErrorMsg] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('GCash');

  const [user, setUser] = useState(null);              // 👈 THIS was likely missing
  const [showAuth, setShowAuth] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [viewingIngredients, setViewingIngredients] = useState(null);

  // ===== DATA FETCH =====
  useEffect(() => {
    const savedUser = localStorage.getItem('burger_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`)
      .then(r => r.json())
      .then(setMenu)
      .catch(err => console.error('Menu fetch failed', err));

    fetch(`${import.meta.env.VITE_API_BASE}/api/categories`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setCategories(d); })
      .catch(err => console.error('Categories fetch failed', err));
  }, []);

  // ===== HANDLERS =====
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
          payload: {
            items: cart,
            total,
            createdAt: new Date().toISOString(),
            orderType: 'ONLINE',
            paymentMethod,
            customerId: user.id,
            deliveryAddress: address,
            deliveryLat: lat,
            deliveryLng: lng,
            paymentReference: paymentRef
          }
        })
      });
      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      setTimeout(() => navigate(`/track/${data.orderId}`), 3000);
    } catch (err) {
      setErrorMsg(err.message);
      setCheckoutStatus('error');
    }
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATS;
  const filteredMenu = menu.filter(item => filterCategory === 'All' || item.category === filterCategory);

  // ===== PAYMENT MODAL SCREEN =====
  if (checkoutStatus === 'payment') {
    const addr = window._tempAddress;
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Smartphone size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black mb-2">GCash Payment</h2>
          <p className="text-slate-500 mb-6">Amount: <b>₱{total}</b></p>
          <div className="bg-slate-100 p-4 rounded-xl mb-6">
            <p className="text-xs text-slate-500 mb-1">Reference Number</p>
            <p className="font-mono text-xl font-bold tracking-widest">
              {Math.random().toString().slice(2, 12)}
            </p>
          </div>
          <button
            onClick={() => processOrder(addr.address, addr.lat, addr.lng, 'GCASH-' + Date.now())}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mb-3 hover:bg-blue-700 transition"
          >
            Simulate Successful Payment
          </button>
          <button onClick={() => setCheckoutStatus('idle')} className="text-slate-500 text-sm hover:underline">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ===== PROCESSING SCREEN =====
  if (checkoutStatus === 'processing') {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-40 h-40 border-[6px] border-orange-500 border-t-transparent rounded-full animate-spin mb-8 flex items-center justify-center">
          <Truck size={48} className="text-orange-500 animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-orange-500 animate-pulse">Processing your order...</h2>
      </div>
    );
  }

  // ===== MAIN STORE UI =====
  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-48 font-['Source_Sans_Pro',sans-serif]">
      <header className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2B4FB9] rounded-lg flex items-center justify-center text-white">
            <Utensils size={18} />
          </div>
          <h1 className="text-xl font-bold text-[#1A1C23]">Burger Bombs</h1>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="text-sm font-bold text-[#2B4FB9] bg-[#2B4FB9]/10 px-3 py-1.5 rounded-lg"
            >
              {user.name}
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-sm font-bold text-white bg-[#2B4FB9] px-4 py-1.5 rounded-lg"
            >
              Login
            </button>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {['All', ...displayCategories].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all shadow-sm border
                ${filterCategory === cat
                  ? 'bg-[#2B4FB9] text-white border-[#2B4FB9]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB]'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredMenu.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden"
            >
              <div className="h-40 overflow-hidden relative">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full bg-[#F7F7F7] flex items-center justify-center text-[#D1D5DB]"><ShoppingBag size={40} /></div>}
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-black text-[#1A1C23] uppercase shadow-sm">
                  {item.category}
                </span>
              </div>
              <div className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-[#1A1C23] leading-tight">{item.name}</h3>
                  <p className="text-[#2B4FB9] font-bold text-lg">₱{item.price}</p>
                  {item.ingredients && item.ingredients.length > 0 && (
                    <button
                      onClick={() => setViewingIngredients(item)}
                      className="text-xs text-[#2B4FB9] font-bold mt-1 hover:underline flex items-center gap-1"
                    >
                      <Eye size={12} /> View Ingredients
                    </button>
                  )}
                </div>
                <button
                  disabled={!item.available}
                  onClick={() => addToCart(item)}
                  className="bg-[#F7F7F7] border border-[#E5E7EB] text-[#1A1C23] px-5 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-[#2B4FB9] hover:text-white transition-colors shadow-sm"
                >
                  {item.available ? 'Add' : 'Sold Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING CHECKOUT BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white border-t border-[#E5E7EB] p-4 shadow-2xl z-40 rounded-t-2xl">
          <div className="max-w-md mx-auto">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { name: 'GCash', icon: Smartphone },
                { name: 'Maya', icon: CreditCard },
                { name: 'Cash', icon: Banknote }
              ].map(method => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.name}
                    onClick={() => setPaymentMethod(method.name)}
                    className={`py-2 rounded-lg font-bold text-sm border transition flex flex-col items-center justify-center gap-1
                      ${paymentMethod === method.name
                        ? 'bg-[#2B4FB9]/10 border-[#2B4FB9] text-[#2B4FB9]'
                        : 'bg-white border-[#E5E7EB] text-[#6B7280]'}`}
                  >
                    <Icon size={16} /> {method.name}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-black text-2xl text-[#1A1C23]">₱{total}</div>
                <div className="text-sm font-medium text-[#6B7280]">
                  {cart.reduce((s, c) => s + c.qty, 0)} items
                </div>
              </div>
              <button
                onClick={initiateCheckout}
                className="bg-[#2B4FB9] text-white font-bold px-8 py-3 rounded-lg hover:bg-[#1E3A8A] transition shadow-md"
              >
                {user ? 'Checkout' : 'Login to Checkout'}
              </button>
            </div>
            {checkoutStatus === 'error' && (
              <div className="text-[#EA001E] text-sm text-center mt-2 font-bold">{errorMsg}</div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLogin={(u, t) => {
            setUser(u);
            localStorage.setItem('burger_user', JSON.stringify(u));
            localStorage.setItem('burger_token', t);
            setShowAuth(false);
          }}
        />
      )}
      {showAddressPicker && (
        <AddressPicker
          onClose={() => setShowAddressPicker(false)}
          onConfirm={handleAddressConfirm}
        />
      )}

      {/* INGREDIENTS MODAL */}
      {viewingIngredients && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black">{viewingIngredients.name}</h3>
              <button onClick={() => setViewingIngredients(null)}>
                <X size={20} className="text-slate-400 hover:text-slate-800" />
              </button>
            </div>
            <ul className="space-y-3 mb-6 bg-[#F7F7F7] p-4 rounded-xl border border-[#E5E7EB]">
              {viewingIngredients.ingredients.map((ing, idx) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{ing.name}</span>
                  <span className="font-bold text-slate-900">{ing.quantity} {ing.unit}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setViewingIngredients(null)}
              className="w-full py-3 bg-[#1A1C23] text-white font-bold rounded-xl hover:bg-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}