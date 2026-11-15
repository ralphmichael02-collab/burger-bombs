// frontend/src/components/KitchenDisplay.jsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const socket = io(SOCKET_URL);

export default function KitchenDisplay() {
  const [tickets, setTickets] = useState([]);

  // Fetch existing PENDING orders on load/refresh
  const fetchActiveOrders = () => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/orders/active`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          // Merge with existing state to avoid duplicates
          setTickets(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newTickets = data.filter(t => !existingIds.has(t.id));
            return [...newTickets, ...prev];
          });
        }
      })
      .catch(err => console.error("Failed to fetch active orders", err));
  };

  useEffect(() => {
    fetchActiveOrders(); // Run on mount

    const playDing = () => {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(() => console.log('Click page to enable audio'));
    };

    socket.on('new_order', (order) => {
      console.log('[KDS] New order received:', order);
      playDing();
      setTickets((prev) => {
        if (prev.find(t => t.id === order.id)) return prev; // Prevent duplicates
        return [...prev, order];
      });
    });

    return () => socket.off('new_order');
  }, []);

  const completeOrder = async (orderId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/complete`, {
        method: 'POST'
      });
      setTickets((prev) => prev.filter((t) => t.id !== orderId));
    } catch (err) {
      console.error("Failed to complete order", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <header className="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-green-400">Kitchen Display</h1>
          <button onClick={fetchActiveOrders} className="bg-gray-800 px-3 py-1 rounded text-sm font-bold hover:bg-gray-700">↻ Sync</button>
        </div>
        <div className="text-xl">Active Tickets: {tickets.length}</div>
      </header>

      {tickets.length === 0 ? (
        <div className="text-center text-gray-500 mt-20 text-2xl">Waiting for orders…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white text-black rounded-lg shadow-lg overflow-hidden flex flex-col">
              <div className="bg-red-600 text-white p-3 flex justify-between font-bold">
                <span>Order #{ticket.id}</span>
                <span>{new Date(ticket.created_at || ticket.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="p-4 flex-1">
                <ul className="space-y-2">
                  {ticket.items.map((item, idx) => (
                    <li key={idx} className="text-lg font-semibold flex justify-between">
                      <span>{item.name}</span>
                      <span className="bg-gray-200 px-2 rounded">x{item.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button 
                onClick={() => completeOrder(ticket.id)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 w-full transition"
              >
                Mark as Completed
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}