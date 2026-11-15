// frontend/src/components/KitchenDisplay.jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { ChefHat, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { API_BASE, SOCKET_URL } from '../config/api';

const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchActive = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/active`);
      const data = await res.json();
      setOrders((Array.isArray(data) ? data : []).map(o => ({
        id: o.id, items: o.items, total: o.total,
        createdAt: o.createdAt || o.created_at,
        orderType: o.orderType || o.order_type,
        paymentMethod: o.paymentMethod || o.payment_method,
      })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchActive();
    const handleConnect = () => { setConnected(true); socket.emit('join:kitchen'); fetchActive(); };
    const handleDisconnect = () => setConnected(false);
    const handleNew = (o) => { setOrders(p => [o, ...p]); new Audio('/ding.mp3').play().catch(() => {}); };
    const handleVoided = ({ id }) => setOrders(p => p.filter(o => o.id !== id));

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('order:new', handleNew);
    socket.on('order:voided', handleVoided);
    if (socket.connected) handleConnect();

    return () => { socket.off('connect', handleConnect); socket.off('disconnect', handleDisconnect); socket.off('order:new', handleNew); socket.off('order:voided', handleVoided); };
  }, []);

  const markDone = async (id) => {
    try {
      await fetch(`${API_BASE}/api/orders/${id}/complete`, { method: 'POST' });
      setOrders(p => p.filter(o => o.id !== id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-background text-text p-4 md:p-6 font-['Source_Sans_Pro',sans-serif]">
      <header className="flex justify-between items-center mb-6 border-b border-border pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3"><ChefHat size={36} className="text-primary" /> Kitchen Display</h1>
          <p className="text-sm text-text-muted font-bold mt-1">{orders.length} active orders</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-2 rounded-xl border font-bold text-sm flex items-center gap-2 ${connected ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-danger'}`} /> {connected ? 'Live' : 'Offline'}
          </div>
          <button onClick={fetchActive} className="p-3 bg-surface border border-border rounded-xl hover:bg-background"><RefreshCw size={20} className="text-text-muted" /></button>
          <div className="bg-surface px-6 py-3 rounded-xl border border-border font-black text-lg flex items-center gap-3"><Clock size={24} className="text-primary" /> {currentTime}</div>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-24 text-text-muted flex flex-col items-center">
          <ChefHat size={80} className="mb-6 opacity-20" />
          <p className="text-2xl font-bold">All caught up!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map(order => {
            const mins = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
            return (
              <div key={order.id} className={`bg-surface rounded-2xl border-2 shadow-md overflow-hidden flex flex-col animate-scale-in ${mins >= 10 ? 'border-danger' : 'border-border'}`}>
                <div className={`p-4 border-b flex justify-between items-center ${mins >= 10 ? 'bg-danger/10' : 'bg-primary/10'}`}>
                  <span className={`font-black text-2xl ${mins >= 10 ? 'text-danger' : 'text-primary'}`}>#{order.id}</span>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${mins >= 10 ? 'bg-danger text-white' : 'bg-surface text-text-muted'}`}>{mins} min</span>
                </div>
                <div className="p-4 flex-1">
                  <ul className="space-y-3">
                    {order.items.map((item, i) => (
                      <li key={i} className="text-xl font-bold flex justify-between border-b pb-2 last:border-0"><span>{item.name}</span><span className="text-primary">×{item.qty}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-background border-t flex justify-between items-center">
                  <span className="font-black text-xl">₱{order.total}</span>
                  <button onClick={() => markDone(order.id)} className="bg-success text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><CheckCircle size={20} /> DONE</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}