import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const socket = io(SOCKET_URL);

export default function RiderSimulator() {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState({ lat: 0, lng: 0 });
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isTracking) return;

    let watchId;

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Start watching the device's position
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLoc = { lat: latitude, lng: longitude };
        
        setLocation(newLoc);
        setAccuracy(accuracy);
        setError(null);

        // Send the real GPS coordinates to the backend via WebSockets
        socket.emit('rider_location', {
          orderId: 99,
          lat: latitude,
          lng: longitude
        });
      },
      (err) => {
        setError(err.message || 'Failed to get location. Please enable GPS.');
        console.error('Geolocation error:', err);
      },
      {
        enableHighAccuracy: true, // Force GPS usage
        timeout: 10000,           // Wait up to 10 seconds for a fix
        maximumAge: 0             // Do not use cached positions
      }
    );

    // Cleanup: stop watching when tracking is turned off or component unmounts
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-700">
        <h1 className="text-3xl font-black mb-2 text-yellow-500">Rider Mode</h1>
        <p className="text-gray-400 mb-6">Order #99 Real GPS Delivery</p>

        {/* Display Real-Time Data */}
        {accuracy && (
          <div className="bg-black p-4 rounded-xl mb-4 font-mono text-sm border border-gray-700 text-green-400">
            <p>Lat: {location.lat.toFixed(5)}</p>
            <p>Lng: {location.lng.toFixed(5)}</p>
            <p className="text-yellow-400">Accuracy: ±{accuracy.toFixed(1)} meters</p>
          </div>
        )}

        {/* Error Handling */}
        {error && (
          <div className="bg-red-900/50 p-3 rounded-xl mb-4 text-red-200 text-sm border border-red-700">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={() => setIsTracking(!isTracking)}
          className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-lg ${
            isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isTracking ? '🛑 Stop Real GPS' : '📍 Start Real GPS'}
        </button>
      </div>
    </div>
  );
}