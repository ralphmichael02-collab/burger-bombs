import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Utensils, AlertTriangle } from 'lucide-react';

const DEFAULT_CATS = ['Burgers', 'Combos', 'Sides', 'Drinks', 'Desserts'];

export default function MenuList({ onAdd }) {
  const [filterCategory, setFilterCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const items = useLiveQuery(() => db.menuItems.toArray(), []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/categories`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setCategories(data); })
      .catch(err => console.error(err));
  }, []);

  if (!items) return <div className="p-10 text-center text-gray-500 font-bold">Loading menu…</div>;
  if (items.length === 0) return <div className="p-10 text-center text-red-500 font-bold">No menu items. Is the backend running?</div>;

  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATS;
  const filteredItems = items.filter(item => filterCategory === 'All' || item.category === filterCategory);

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-[#FDFBF7]/90 backdrop-blur-md z-20 px-6 py-4 border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['All', ...displayCategories].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} 
              className={`px-5 py-2.5 text-sm font-bold rounded-full whitespace-nowrap transition-all shadow-sm
                ${filterCategory === cat ? 'bg-[#EA580C] text-white shadow-md transform scale-105' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <button key={item.id} onClick={() => item.available && onAdd(item)} disabled={!item.available}
            className={`relative rounded-2xl text-left shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col h-64
              ${item.available ? 'bg-white cursor-pointer hover:-translate-y-1 border border-gray-100' : 'bg-gray-100 cursor-not-allowed opacity-80 border border-gray-200'}`}>
            <div className="h-32 w-full shrink-0 relative">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300"><Utensils size={32} /></div>
              )}
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-black text-[#1A1C23] uppercase tracking-wide shadow-sm">{item.category}</div>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div className="font-bold text-[#1A1C23] leading-tight line-clamp-2">{item.name}</div>
              <div className="text-lg font-black text-[#EA580C]">₱{item.price}</div>
            </div>
            {!item.available && (
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
                <span className="bg-[#EA001E] text-white font-black text-sm px-4 py-1.5 rounded-lg transform -rotate-12 shadow-xl border-2 border-white flex items-center gap-2"><AlertTriangle size={14} /> SOLD OUT</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}