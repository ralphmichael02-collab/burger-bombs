// frontend/src/components/CustomerTracker.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import L from 'leaflet';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const socket = io(SOCKET_URL);

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] !== 0) map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

export default function CustomerTracker() {
  const { orderId } = useParams(); 
  const [riderPos, setRiderPos] = useState([14.5995, 120.9842]); 
  const [hasSignal, setHasSignal] = useState(false);
  const [status, setStatus] = useState('TRACKING'); // TRACKING, DELIVERED, CONFIRMED
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    socket.on('rider_location_update', (data) => {
      if (data.orderId.toString() === orderId.toString()) {
        setRiderPos([data.lat, data.lng]);
        setHasSignal(true);
      }
    });

    socket.on('delivery_completed', (data) => {
      if (data.orderId.toString() === orderId.toString()) {
        setStatus('DELIVERED');
      }
    });

    return () => {
      socket.off('rider_location_update');
      socket.off('delivery_completed');
    };
  }, [orderId]);

  const confirmReceipt = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/confirm-receipt`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to confirm');
      setStatus('CONFIRMED');
    } catch (err) {
      alert("Error confirming receipt. Check connection.");
    } finally {
      setIsConfirming(false);
    }
  };

  // --- CONFIRMED SCREEN ---
  if (status === 'CONFIRMED') {
    return (
      <div className="h-screen w-full bg-green-500 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-5xl mb-6">🎉</div>
        <h2 className="text-4xl font-black mb-3">Enjoy your meal!</h2>
        <p className="text-lg text-green-100 max-w-md">Thank you for ordering from Burger Bombs. We hope to see you again soon!</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative flex flex-col font-sans bg-slate-100">
      
      {/* Map takes up the whole background */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={riderPos} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap position={riderPos} />
          {hasSignal && (
            <Marker position={riderPos}>
              <Popup>Your Rider 🛵</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Top Floating Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-6 bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
        <div className="bg-white px-6 py-4 rounded-2xl shadow-lg border border-slate-100 flex justify-between items-center pointer-events-auto max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-black text-slate-900">Order #{orderId}</h1>
            <p className="text-sm text-slate-500 font-medium">Estimated arrival: 15 mins</p>
          </div>
          <div className={`w-3 h-3 rounded-full ${hasSignal ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="mt-auto relative z-10 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-10 max-w-md mx-auto w-full border-t border-slate-100">
        
        {/* Progress Stepper */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -z-10 rounded-full"></div>
          <div className={`absolute top-1/2 left-0 h-1 bg-orange-500 -z-10 rounded-full transition-all duration-1000 ${status === 'DELIVERED' ? 'w-full' : 'w-2/3'}`}></div>
          
          {['Placed', 'Cooking', 'On the Way', 'Delivered'].map((step, idx) => {
            const isActive = idx <= (status === 'DELIVERED' ? 3 : hasSignal ? 2 : 1);
            return (
              <div key={step} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isActive ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {isActive ? '✓' : idx + 1}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{step}</span>
              </div>
            );
          })}
        </div>

        {/* Content based on Status */}
        {status === 'DELIVERED' ? (
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Your order is here!</h2>
            <p className="text-slate-500 mb-6">Please confirm you have received your food.</p>
            <button 
              onClick={confirmReceipt}
              disabled={isConfirming}
              className="w-full bg-green-500 text-white font-black text-lg py-4 rounded-2xl hover:bg-green-600 transition shadow-lg disabled:opacity-50"
            >
              {isConfirming ? 'Confirming...' : 'Confirm Receipt'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-3xl">🛵</div>
              <div>
                <p className="font-bold text-slate-900">Rider is on the way</p>
                <p className="text-sm text-slate-500">{hasSignal ? 'Live tracking active' : 'Waiting for rider...'}</p>
              </div>
            </div>
            <button className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center hover:bg-slate-200 transition text-xl">
              📞
            </button>
          </div>
        )}
      </div>
    </div>
  );
}