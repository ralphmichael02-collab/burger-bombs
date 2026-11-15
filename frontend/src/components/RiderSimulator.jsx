import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Truck, MapPin, CheckCircle, Navigation, RefreshCw } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const socket = io(SOCKET_URL);

export default function RiderSimulator() {
  const [readyOrders, setReadyOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [location, setLocation] = useState({ lat: 14.5995, lng: 120.9842 });
  const [error, setError] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const fetchReadyOrders = () => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/orders/ready-for-delivery`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setReadyOrders(Array.isArray(data) ? data : []))
      .catch(err => { console.error(err); setReadyOrders([]); });
  };

  useEffect(() => { fetchReadyOrders(); const interval = setInterval(fetchReadyOrders, 10000); return () => clearInterval(interval); }, []);

  useEffect(() => {
    if (!activeDelivery) return;
    let watchId;
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setError(null);
        socket.emit('rider_location', { orderId: activeDelivery.id, lat: latitude, lng: longitude });
      },
      (err) => setError(err.message || 'Enable GPS'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [activeDelivery]);

  const finishDelivery = async () => {
    setIsFinishing(true);
    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${activeDelivery.id}/deliver`, { method: 'POST' });
      setActiveDelivery(null);
      fetchReadyOrders();
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsFinishing(false); }
  };

  if (activeDelivery) return (
    <div className="min-h-screen bg-[#1A1C23] flex flex-col p-6 text-white font-sans">
      <div className="flex justify-between items-center mb-8">
        <div><h1 className="text-2xl font-black text-[#EA580C] flex items-center gap-2"><Truck size={24} /> En Route</h1><p className="text-gray-400 text-sm">Order #{activeDelivery.id}</p></div>
        <div className="bg-[#45C65A]/20 text-[#45C65A] px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 border border-[#45C65A]/30"><span className="w-2 h-2 bg-[#45C65A] rounded-full animate-pulse"></span> GPS Active</div>
      </div>
      <div className="bg-[#2C2C2E] border border-gray-700 rounded-3xl p-6 mb-6">
        <h2 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><MapPin size={16} /> Delivery Address</h2>
        <p className="text-lg font-medium leading-relaxed mb-6">{activeDelivery.delivery_address || 'Address not provided'}</p>
        <div className="bg-black p-4 rounded-xl border border-gray-800 font-mono text-xs text-gray-500"><p>LAT: {location.lat.toFixed(5)}</p><p>LNG: {location.lng.toFixed(5)}</p></div>
      </div>
      {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm">{error}</div>}
      <div className="mt-auto">
        <button onClick={finishDelivery} disabled={isFinishing} className="w-full bg-[#EA580C] text-black font-black text-xl py-5 rounded-2xl hover:bg-[#C2410C] transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
          {isFinishing ? 'Processing...' : <><CheckCircle size={24} /> Complete Delivery</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1A1C23] text-white font-sans flex flex-col">
      <header className="bg-[#2C2C2E] p-6 border-b border-gray-800 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center"><Navigation size={24} className="text-[#EA580C]" /></div>
            <div><h1 className="font-black text-lg">Rider Dashboard</h1><p className="text-gray-400 text-sm">Burger Bombs Delivery</p></div>
          </div>
          <button onClick={() => setIsOnline(!isOnline)} className={`px-4 py-2 rounded-full font-bold text-sm border transition ${isOnline ? 'bg-[#45C65A]/20 text-[#45C65A] border-[#45C65A]/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>{isOnline ? 'Online' : 'Offline'}</button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-200">Ready for Pickup</h2><button onClick={fetchReadyOrders} className="text-sm text-[#EA580C] font-bold hover:underline flex items-center gap-1"><RefreshCw size={14} /> Refresh</button></div>
        {readyOrders.length === 0 ? (
          <div className="bg-[#2C2C2E] border border-gray-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center"><Truck size={48} className="mb-4 text-gray-600" /><p className="text-gray-400 font-medium">No orders ready. Waiting for kitchen...</p></div>
        ) : (
          <div className="space-y-4">
            {readyOrders.map(order => (
              <div key={order.id} className="bg-[#2C2C2E] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition">
                <div className="flex justify-between items-start mb-4">
                  <div><div className="font-black text-xl mb-1">Order #{order.id}</div><div className="text-sm text-gray-400">{order.items.reduce((s, i) => s + i.qty, 0)} items • ₱{order.total}</div></div>
                  <div className="bg-gray-800 text-gray-300 px-3 py-1 rounded-lg text-xs font-bold uppercase">Pickup</div>
                </div>
                <button onClick={() => setActiveDelivery(order)} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><Navigation size={16} /> Start Delivery</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}