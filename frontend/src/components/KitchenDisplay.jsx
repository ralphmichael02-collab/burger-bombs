// frontend/src/components/KitchenDisplay.jsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ChefHat, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const socket = io(SOCKET_URL);

export default function KitchenDisplay() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchActiveOrders = () => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/orders/active`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setTickets(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newTickets = data.filter(t => !existingIds.has(t.id));
            return [...prev, ...newTickets];
          });
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchActiveOrders();
    const playDing = () => new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
    socket.on('new_order', (order) => {
      playDing();
      setTickets((prev) => prev.find(t => t.id === order.id) ? prev : [...prev, order]);
    });
    return () => socket.off('new_order');
  }, []);

  const completeOrder = async (orderId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/complete`, { method: 'POST' });
      setTickets((prev) => prev.filter((t) => t.id !== orderId));
    } catch (err) { console.error(err); }
  };

  const getElapsedTime = (createdAt) => {
    const elapsed = Math.floor((time - new Date(createdAt).getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return { text: `${mins}m ${secs}s`, totalMins: mins };
  };

  const filteredTickets = tickets.filter(t => filter === 'ALL' || t.orderType === filter);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black text-orange-500 tracking-tight flex items-center gap-2">
            <ChefHat size={28} /> Kitchen Display
          </h1>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {['ALL', 'ONLINE', 'POS'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filter === f ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                {f === 'POS' ? 'In-Store' : f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-400">Active: <span className="text-white">{filteredTickets.length}</span></span>
          <button onClick={fetchActiveOrders} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2">
            <RefreshCw size={14} /> Sync
          </button>
        </div>
      </header>

      <div className="flex-1 p-6">
        {filteredTickets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <Clock size={64} className="mb-4 opacity-50" />
            <h2 className="text-2xl font-bold">Waiting for orders...</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {filteredTickets.map((ticket) => {
              const elapsed = getElapsedTime(ticket.createdAt || ticket.created_at);
              const isWarning = elapsed.totalMins >= 5 && elapsed.totalMins < 10;
              const isCritical = elapsed.totalMins >= 10;

              return (
                <div key={ticket.id} className={`bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col border ${isCritical ? 'border-red-500 shadow-red-500/20' : isWarning ? 'border-yellow-500' : 'border-slate-800'}`}>
                  <div className={`p-4 flex justify-between items-center border-b border-slate-800 ${isCritical ? 'bg-red-500/10' : isWarning ? 'bg-yellow-500/10' : 'bg-slate-800/50'}`}>
                    <div>
                      <div className="text-xl font-black">#{ticket.id}</div>
                      <div className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                        {ticket.orderType === 'ONLINE' ? (
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">ONLINE</span>
                        ) : (
                          <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">IN-STORE</span>
                        )}
                      </div>
                    </div>
                    <div className={`text-lg font-black font-mono px-3 py-1 rounded-lg flex items-center gap-1 ${isCritical ? 'text-red-400 bg-red-500/20' : isWarning ? 'text-yellow-400 bg-yellow-500/20' : 'text-green-400 bg-green-500/20'}`}>
                      {isCritical && <AlertTriangle size={16} />}
                      {elapsed.text}
                    </div>
                  </div>
                  <div className="p-4 flex-1">
                    <ul className="space-y-3">
                      {ticket.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-start text-lg">
                          <span className="font-bold text-slate-200"><span className="text-orange-500 mr-2">{item.qty}x</span> {item.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 pt-0">
                    <button onClick={() => completeOrder(ticket.id)} className="w-full bg-slate-800 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-colors border border-slate-700 hover:border-green-500 flex items-center justify-center gap-2">
                      <CheckCircle size={18} /> Mark as Completed
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}