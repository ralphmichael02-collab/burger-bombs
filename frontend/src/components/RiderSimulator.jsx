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
  const [isFinishing, setIsFinishing] = useState(false); // 👈 New State

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

  // 👇 UPDATED: Added loading state and error alerting
  const finishDelivery = async () => {
    setIsFinishing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${activeDelivery.id}/deliver`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      
      setActiveDelivery(null); // Go back to dashboard
      fetchReadyOrders(); // Refresh the list
    } catch (err) {
      console.error("Failed to complete delivery", err);
      alert(`Error completing delivery: ${err.message}. Check if backend is deployed.`);
    } finally {
      setIsFinishing(false);
    }
  };

  if (activeDelivery) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-700">
          <h1 className="text-3xl font-black mb-2 text-green-400">Delivering Order #{activeDelivery.id}</h1>
          <p className="text-gray-400 mb-6 text-lg font-medium">Total: ₱{activeDelivery.total}</p>

          {error ? (
             <div className="bg-red-900/50 p-4 rounded-xl mb-6 text-red-200 text-sm border border-red-700">⚠️ {error}</div>
          ) : (
            <div className="bg-black p-4 rounded-xl mb-6 font-mono text-sm border border-gray-700 text-green-400">
              <p className="animate-pulse">Live GPS Active 🟢</p>
              <p className="mt-2">Lat: {location.lat.toFixed(5)}</p>
              <p>Lng: {location.lng.toFixed(5)}</p>
            </div>
          )}

          <button
            onClick={finishDelivery}
            disabled={isFinishing}
            className="w-full py-4 rounded-xl font-bold text-lg bg-red-600 hover:bg-red-700 transition shadow-lg disabled:opacity-50"
          >
            {isFinishing ? 'Processing...' : 'Complete Delivery ✅'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Rider Dashboard</h1>
            <p className="text-sm text-gray-500">Burger Bombs Delivery</p>
          </div>
          <button onClick={fetchReadyOrders} className="text-sm bg-white border border-gray-300 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50">
            Refresh
          </button>
        </header>

        <h2 className="text-lg font-bold text-gray-700 mb-4">Ready for Pickup</h2>
        
        {readyOrders.length === 0 ? (
          <div className="text-center text-gray-500 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            No orders ready yet. Waiting for kitchen...
          </div>
        ) : (
          <div className="space-y-4">
            {readyOrders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                  <div className="font-black text-xl text-gray-800">Order #{order.id}</div>
                  <div className="text-sm text-gray-500">
                    {order.items.reduce((s, i) => s + i.qty, 0)} items • ₱{order.total}
                  </div>
                </div>
                <button
                  onClick={() => setActiveDelivery(order)}
                  className="bg-black text-white px-5 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition shadow-md"
                >
                  Start Delivery 🛵
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}