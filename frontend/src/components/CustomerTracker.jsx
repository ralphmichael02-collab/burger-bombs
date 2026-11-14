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
  const { orderId } = useParams(); // 👈 Get the Order ID from the URL
  const [riderPos, setRiderPos] = useState([14.5995, 120.9842]); 
  const [hasSignal, setHasSignal] = useState(false);

  useEffect(() => {
    socket.on('rider_location_update', (data) => {
      // 👇 ONLY move the map if the GPS ping is for THIS order
      if (data.orderId.toString() === orderId.toString()) {
        setRiderPos([data.lat, data.lng]);
        setHasSignal(true);
      }
    });

    return () => socket.off('rider_location_update');
  }, [orderId]);

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