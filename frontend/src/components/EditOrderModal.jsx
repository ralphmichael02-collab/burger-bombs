// frontend/src/components/EditOrderModal.jsx
import { useState, useEffect } from 'react';
import { X, Plus, Minus, CheckCircle, AlertTriangle } from 'lucide-react';
import { db } from '../db';

export default function EditOrderModal({ order, onSave, onClose }) {
  const [items, setItems] = useState(order.items.map(i => ({ ...i })));
  const [menu, setMenu] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    db.menuItems.toArray().then(setMenu);
  }, []);

  const total = items.reduce((s, c) => s + c.price * c.qty, 0);

  const updateQty = (id, delta) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x).filter(x => x.qty > 0));
  };

  const addItem = (menuItem) => {
    setItems(prev => {
      const existing = prev.find(x => x.id === menuItem.id);
      if (existing) return prev.map(x => x.id === menuItem.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { id: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1 }];
    });
  };

  const handleSave = async () => {
    if (items.length === 0) {
      setError('Order must have at least one item. Use "Void Order" to cancel instead.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 👇 Relative path (Vite proxy handles this)
      const res = await fetch(`/api/orders/${order.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update order');
      }
      onSave({ ...order, items, total });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 flex justify-between items-center border-b border-border bg-background shrink-0">
          <div>
            <h2 className="font-bold text-text">Edit Order #{order.id}</h2>
            <p className="text-xs text-text-muted font-mono">Ref: {order.sync_id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-text-muted transition"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && <p className="text-center text-text-muted py-8 font-bold">No items in order</p>}
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-background p-3 rounded-lg border border-border">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-bold text-text truncate">{item.name}</p>
                <p className="text-primary font-bold text-sm">₱{item.price} × {item.qty} = ₱{(item.price * item.qty).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => updateQty(item.id, -1)} className="w-9 h-9 flex items-center justify-center bg-surface rounded-lg border border-border text-text hover:bg-gray-100"><Minus size={16} /></button>
                <span className="font-bold text-text w-8 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)} className="w-9 h-9 flex items-center justify-center bg-surface rounded-lg border border-border text-text hover:bg-gray-100"><Plus size={16} /></button>
              </div>
            </div>
          ))}

          <button onClick={() => setShowAddMenu(!showAddMenu)} className="w-full py-3 border-2 border-dashed border-border rounded-lg text-text-muted font-bold hover:bg-background hover:border-primary transition flex items-center justify-center gap-2">
            <Plus size={16} /> Add Item
          </button>

          {showAddMenu && (
            <div className="bg-background border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
              {menu.filter(m => m.available).map(m => (
                <button key={m.id} onClick={() => addItem(m)} className="w-full flex justify-between items-center p-2 rounded hover:bg-surface transition text-left">
                  <span className="text-sm font-bold text-text truncate">{m.name}</span>
                  <span className="text-xs font-bold text-primary shrink-0 ml-2">₱{m.price}</span>
                </button>
              ))}
            </div>
          )}

          {error && <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm font-bold flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
        </div>

        <div className="p-4 border-t border-border bg-background shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-text-muted font-bold">New Total</span>
            <span className="text-2xl font-black text-text">₱{total.toFixed(2)}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-surface border border-border text-text-muted font-bold rounded-xl hover:bg-gray-100 transition">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <><CheckCircle size={16} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}