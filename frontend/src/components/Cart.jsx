export default function Cart({ cart, setCart, onSubmit, submitting }) {
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900">Current Check</h2>
        <span className="bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-full text-sm">{cart.reduce((s, c) => s + c.qty, 0)} Items</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <span className="text-5xl mb-4">🛒</span><p className="font-bold">Tap items to add</p>
          </div>
        ) : (
          cart.map(c => (
            <div key={c.id} className="bg-white border rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div className="flex-1"><div className="font-bold text-slate-900">{c.name}</div><div className="text-sm text-slate-500">₱{c.price} × {c.qty}</div></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCart(cart.map(x => x.id === c.id ? { ...x, qty: x.qty - 1 } : x).filter(x => x.qty > 0))} className="w-8 h-8 bg-slate-100 rounded-lg font-bold">−</button>
                <span className="w-6 text-center font-bold">{c.qty}</span>
                <button onClick={() => setCart(cart.map(x => x.id === c.id ? { ...x, qty: x.qty + 1 } : x))} className="w-8 h-8 bg-slate-100 rounded-lg font-bold">+</button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-6 bg-slate-50 border-t">
        <div className="flex justify-between items-end mb-6">
          <span className="text-slate-500 font-bold">Total</span>
          <span className="text-4xl font-black text-slate-900">₱{total}</span>
        </div>
        <button disabled={cart.length === 0 || submitting} onClick={onSubmit} className="w-full bg-orange-500 text-white font-black text-xl py-4 rounded-2xl shadow-lg hover:bg-orange-600 transition disabled:opacity-50">
          {submitting ? 'Processing…' : `Charge ₱${total}`}
        </button>
      </div>
    </div>
  );
}