// frontend/src/components/RiderSimulator.jsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

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

  useEffect(() => {
    fetchReadyOrders();
    const interval = setInterval(fetchReadyOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeDelivery) return;

    let watchId;
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setError(null);
        socket.emit('rider_location', {
          orderId: activeDelivery.id, 
          lat: latitude,
          lng: longitude
        });
      },
      (err) => setError(err.message || 'Enable GPS to deliver'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeDelivery]);

  const finishDelivery = async () => {
    setIsFinishing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${activeDelivery.id}/deliver`, { method: 'POST' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setActiveDelivery(null);
      fetchReadyOrders();
    } catch (err) {
      alert(`Error completing delivery: ${err.message}`);
    } finally {
      setIsFinishing(false);
    }
  };

  // --- ACTIVE DELIVERY SCREEN ---
  if (activeDelivery) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 text-white font-sans">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-orange-500">En Route</h1>
            <p className="text-slate-400 text-sm">Order #{activeDelivery.id}</p>
          </div>
          <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 border border-green-500/30">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> GPS Active
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6">
          <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-4">Delivery Address</h2>
          <p className="text-lg font-medium leading-relaxed mb-6">
            📍 {activeDelivery.delivery_address || 'Address not provided'}
          </p>
          
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-500">
            <p>LAT: {location.lat.toFixed(5)}</p>
            <p>LNG: {location.lng.toFixed(5)}</p>
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm">{error}</div>}

        <div className="mt-auto space-y-4">
          <button 
            onClick={finishDelivery}
            disabled={isFinishing}
            className="w-full bg-orange-500 text-black font-black text-xl py-5 rounded-2xl hover:bg-orange-400 transition shadow-lg disabled:opacity-50"
          >
            {isFinishing ? 'Processing...' : 'Complete Delivery ✅'}
          </button>
          <p className="text-center text-slate-500 text-xs font-medium">Ensure the customer has received the order before completing.</p>
        </div>
      </div>
    );
  }

  // --- DASHBOARD SCREEN ---
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 p-6 border-b border-slate-800 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-2xl">🛵</div>
            <div>
              <h1 className="font-black text-lg">Rider Dashboard</h1>
              <p className="text-slate-400 text-sm">Burger Bombs Delivery</p>
            </div>
          </div>
          
          {/* Online Toggle */}
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`px-4 py-2 rounded-full font-bold text-sm border transition ${isOnline ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-200">Ready for Pickup</h2>
          <button onClick={fetchReadyOrders} className="text-sm text-orange-500 font-bold hover:underline">↻ Refresh</button>
        </div>

        {readyOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
            <span className="text-5xl mb-4 opacity-50">💤</span>
            <p className="text-slate-400 font-medium">No orders ready. Waiting for kitchen...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {readyOrders.map(order => (
              <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-black text-xl mb-1">Order #{order.id}</div>
                    <div className="text-sm text-slate-400">{order.items.reduce((s, i) => s + i.qty, 0)} items • ₱{order.total}</div>
                  </div>
                  <div className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg text-xs font-bold uppercase">Pickup</div>
                </div>
                <button
                  onClick={() => setActiveDelivery(order)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition"
                >
                  Start Delivery
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}