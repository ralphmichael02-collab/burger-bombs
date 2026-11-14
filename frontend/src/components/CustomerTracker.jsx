// frontend/src/components/CustomerTracker.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import L from 'leaflet';

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
    if (position && position[0] !== 0) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
}

export default function CustomerTracker() {
  const { orderId } = useParams(); 
  const [riderPos, setRiderPos] = useState([14.5995, 120.9842]); 
  const [hasSignal, setHasSignal] = useState(false);
  const [status, setStatus] = useState('TRACKING'); 

  useEffect(() => {
    socket.on('rider_location_update', (data) => {
      if (data.orderId.toString() === orderId.toString()) {
        setRiderPos([data.lat, data.lng]);
        setHasSignal(true);
      }
    });

    // 👇 Added a console log to prove the event arrived
    socket.on('delivery_completed', (data) => {
      console.log("Received delivery_completed event:", data);
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
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/confirm-receipt`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to confirm');
      setStatus('CONFIRMED');
    } catch (err) {
      console.error("Failed to confirm", err);
      alert("Error confirming receipt. Check backend.");
    }
  };

  if (status === 'CONFIRMED') {
    return (
      <div className="h-screen w-full bg-green-500 flex flex-col items-center justify-center p-6 text-white text-center">
        <h1 className="text-5xl mb-4">🎉</h1>
        <h2 className="text-3xl font-black mb-2">Enjoy your meal!</h2>
        <p className="text-lg opacity-90">Thank you for ordering from Burger Bombs.</p>
      </div>
    );
  }

  if (status === 'DELIVERED') {
    return (
      <div className="h-screen w-full bg-gray-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-700">
          <h1 className="text-4xl mb-4">🛵✅</h1>
          <h2 className="text-2xl font-black mb-2 text-green-400">Your order has arrived!</h2>
          <p className="text-gray-400 mb-8">Please confirm you have received your food.</p>
          
          <button 
            onClick={confirmReceipt}
            className="w-full bg-yellow-500 text-black font-bold py-4 rounded-xl hover:bg-yellow-400 transition text-lg shadow-lg"
          >
            Confirm Receipt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col">
      <header className="bg-yellow-500 text-black p-4 shadow-md z-10 relative">
        <h1 className="text-xl font-bold">Track Order #{orderId}</h1>
        <p className="text-sm font-medium">
          {hasSignal ? "Live tracking active 🟢" : "Waiting for rider signal..."}
        </p>
      </header>

      <div className="flex-1 w-full relative z-0">
        <MapContainer center={riderPos} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap position={riderPos} />
          <Marker position={riderPos}>
            <Popup>Your Rider 🛵</Popup>
          </Marker>
        </MapContainer>
      </div>
      
      <div className="bg-white p-4 text-center border-t z-10 relative shadow-lg">
        <p className="font-bold text-green-600 animate-pulse">Arriving Soon</p>
      </div>
    </div>
  );
}