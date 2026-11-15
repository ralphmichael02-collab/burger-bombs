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
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('burger_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    // 👇 RELATIVE PATHS
    fetch('/api/menu')
      .then(r => r.json())
      .then(setMenu)
      .catch(err => console.error('Menu fetch failed', err));
      
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setCategories(d); })
      .catch(err => console.error('Categories fetch failed', err));
  }, []);

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
      // 👇 RELATIVE PATH
      const res = await fetch('/api/sync', {
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

  const filteredMenu = menu.filter(item => {
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const itemCount = cart.reduce((s, c) => s + c.qty, 0);
  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATS;
  const tax = total * 0.12; 
  const grandTotal = total + tax;

  if (checkoutStatus === 'payment') {
    const addr = window._tempAddress;
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-surface rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl border border-border">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
            <Smartphone size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black mb-2 text-text">GCash Payment</h2>
          <p className="text-text-muted mb-6">Amount: <b>₱{grandTotal.toFixed(2)}</b></p>
          <div className="bg-background p-4 rounded-xl mb-6 border border-border">
            <p className="text-xs text-text-muted mb-1 font-bold">Reference Number</p>
            <p className="font-mono text-xl font-bold tracking-widest text-text">
              {Math.random().toString().slice(2, 12)}
            </p>
          </div>
          <button
            onClick={() => processOrder(addr.address, addr.lat, addr.lng, 'GCASH-' + Date.now())}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl mb-3 hover:bg-primary-hover transition shadow-lg"
          >
            Simulate Successful Payment
          </button>
          <button onClick={() => setCheckoutStatus('idle')} className="text-text-muted text-sm font-bold hover:underline">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (checkoutStatus === 'processing') {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-40 h-40 border-[6px] border-primary border-t-transparent rounded-full animate-spin mb-8 flex items-center justify-center">
          <Truck size={48} className="text-primary animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-primary animate-pulse">Processing your order...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-['Source_Sans_Pro',sans-serif]">
      {/* Header */}
      <header className="bg-surface/90 backdrop-blur-md p-4 shadow-sm sticky top-0 z-30 border-b border-border">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm">
              <Utensils size={22} />
            </div>
            <h1 className="text-2xl font-black text-text hidden md:block">Burger Bombs</h1>
          </div>

          <div className="relative flex-1 max-w-lg">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search for a dish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-full pl-12 pr-4 py-2.5 text-sm font-medium text-text focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
             {user ? (
                <button onClick={() => navigate('/profile')} className="text-sm font-bold text-primary bg-primary/10 px-4 py-2 rounded-full hidden sm:block">
                  {user.name}
                </button>
              ) : (
                <button onClick={() => setShowAuth(true)} className="text-sm font-bold text-white bg-primary px-4 py-2 rounded-full hidden sm:block shadow-md hover:bg-primary-hover transition">
                  Login
                </button>
              )}
              <button onClick={() => setIsMobileCartOpen(true)} className="relative p-2 bg-background border border-border rounded-full text-text lg:hidden">
                <ShoppingBag size={22} />
                {itemCount > 0 && (
                   <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface">
                     {itemCount}
                   </span>
                )}
              </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-[1440px] mx-auto px-4 py-6 flex gap-6">
        
        {/* Left Sidebar: Filters */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="bg-surface rounded-2xl border border-border p-5 sticky top-24 shadow-sm">
            <h2 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <Filter size={18} /> Filters
            </h2>
            <div className="space-y-2">
              {['All', ...displayCategories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                    filterCategory === cat 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-text-muted hover:bg-background'
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
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar sticky top-[80px] z-20 bg-background/90 backdrop-blur-sm -mx-4 px-4">
            {['All', ...displayCategories].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all border
                  ${filterCategory === cat
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-surface text-text-muted border-border'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredMenu.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-2xl border border-border">
              <ShoppingBag size={48} className="mx-auto mb-4 text-text-muted opacity-50" />
              <p className="text-text-muted font-bold text-lg">No items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredMenu.map(item => (
                <div key={item.id} className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden group flex flex-col hover:shadow-lg transition-all">
                  <div className="h-48 overflow-hidden relative bg-background">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center text-text-muted"><ShoppingBag size={48} /></div>}
                    <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-text uppercase shadow-sm tracking-wide">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-bold text-lg text-text leading-tight truncate">{item.name}</h3>
                      <div className="flex items-center gap-1 text-xs font-bold text-primary">
                        <Star size={12} fill="currentColor" /> 4.8
                      </div>
                    </div>
                    
                    {item.ingredients && item.ingredients.length > 0 && (
                      <button onClick={() => setViewingIngredients(item)} className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mb-3 w-fit">
                        <Eye size={12} /> View Ingredients
                      </button>
                    )}

                    <div className="mt-auto flex justify-between items-center pt-4">
                      <span className="text-primary font-black text-xl">₱{item.price}</span>
                      <button
                        disabled={!item.available}
                        onClick={() => addToCart(item)}
                        className={`px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 ${
                          item.available
                            ? 'bg-primary text-white hover:bg-primary-hover'
                            : 'bg-background text-text-muted cursor-not-allowed'
                        }`}
                      >
                        <Plus size={16} /> {item.available ? 'Add' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Sidebar: Desktop Cart */}
        <aside className="hidden lg:flex flex-col w-96 bg-surface border-l border-border shadow-xl rounded-2xl h-[calc(100vh-120px)] sticky top-24 shrink-0 overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center bg-background shrink-0">
            <h2 className="font-black text-lg text-text">Your Order</h2>
            <span className="bg-surface border border-border text-text-muted px-2 py-1 rounded text-xs font-bold">{itemCount} Items</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-60">
                <ShoppingBag size={48} className="mb-4" />
                <p className="font-bold">Your cart is empty</p>
              </div>
            ) : cart.map(c => (
              <div key={c.id} className="flex justify-between items-center bg-background p-3 rounded-xl border border-border">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-bold text-text truncate">{c.name}</p>
                  <p className="text-primary font-bold text-sm">₱{c.price}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2 bg-surface rounded-lg p-1 border border-border">
                    <button onClick={() => updateQuantity(c.id, -1)} className="w-7 h-7 flex items-center justify-center bg-background rounded text-text hover:bg-gray-100"><Minus size={14} /></button>
                    <span className="font-bold w-4 text-center text-text">{c.qty}</span>
                    <button onClick={() => updateQuantity(c.id, 1)} className="w-7 h-7 flex items-center justify-center bg-background rounded text-text hover:bg-gray-100"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeFromCart(c.id)} className="text-danger p-1 hover:bg-danger/10 rounded"><X size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border bg-background shrink-0 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-text-muted"><span>Subtotal</span><span>₱{total}</span></div>
              <div className="flex justify-between text-text-muted"><span>Tax (12%)</span><span>₱{tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-lg font-black text-text border-t border-border pt-2 mt-2"><span>Total</span><span>₱{grandTotal.toFixed(2)}</span></div>
            </div>
            <button disabled={cart.length === 0} onClick={initiateCheckout} className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-lg hover:bg-primary-hover disabled:opacity-50 transition">
              Checkout
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileCartOpen(false)} />
          <div className="relative w-full max-w-sm bg-surface h-full flex flex-col shadow-2xl animate-slide-in">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background">
              <h2 className="font-black text-lg text-text">Your Order</h2>
              <button onClick={() => setIsMobileCartOpen(false)} className="p-2 rounded-lg hover:bg-gray-200 text-text-muted">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-text-muted py-10">Your cart is empty</p>
              ) : cart.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-background p-3 rounded-xl border border-border">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-text truncate">{c.name}</p>
                    <p className="text-primary font-bold text-sm">₱{c.price}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-surface rounded-lg p-1 border border-border">
                      <button onClick={() => updateQuantity(c.id, -1)} className="w-7 h-7 flex items-center justify-center bg-background rounded text-text"><Minus size={14} /></button>
                      <span className="font-bold w-4 text-center text-text">{c.qty}</span>
                      <button onClick={() => updateQuantity(c.id, 1)} className="w-7 h-7 flex items-center justify-center bg-background rounded text-text"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(c.id)} className="text-danger p-1"><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border bg-background shrink-0 space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-text-muted"><span>Subtotal</span><span>₱{total}</span></div>
                <div className="flex justify-between text-text-muted"><span>Tax (12%)</span><span>₱{tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-black text-text border-t border-border pt-2 mt-2"><span>Total</span><span>₱{grandTotal.toFixed(2)}</span></div>
              </div>
              <button disabled={cart.length === 0} onClick={initiateCheckout} className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-lg hover:bg-primary-hover disabled:opacity-50 transition">
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={(user, token) => { setUser(user); setShowAuth(false); }} />}
      {showAddressPicker && <AddressPicker onConfirm={handleAddressConfirm} onClose={() => setShowAddressPicker(false)} />}
      
      {/* Ingredients Modal */}
      {viewingIngredients && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text">Ingredients</h2>
              <button onClick={() => setViewingIngredients(null)} className="text-text-muted hover:text-text p-1"><X size={20} /></button>
            </div>
            <p className="font-bold text-lg text-text mb-4">{viewingIngredients.name}</p>
            <ul className="space-y-2">
              {viewingIngredients.ingredients?.map((ing, i) => (
                <li key={i} className="flex items-center gap-3 text-text-muted bg-background p-3 rounded-lg border border-border">
                  <CheckCircle size={16} className="text-success shrink-0" />
                  <span className="font-medium text-sm">{ing}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}