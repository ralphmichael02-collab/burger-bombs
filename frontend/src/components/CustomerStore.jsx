// frontend/src/components/CustomerStore.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import AddressPicker from './AddressPicker';
import { 
  Truck, Eye, X, CheckCircle, CreditCard, Smartphone, Banknote, 
  ShoppingBag, Utensils, ChevronRight, Plus, Minus, Search, Filter, Star
} from 'lucide-react';

const DEFAULT_CATS = ['Burgers', 'Combos', 'Sides', 'Drinks', 'Desserts'];

export default function CustomerStore() {
  const navigate = useNavigate();
  
  // State
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); // idle, payment, processing, error
  const [errorMsg, setErrorMsg] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [viewingIngredients, setViewingIngredients] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Fetch Data
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

  // Cart Handlers
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === item.id);
      if (existing) return prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      }).filter(item => item.qty > 0);
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Checkout Logic
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

  // Filtering & Calculations
  const filteredMenu = menu.filter(item => {
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const itemCount = cart.reduce((s, c) => s + c.qty, 0);
  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATS;
  const tax = total * 0.12; // Example 12% tax
  const grandTotal = total + tax;

  // Payment Modal
  if (checkoutStatus === 'payment') {
    const addr = window._tempAddress;
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
          <div className="w-20 h-20 bg-[#EA580C] rounded-full flex items-center justify-center mx-auto mb-6">
            <Smartphone size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black mb-2">GCash Payment</h2>
          <p className="text-gray-500 mb-6">Amount: <b>₱{grandTotal.toFixed(2)}</b></p>
          <div className="bg-gray-50 p-4 rounded-xl mb-6">
            <p className="text-xs text-gray-500 mb-1">Reference Number</p>
            <p className="font-mono text-xl font-bold tracking-widest text-[#1A1C23]">
              {Math.random().toString().slice(2, 12)}
            </p>
          </div>
          <button
            onClick={() => processOrder(addr.address, addr.lat, addr.lng, 'GCASH-' + Date.now())}
            className="w-full bg-[#EA580C] text-white font-bold py-4 rounded-xl mb-3 hover:bg-[#C2410C] transition"
          >
            Simulate Successful Payment
          </button>
          <button onClick={() => setCheckoutStatus('idle')} className="text-gray-500 text-sm hover:underline">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Processing Screen
  if (checkoutStatus === 'processing') {
    return (
      <div className="fixed inset-0 bg-[#1A1C23] z-[100] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-40 h-40 border-[6px] border-[#EA580C] border-t-transparent rounded-full animate-spin mb-8 flex items-center justify-center">
          <Truck size={48} className="text-[#EA580C] animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-[#EA580C] animate-pulse">Processing your order...</h2>
      </div>
    );
  }

  // Main Store UI
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-['Source_Sans_Pro',sans-serif]">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md p-4 shadow-sm sticky top-0 z-30 border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[#EA580C] rounded-xl flex items-center justify-center text-white shadow-sm">
              <Utensils size={22} />
            </div>
            <h1 className="text-2xl font-black text-[#1A1C23] hidden md:block">Burger Bombs</h1>
          </div>

          <div className="relative flex-1 max-w-lg">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for a dish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-full pl-12 pr-4 py-2.5 text-sm font-medium text-[#1A1C23] focus:ring-2 focus:ring-[#EA580C] outline-none transition"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
             {user ? (
                <button onClick={() => navigate('/profile')} className="text-sm font-bold text-[#EA580C] bg-[#EA580C]/10 px-4 py-2 rounded-full hidden sm:block">
                  {user.name}
                </button>
              ) : (
                <button onClick={() => setShowAuth(true)} className="text-sm font-bold text-white bg-[#EA580C] px-4 py-2 rounded-full hidden sm:block">
                  Login
                </button>
              )}
              <button onClick={() => setIsMobileCartOpen(true)} className="relative p-2 bg-gray-50 rounded-full text-[#1A1C23] lg:hidden">
                <ShoppingBag size={22} />
                {itemCount > 0 && (
                   <span className="absolute top-0 right-0 bg-[#EA580C] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                     {itemCount}
                   </span>
                )}
              </button>
          </div>
        </div>
      </header>

      {/* Main 3-Panel Layout */}
      <div className="max-w-[1440px] mx-auto px-4 py-6 flex gap-6">
        
        {/* Left Sidebar: Filters */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24">
            <h2 className="font-bold text-lg text-[#1A1C23] mb-4 flex items-center gap-2">
              <Filter size={18} /> Filters
            </h2>
            <div className="space-y-2">
              {['All', ...displayCategories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                    filterCategory === cat 
                      ? 'bg-[#EA580C] text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center: Menu Grid */}
        <main className="flex-1">
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar sticky top-[80px] z-20 bg-[#FDFBF7]/90 backdrop-blur-sm -mx-4 px-4">
            {['All', ...displayCategories].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all border
                  ${filterCategory === cat
                    ? 'bg-[#EA580C] text-white border-[#EA580C]'
                    : 'bg-white text-gray-600 border-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredMenu.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
              <ShoppingBag size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-bold text-lg">No items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredMenu.map(item => (
                <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group flex flex-col hover:shadow-lg transition-all">
                  <div className="h-48 overflow-hidden relative">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      : <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300"><ShoppingBag size={48} /></div>}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-[#1A1C23] uppercase shadow-sm tracking-wide">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg text-[#1A1C23] leading-tight">{item.name}</h3>
                      <div className="flex items-center gap-1 text-xs font-bold text-[#EA580C]">
                        <Star size={12} fill="currentColor" /> 4.8
                      </div>
                    </div>
                    
                    {item.ingredients && item.ingredients.length > 0 && (
                      <button onClick={() => setViewingIngredients(item)} className="text-xs text-[#EA580C] font-bold hover:underline flex items-center gap-1 mb-3 w-fit">
                        <Eye size={12} /> View Ingredients
                      </button>
                    )}

                    <div className="mt-auto flex justify-between items-center pt-4">
                      <span className="text-[#EA580C] font-black text-xl">₱{item.price}</span>
                      <button
                        disabled={!item.available}
                        onClick={() => addToCart(item)}
                        className={`px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 ${
                          item.available
                            ? 'bg-gray-50 text-[#1A1C23] hover:bg-[#EA580C] hover:text-white border border-gray-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        <Plus size={16} /> {item.available ? 'Add' : 'Sold Out'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Sidebar: Order Summary (Desktop) */}
        <aside className="hidden lg:block w-96 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm sticky top-24 flex flex-col max-h-[calc(100vh-120px)]">
            <div className="p-5 border-b border-gray-200">
              <h2 className="font-bold text-xl text-[#1A1C23]">Order Summary</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-50" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-[#1A1C23] leading-tight text-sm">{item.name}</p>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                      </div>
                      <p className="text-sm text-[#EA580C] font-bold mt-1">₱{item.price}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center text-[#1A1C23] hover:bg-gray-200"><Minus size={14} /></button>
                        <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center text-[#1A1C23] hover:bg-gray-200"><Plus size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-gray-500 font-medium"><span>Subtotal</span><span>₱{total.toFixed(2)}</span></div>
                  <div className="flex justify-between text-lg font-black text-[#1A1C23] pt-2 border-t border-gray-200"><span>Total</span><span>₱{grandTotal.toFixed(2)}</span></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { name: 'GCash', icon: Smartphone },
                    { name: 'Maya', icon: CreditCard },
                    { name: 'Cash', icon: Banknote }
                  ].map(method => {
                    const Icon = method.icon;
                    return (
                      <button key={method.name} onClick={() => setPaymentMethod(method.name)}
                        className={`py-2 rounded-lg font-bold text-xs border transition flex flex-col items-center justify-center gap-1
                          ${paymentMethod === method.name ? 'bg-[#EA580C]/10 border-[#EA580C] text-[#EA580C]' : 'bg-white border-gray-200 text-gray-500'}`}>
                        <Icon size={16} /> {method.name}
                      </button>
                    );
                  })}
                </div>
                <button onClick={initiateCheckout} className="w-full bg-[#EA580C] text-white font-bold py-3.5 rounded-xl hover:bg-[#C2410C] transition shadow-md flex items-center justify-center gap-2">
                  {user ? 'Proceed to Checkout' : 'Login to Checkout'} <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Cart Floating Bar */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-40">
          <button onClick={() => setIsMobileCartOpen(true)} className="w-full bg-[#EA580C] text-white font-bold py-3.5 rounded-xl flex justify-between items-center px-6 shadow-md">
            <span className="flex items-center gap-2"><ShoppingBag size={18} /> {itemCount} items</span>
            <span>₱{grandTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Modal */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center lg:hidden">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-bold text-xl text-[#1A1C23]">Your Order</h2>
              <button onClick={() => setIsMobileCartOpen(false)} className="p-2 bg-gray-50 rounded-full text-[#1A1C23]"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-50" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-[#1A1C23] leading-tight">{item.name}</p>
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                    </div>
                    <p className="text-sm text-[#EA580C] font-bold mt-1">₱{item.price}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center text-[#1A1C23]"><Minus size={14} /></button>
                      <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center text-[#1A1C23]"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-3xl">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-500 font-medium"><span>Subtotal</span><span>₱{total.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-black text-[#1A1C23] pt-2 border-t border-gray-200"><span>Total</span><span>₱{grandTotal.toFixed(2)}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { name: 'GCash', icon: Smartphone },
                  { name: 'Maya', icon: CreditCard },
                  { name: 'Cash', icon: Banknote }
                ].map(method => {
                  const Icon = method.icon;
                  return (
                    <button key={method.name} onClick={() => setPaymentMethod(method.name)}
                      className={`py-2 rounded-lg font-bold text-xs border transition flex flex-col items-center justify-center gap-1
                        ${paymentMethod === method.name ? 'bg-[#EA580C]/10 border-[#EA580C] text-[#EA580C]' : 'bg-white border-gray-200 text-gray-500'}`}>
                      <Icon size={16} /> {method.name}
                    </button>
                  );
                })}
              </div>
              <button onClick={initiateCheckout} className="w-full bg-[#EA580C] text-white font-bold py-3.5 rounded-xl hover:bg-[#C2410C] transition shadow-md flex items-center justify-center gap-2">
                {user ? 'Proceed to Checkout' : 'Login to Checkout'} <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
        <AddressPicker onClose={() => setShowAddressPicker(false)} onConfirm={handleAddressConfirm} />
      )}

      {/* Ingredients Modal */}
      {viewingIngredients && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-[#1A1C23]">{viewingIngredients.name}</h3>
              <button onClick={() => setViewingIngredients(null)}><X size={20} className="text-gray-400 hover:text-gray-800" /></button>
            </div>
            <ul className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              {viewingIngredients.ingredients.map((ing, idx) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{ing.name}</span>
                  <span className="font-bold text-gray-900">{ing.quantity} {ing.unit}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setViewingIngredients(null)} className="w-full py-3 bg-[#1A1C23] text-white font-bold rounded-xl hover:bg-black">Close</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}