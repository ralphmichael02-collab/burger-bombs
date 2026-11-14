import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function MenuList({ onAdd }) {
  const items = useLiveQuery(() => db.menuItems.toArray(), []);

  if (!items) return <p className="p-4">Loading menu…</p>;
  if (items.length === 0) return <p className="p-4 text-gray-500">No menu items. Is the backend running?</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => item.available && onAdd(item)}
          disabled={!item.available}
          className={`relative p-4 rounded-lg text-left shadow transition
            ${item.available
              ? 'bg-white hover:bg-yellow-50 cursor-pointer'
              : 'bg-gray-200 cursor-not-allowed'}`}
        >
          <div className="font-bold">{item.name}</div>
          <div className="text-sm text-gray-600">₱{item.price}</div>
          {!item.available && (
            <span className="absolute top-2 right-2 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
              UNAVAILABLE
            </span>
          )}
        </button>
      ))}
    </div>
  );
}