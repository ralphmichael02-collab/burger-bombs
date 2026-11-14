// frontend/src/components/RiderSimulator.jsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const socket = io(SOCKET_URL);

export default function RiderSimulator() {
  const [isDriving, setIsDriving] = useState(false);
  // Starting point (e.g., Restaurant in Manila)
  const [location, setLocation] = useState({ lat: 14.5995, lng: 120.9842 });

  useEffect(() => {
    let interval;
    if (isDriving) {
      interval = setInterval(() => {
        // Move the rider slightly every 2 seconds
        setLocation(prev => {
          const newLat = prev.lat + 0.0005; // Moving North
          const newLng = prev.lng + 0.0005; // Moving East
          
          // Broadcast to backend
          socket.emit('rider_location', { 
            orderId: 99, // Hardcoded for demo
            lat: newLat, 
            lng: newLng 
          });

          return { lat: newLat, lng: newLng };
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isDriving]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-700">
        <h1 className="text-3xl font-black mb-2 text-yellow-500">Rider Mode</h1>
        <p className="text-gray-400 mb-8">Order #99 Delivery</p>

        <div className="bg-black p-4 rounded-xl mb-8 font-mono text-sm border border-gray-700 text-green-400">
          <p>Lat: {location.lat.toFixed(5)}</p>
          <p>Lng: {location.lng.toFixed(5)}</p>
        </div>

        <button
          onClick={() => setIsDriving(!isDriving)}
          className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-lg ${
            isDriving ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isDriving ? '🛑 Stop Delivery' : '🛵 Start Delivery'}
        </button>
      </div>
    </div>
  );
}