// frontend/src/components/CustomerStore.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import { API_BASE, safeFetch } from '../config/api';
import { ShoppingCart, Plus, Minus, X, MapPin, CreditCard, Wallet, Utensils, Loader2, LogIn, User } from 'lucide-react';
import AddressPicker from './AddressPicker';
import AuthModal from './AuthModal';

export default function CustomerStore() {
  const navigate = useNavigate();

  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // cart | address | review
  const [settings, setSettings] = useState(null);

  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  const [deliveryAddress, setDeliveryAddress] = useState(null); // { text, lat, lng }
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ─── bootstrap ─────────────────────────────────────────────
  useEffect(() => {
    startSyncWorker();

    // Try cache first (offline-friendly), then refresh
    db.menuItems.toArray().then(setMenu);

    safeFetch(`${API_BASE}/api/menu`)
      .then((r) => r.json())
      .then((items) => setMenu(Array.isArray(items) ? items : []))
      .catch(console.error);

    safeFetch(`${API_BASE}/api/categories`)
      .then((r) => r.json())
      .then((cats) => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => setCategories([]));

    safeFetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then(setSettings)
      .catch(console.error);

    try {
      const raw = localStorage.getItem('burger_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // ─── cart ops ──────────────────────────────────────────────
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (existing)
        return prev.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty: x.qty + delta } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const itemCount = cart.reduce((s, c) => s + c.qty, 0);

  // ─── checkout ──────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!deliveryAddress) {
      setError('Please choose a delivery address.');
      return;
    }
    if (paymentMethod === 'GCash' && !paymentReference.trim()) {
      setError('Please enter your GCash reference number.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { mutationId } = await createOrder({
        items: cart,
        total,
        customerId: user.id,
        customerName: user.name,
        channel: 'ONLINE',
        orderType: 'ONLINE',
        paymentMethod,
        paymentReference: paymentReference.trim() || null,
        deliveryAddress: deliveryAddress.text,
        deliveryLat: deliveryAddress.lat,
        deliveryLng: deliveryAddress.lng,
      });

      // FIX: navigate with the UUID so /track receives it immediately (no server round-trip needed)
      navigate(`/track/${mutationId}`);
    } catch (err) {
      console.error('[store] placeOrder failed', err);
      setError(err.message || 'Could not place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── render ────────────────────────────────────────────────
  const visibleMenu =
    activeCategory === 'All'
      ? menu.filter((m) => m.available)
      : menu.filter((m) => m.available && m.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Header */}
      <header className="bg-surface border-b border-border p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shrink-0 overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Utensils size={20} />
              )}
            </div>
            <h1 className="text-lg md:text-2xl font-black truncate">
              {settings?.restaurant_name || 'Burger Bombs'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm font-bold">
                <User size={16} />
                <span className="hidden sm:inline">{user.name}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm"
              >
                <LogIn size={16} /> Sign In
              </button>
            )}
            <button
              onClick={() => {
                setCheckoutStep('cart');
                setIsCartOpen(true);
              }}
              className="relative p-3 bg-primary text-white rounded-lg shadow-sm"
            >
              <ShoppingCart size={18} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Categories */}
      <div className="max-w-6xl mx-auto px-4 pt-4 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {['All', ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold border transition ${
                activeCategory === cat
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-muted border-border hover:border-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu grid */}
      <main className="max-w-6xl mx-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {visibleMenu.map((item) => (
          <button
            key={item.id}
            onClick={() => addToCart(item)}
            className="bg-surface border border-border rounded-xl overflow-hidden text-left shadow-sm hover:shadow-lg hover:border-primary transition flex flex-col group"
          >
            <div className="aspect-square bg-background overflow-hidden">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Utensils size={32} className="text-gray-300" />
                </div>
              )}
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <h3 className="font-bold text-text truncate">{item.name}</h3>
              <div className="flex justify-between items-center mt-2">
                <span className="font-black text-primary">₱{item.price}</span>
                <div className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                  <Plus size={14} />
                </div>
              </div>
            </div>
          </button>
        ))}
        {visibleMenu.length === 0 && (
          <p className="col-span-full text-center py-12 text-text-muted font-bold">
            No items available.
          </p>
        )}
      </main>

      {/* Cart / Checkout drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />
          <aside className="relative w-full max-w-md h-full bg-surface shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background">
              <h2 className="text-xl font-black">
                {checkoutStep === 'cart'
                  ? 'Your Cart'
                  : checkoutStep === 'address'
                  ? 'Delivery Address'
                  : 'Review Order'}
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            {error && (
              <div className="bg-danger/10 text-danger border-b border-danger/20 p-3 text-sm font-bold">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {checkoutStep === 'cart' && cart.length === 0 && (
                <p className="text-center text-text-muted font-bold py-12">Your cart is empty</p>
              )}
              {checkoutStep === 'cart' &&
                cart.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center p-3 bg-background rounded-xl border border-border"
                  >
                    <div className="min-w-0 pr-2 flex-1">
                      <p className="font-bold truncate">{c.name}</p>
                      <p className="text-sm text-primary font-black">₱{c.price}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateQty(c.id, -1)}
                        className="w-8 h-8 rounded-md bg-surface border border-border flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-bold">{c.qty}</span>
                      <button
                        onClick={() => updateQty(c.id, 1)}
                        className="w-8 h-8 rounded-md bg-surface border border-border flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}

              {checkoutStep === 'address' && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowAddressPicker(true)}
                    className="w-full p-4 bg-background border-2 border-dashed border-border rounded-xl hover:border-primary transition text-left flex items-start gap-3"
                  >
                    <MapPin size={20} className="text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-text">
                        {deliveryAddress ? 'Change Address' : 'Pin Delivery Address'}
                      </p>
                      {deliveryAddress ? (
                        <p className="text-sm text-text-muted mt-1">{deliveryAddress.text}</p>
                      ) : (
                        <p className="text-sm text-text-muted mt-1">
                          Tap to open map and pin your location
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="bg-background border border-border rounded-xl p-4 space-y-3">
                    <p className="font-bold text-text text-sm">Payment Method</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentMethod('Cash')}
                        className={`p-3 rounded-lg border-2 flex items-center gap-2 font-bold text-sm transition ${
                          paymentMethod === 'Cash'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-border'
                        }`}
                      >
                        <Wallet size={16} /> Cash
                      </button>
                      <button
                        onClick={() => setPaymentMethod('GCash')}
                        className={`p-3 rounded-lg border-2 flex items-center gap-2 font-bold text-sm transition ${
                          paymentMethod === 'GCash'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-border'
                        }`}
                      >
                        <CreditCard size={16} /> GCash
                      </button>
                    </div>

                    {paymentMethod === 'GCash' && (
                      <div>
                        <label className="text-xs font-bold text-text-muted uppercase">
                          GCash Reference Number
                        </label>
                        <input
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="e.g. 1234567890"
                          className="w-full mt-1 border border-border p-3 rounded-lg bg-surface text-text outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="text-xs text-text-muted mt-1">
                          The cashier will verify this before the kitchen starts cooking.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {checkoutStep === 'review' && (
                <div className="space-y-3">
                  <div className="bg-background border border-border rounded-xl p-4">
                    <p className="text-xs font-bold text-text-muted uppercase mb-1">Deliver to</p>
                    <p className="font-bold text-text text-sm">
                      {deliveryAddress?.text || '—'}
                    </p>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4">
                    <p className="text-xs font-bold text-text-muted uppercase mb-2">
                      Items ({itemCount})
                    </p>
                    {cart.map((c) => (
                      <div key={c.id} className="flex justify-between text-sm py-1">
                        <span>
                          {c.qty}× {c.name}
                        </span>
                        <span className="font-bold">₱{c.price * c.qty}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-text-muted uppercase">Payment</p>
                      <p className="font-bold text-text">{paymentMethod}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-text-muted uppercase">Total</p>
                      <p className="text-2xl font-black text-primary">₱{total}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-border bg-background space-y-2">
              {checkoutStep === 'cart' && (
                <button
                  disabled={cart.length === 0}
                  onClick={() => setCheckoutStep('address')}
                  className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-md disabled:opacity-50"
                >
                  Continue
                </button>
              )}
              {checkoutStep === 'address' && (
                <>
                  <button
                    onClick={() => setCheckoutStep('cart')}
                    className="w-full bg-surface border border-border text-text font-bold py-3 rounded-xl"
                  >
                    Back to Cart
                  </button>
                  <button
                    disabled={!deliveryAddress}
                    onClick={() => {
                      setError(null);
                      setCheckoutStep('review');
                    }}
                    className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-md disabled:opacity-50"
                  >
                    Review Order
                  </button>
                </>
              )}
              {checkoutStep === 'review' && (
                <>
                  <button
                    onClick={() => setCheckoutStep('address')}
                    className="w-full bg-surface border border-border text-text font-bold py-3 rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handlePlaceOrder}
                    className="w-full bg-success text-white font-black py-4 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Placing…
                      </>
                    ) : (
                      `Place Order · ₱${total}`
                    )}
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Address picker modal */}
      {showAddressPicker && (
        <AddressPicker
          enableSearch
          title="Pin Your Delivery Address"
          onConfirm={(text, lat, lng) => {
            setDeliveryAddress({ text, lat, lng });
            setShowAddressPicker(false);
          }}
          onClose={() => setShowAddressPicker(false)}
        />
      )}

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLogin={(u, token) => {
            setUser(u);
            localStorage.setItem('burger_user', JSON.stringify(u));
            localStorage.setItem('burger_token', token);
            setShowAuth(false);
          }}
        />
      )}
    </div>
  );
}