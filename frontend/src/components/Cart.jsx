import { ShoppingCart, X, Minus, Plus } from 'lucide-react';

export default function Cart({ cart, setCart, onSubmit, submitting }) {
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-xl font-black text-[#1A1C23]">Current Check</h2>
        <span className="bg-[#EA580C]/10 text-[#EA580C] font-bold px-3 py-1 rounded-full text-sm">
          {cart.reduce((s, c) => s + c.qty, 0)} Items
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <ShoppingCart size={64} className="mb-4 opacity-50" />
            <p className="font-bold">Tap items to add</p>
          </div>
        ) : (
          cart.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div className="flex-1">
                <div className="font-bold text-[#1A1C23]">{c.name}</div>
                <div className="text-sm text-gray-500">₱{c.price} × {c.qty}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button onClick={() => setCart(cart.map(x => x.id === c.id ? { ...x, qty: x.qty - 1 } : x).filter(x => x.qty > 0))} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:bg-gray-50"><Minus size={14} /></button>
                  <span className="w-8 text-center font-bold text-[#1A1C23]">{c.qty}</span>
                  <button onClick={() => setCart(cart.map(x => x.id === c.id ? { ...x, qty: x.qty + 1 } : x))} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:bg-gray-50"><Plus size={14} /></button>
                </div>
                <button onClick={() => setCart(cart.filter(x => x.id !== c.id))} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><X size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-end mb-6">
          <span className="text-gray-500 font-bold text-lg">Total</span>
          <span className="text-4xl font-black text-[#1A1C23]">₱{total}</span>
        </div>
        <button disabled={cart.length === 0 || submitting} onClick={onSubmit}
          className="w-full bg-[#EA580C] text-white font-black text-xl py-4 rounded-2xl shadow-lg hover:bg-[#C2410C] transition disabled:opacity-50">
          {submitting ? 'Processing…' : `Charge ₱${total}`}
        </button>
      </div>
    </div>
  );
}