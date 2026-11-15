// frontend/src/components/MenuList.jsx
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function MenuList({ onAdd }) {
  const [filterCategory, setFilterCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const items = useLiveQuery(() => db.menuItems.toArray(), []);

  // Fetch dynamic categories
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/categories`)
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  if (!items) return <p className="p-4">Loading menu…</p>;
  if (items.length === 0) return <p className="p-4 text-gray-500">No menu items. Is the backend running?</p>;

  const filteredItems = items.filter(item => filterCategory === 'All' || item.category === filterCategory);

  return (
    <div>
      {/* Category Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto p-4 pb-0">
        {['All', ...categories].map(cat => (
          <button key={cat} onClick={() => setFilterCategory(cat)} 
            className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition ${filterCategory === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => item.available && onAdd(item)}
            disabled={!item.available}
            className={`relative rounded-lg text-left shadow transition overflow-hidden flex flex-col
              ${item.available
                ? 'bg-white hover:bg-yellow-50 cursor-pointer border border-gray-200'
                : 'bg-gray-200 cursor-not-allowed opacity-70 border border-gray-300'}`}
          >
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-24 object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No Image</div>
            )}
            
            <div className="p-3 flex-1">
              <div className="text-xs font-bold text-yellow-600 mb-1">{item.category}</div>
              <div className="font-bold text-gray-800">{item.name}</div>
              <div className="text-sm text-gray-600">₱{item.price}</div>
            </div>

            {!item.available && (
              <span className="absolute top-2 right-2 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded shadow-sm">
                UNAVAILABLE
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}