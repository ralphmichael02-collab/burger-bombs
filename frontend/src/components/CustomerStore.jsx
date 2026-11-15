// frontend/src/components/CustomerStore.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import AddressPicker from './AddressPicker';
import { 
  Truck, Eye, X, CheckCircle, CreditCard, Smartphone, Banknote, 
  ShoppingBag, Utensils, ChevronRight, Plus, Search
} from 'lucide-react';

const DEFAULT_CATS = ['Burgers', 'Combos', 'Sides', 'Drinks', 'Desserts'];

export default function CustomerStore() {
  const navigate = useNavigate();

  // ===== STATE =====
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [checkoutStatus, setCheckoutStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [viewingIngredients, setViewingIngredients] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // ===== FILTERING =====
  const filteredMenu = menu.filter(item => {
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATS;

  // ===== PAYMENT MODAL =====
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

  // ===== MAIN STORE UI (Overhauled) =====
  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-48 font-['Source_Sans_Pro',sans-serif]">
      {/* STICKY HEADER with SEARCH */}
      <header className="bg-white/90 backdrop-blur-md p-4 shadow-sm sticky top-0 z-30 border-b border-[#E5E7EB]">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#2B4FB9] rounded-lg flex items-center justify-center text-white">
                <Utensils size={18} />
              </div>
              <h1 className="text-xl font-bold text-[#1A1C23]">Burger Bombs</h1>
            </div>
            <div>
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
          </div>
          {/* SEARCH BAR */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search for a dish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F7F7F7] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-[#1A1C23] focus:ring-2 focus:ring-[#2B4FB9] outline-none transition"
            />
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        {/* STICKY CATEGORY NAVIGATION */}
        <div className="sticky top-[120px] z-20 bg-[#FDFBF7]/90 backdrop-blur-sm py-2 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {['All', ...displayCategories].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all shadow-sm border
                  ${filterCategory === cat
                    ? 'bg-[#2B4FB9] text-white border-[#2B4FB9]'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-gray-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* MENU ITEM CARDS (Single Column, Large Images) */}
        <div className="space-y-5 mt-4">
          {filteredMenu.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag size={48} className="mx-auto mb-4 text-[#D1D5DB]" />
              <p className="text-[#6B7280] font-bold text-lg">No items found.</p>
              <p className="text-[#9CA3AF] text-sm mt-1">Try a different category or search term.</p>
            </div>
          ) : filteredMenu.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#F3F4F6] overflow-hidden group"
            >
              {/* LARGE IMAGE with GRADIENT OVERLAY */}
              <div className="h-52 overflow-hidden relative">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  : <div className="w-full h-full bg-[#F7F7F7] flex items-center justify-center text-[#D1D5DB]"><ShoppingBag size={48} /></div>}
                {/* Category Badge */}
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-[#1A1C23] uppercase shadow-sm tracking-wide">
                  {item.category}
                </span>
                {/* Price Tag (Floating) */}
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="text-[#2B4FB9] font-black text-lg">₱{item.price}</span>
                </div>
              </div>

              {/* CARD CONTENT */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-[#1A1C23] leading-tight mb-1">{item.name}</h3>
                  {item.ingredients && item.ingredients.length > 0 && (
                    <button
                      onClick={() => setViewingIngredients(item)}
                      className="text-xs text-[#2B4FB9] font-bold hover:underline flex items-center gap-1"
                    >
                      <Eye size={12} /> View Ingredients
                    </button>
                  )}
                </div>
                <button
                  disabled={!item.available}
                  onClick={() => addToCart(item)}
                  className={`ml-4 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md
                    ${item.available
                      ? 'bg-[#2B4FB9] text-white hover:bg-[#1E3A8A] active:scale-90'
                      : 'bg-[#F3F4F6] text-[#D1D5DB] cursor-not-allowed'}`}
                  aria-label={`Add ${item.name} to cart`}
                >
                  <Plus size={24} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING BOTTOM CART BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white/95 backdrop-blur-lg border-t border-[#E5E7EB] p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-40 rounded-t-3xl">
          <div className="max-w-md mx-auto">
            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2 mb-3">
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
                    className={`py-2 rounded-lg font-bold text-xs border transition flex flex-col items-center justify-center gap-1
                      ${paymentMethod === method.name
                        ? 'bg-[#2B4FB9]/10 border-[#2B4FB9] text-[#2B4FB9]'
                        : 'bg-white border-[#E5E7EB] text-[#6B7280]'}`}
                  >
                    <Icon size={16} /> {method.name}
                  </button>
                );
              })}
            </div>
            {/* Cart Total & Checkout */}
            <div className="flex justify-between items-center">
              <div>
                <div className="font-black text-2xl text-[#1A1C23]">₱{total}</div>
                <div className="text-sm font-medium text-[#6B7280]">
                  {cart.reduce((s, c) => s + c.qty, 0)} items
                </div>
              </div>
              <button
                onClick={initiateCheckout}
                className="bg-[#2B4FB9] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#1E3A8A] transition shadow-md flex items-center gap-2"
              >
                {user ? 'Checkout' : 'Login to Checkout'} <ChevronRight size={18} />
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
              <h3 className="text-2xl font-black text-[#1A1C23]">{viewingIngredients.name}</h3>
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