// frontend/src/components/Cart.jsx
import { Minus, Plus, X } from 'lucide-react';

export default function Cart({ cart, setCart, onSubmit, submitting }) {
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="h-full flex flex-col bg-surface text-text">
      <div className="p-4 md:p-6 border-b border-border bg-background flex justify-between items-center shrink-0">
        <h2 className="text-lg md:text-xl font-black text-text">Current Check</h2>
        <span className="bg-surface border border-border text-text-muted font-bold px-3 py-1 rounded-full text-sm">
          {totalItems} Items
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-60">
            <span className="text-5xl mb-4">🛒</span>
            <p className="font-bold">Tap items to add</p>
          </div>
        ) : (
          cart.map((c) => (
            <div key={c.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div className="flex-1 min-w-0 pr-2">
                <div className="font-bold text-text leading-tight truncate">{c.name}</div>
                <div className="text-sm text-text-muted font-medium mt-1">₱{c.price} × {c.qty}</div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <div className="flex items-center bg-background rounded-lg p-1 border border-border">
                  <button
                    className="w-8 h-8 flex items-center justify-center bg-surface rounded-md shadow-sm text-text hover:bg-gray-100 transition"
                    onClick={() =>
                      setCart(cart
                        .map(x => x.id === c.id ? { ...x, qty: x.qty - 1 } : x)
                        .filter(x => x.qty > 0))
                    }
                  ><Minus size={14} /></button>
                  <span className="w-8 text-center font-bold text-text">{c.qty}</span>
                  <button
                    className="w-8 h-8 flex items-center justify-center bg-surface rounded-md shadow-sm text-text hover:bg-gray-100 transition"
                    onClick={() =>
                      setCart(cart.map(x => x.id === c.id ? { ...x, qty: x.qty + 1 } : x))
                    }
                  ><Plus size={14} /></button>
                </div>
                <button 
                  onClick={() => setCart(cart.filter(x => x.id !== c.id))}
                  className="w-8 h-8 flex items-center justify-center text-danger hover:bg-danger/10 rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 md:p-6 bg-background border-t border-border shrink-0">
        <div className="flex justify-between items-end mb-4 md:mb-6">
          <span className="text-text-muted font-bold text-base md:text-lg">Total</span>
          <span className="text-3xl md:text-4xl font-black text-text">₱{total}</span>
        </div>
        <button
          disabled={cart.length === 0 || submitting}
          onClick={onSubmit}
          className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-300 disabled:text-gray-500 text-white font-black text-lg md:text-xl py-3 md:py-4 rounded-2xl shadow-lg transition-all transform active:scale-95"
        >
          {submitting ? 'Processing…' : 'Charge ₱' + total}
        </button>
      </div>
    </div>
  );
}