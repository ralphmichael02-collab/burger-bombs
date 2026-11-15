// frontend/src/components/MenuList.jsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Utensils, Plus } from 'lucide-react';

export default function MenuList({ onAdd }) {
  const items = useLiveQuery(() => db.menuItems.toArray(), []);

  if (!items) return <p className="text-text-muted font-bold p-4">Loading menu…</p>;

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-text-muted">
        <Utensils size={48} className="mx-auto mb-4 opacity-50" />
        <p className="font-bold text-lg">No menu items found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => item.available && onAdd(item)}
          disabled={!item.available}
          className={`relative flex flex-col text-left rounded-xl overflow-hidden border transition-all
            ${item.available
              ? 'bg-surface border-border shadow-sm hover:shadow-md hover:border-primary cursor-pointer group'
              : 'bg-background border-border opacity-60 cursor-not-allowed'}`}
        >
          <div className="h-28 md:h-32 w-full bg-background relative overflow-hidden shrink-0">
             {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
             ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-background">
                  <Utensils size={24} />
                </div>
             )}
          </div>
          <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="font-bold text-text text-sm md:text-base leading-tight line-clamp-1">{item.name}</div>
              <div className="text-[11px] md:text-xs text-text-muted mt-0.5 line-clamp-2 min-h-[2rem]">
                {item.description || item.category || 'Menu Item'}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-black text-primary">₱{item.price}</span>
              {item.available ? (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition">
                  <Plus size={14} />
                </div>
              ) : (
                <span className="text-[10px] font-bold text-danger uppercase tracking-wider bg-danger/10 px-2 py-1 rounded">Out</span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}