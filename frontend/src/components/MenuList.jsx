import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function MenuList({ onAdd }) {
  const [filterCategory, setFilterCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const items = useLiveQuery(() => db.menuItems.toArray(), []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/categories`).then(r => r.json()).then(setCategories);
  }, []);

  const filteredItems = items?.filter(item => filterCategory === 'All' || item.category === filterCategory) || [];

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-20 px-6 py-4 border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['All', ...categories].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} 
              className={`px-5 py-2.5 text-sm font-bold rounded-full transition-all ${filterCategory === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map(item => (
          <button
            key={item.id}
            onClick={() => item.available && onAdd(item)}
            disabled={!item.available}
            className={`relative rounded-2xl text-left shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col h-64 ${item.available ? 'bg-white' : 'bg-slate-200 opacity-80'}`}
          >
            <div className="h-32 w-full relative">
              {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100" />}
              <span className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-[10px] font-black uppercase">{item.category}</span>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div className="font-bold text-slate-800 leading-tight">{item.name}</div>
              <div className="text-lg font-black text-slate-900">₱{item.price}</div>
            </div>
            {!item.available && (
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                <span className="bg-red-600 text-white font-black text-sm px-4 py-1.5 rounded-lg -rotate-12">SOLD OUT</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}