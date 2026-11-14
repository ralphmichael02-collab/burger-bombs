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
    if (position && position[0] !== 0) map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

export default function CustomerTracker() {
  const { orderId } = useParams();
  const [orderStatus, setOrderStatus] = useState('PENDING');
  const [riderPos, setRiderPos] = useState([14.5995, 120.9842]); 
  const [hasSignal, setHasSignal] = useState(false);

  // 1. Fetch initial status on load
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}`)
      .then(res => res.json())
      .then(data => { if (data.status) setOrderStatus(data.status); })
      .catch(err => console.error('Failed to get status', err));
  }, [orderId]);

  // 2. Listen for Socket events
  useEffect(() => {
    socket.on('order_status_update', (data) => {
      if (data.orderId.toString() === orderId.toString()) {
        setOrderStatus(data.status);
      }
    });

    socket.on('rider_location_update', (data) => {
      if (data.orderId.toString() === orderId.toString()) {
        setRiderPos([data.lat, data.lng]);
        setHasSignal(true);
      }
    });

    return () => {
      socket.off('order_status_update');
      socket.off('rider_location_update');
    };
  }, [orderId]);

  return (
    <div className="h-screen w-full flex flex-col">
      <header className="bg-yellow-500 text-black p-4 shadow-md z-10 relative flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Order #{orderId}</h1>
          <p className="text-sm font-medium">
            {orderStatus === 'PENDING' && "Preparing your food... 👨‍🍳"}
            {orderStatus === 'READY' && "Food is ready! Waiting for rider... 🛍️"}
            {orderStatus === 'ON_THE_WAY' && "On the way! 🛵"}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          orderStatus === 'PENDING' ? 'bg-yellow-200' :
          orderStatus === 'READY' ? 'bg-blue-200 text-blue-800' : 'bg-green-400'
        }`}>
          {orderStatus}
        </span>
      </header>

      {/* State 1: PENDING */}
      {orderStatus === 'PENDING' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <div className="w-24 h-24 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Cooking your order...</h2>
          <p className="text-gray-500">Our kitchen team is preparing your delicious food. Hang tight!</p>
        </div>
      )}

      {/* State 2: READY */}
      {orderStatus === 'READY' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-blue-50 p-6 text-center">
          <div className="text-6xl mb-6">🛍️</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Food is ready!</h2>
          <p className="text-gray-500">We are assigning a rider to pick up your order.</p>
        </div>
      )}

      {/* State 3: ON_THE_WAY (Show Map) */}
      {orderStatus === 'ON_THE_WAY' && (
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
          
          {!hasSignal && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-50 text-sm font-bold text-gray-600">
               Waiting for rider GPS signal...
             </div>
          )}
        </div>
      )}
    </div>
  );
}