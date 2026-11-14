// frontend/src/components/CustomerTracker.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { io } from 'socket.io-client';
import L from 'leaflet';

// Fix for missing default marker icons in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const socket = io(SOCKET_URL);

// Helper component that makes the map follow the rider
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] !== 0) {
      map.setView(position, map.getZoom()); // Move map to new position smoothly
    }
  }, [position, map]);
  return null;
}

export default function CustomerTracker() {
  // Default to a central point (Manila) just as a fallback
  const [riderPos, setRiderPos] = useState([14.5995, 120.9842]); 
  const [hasSignal, setHasSignal] = useState(false);

  useEffect(() => {
    socket.on('rider_location_update', (data) => {
      console.log('Rider moved:', data);
      setRiderPos([data.lat, data.lng]);
      setHasSignal(true);
    });

    return () => socket.off('rider_location_update');
  }, []);

  return (
    <div className="h-screen w-full flex flex-col">
      <header className="bg-yellow-500 text-black p-4 shadow-md z-10 relative">
        <h1 className="text-xl font-bold">Track Order #99</h1>
        <p className="text-sm font-medium">
          {hasSignal ? "Live tracking active 🟢" : "Waiting for rider signal..."}
        </p>
      </header>

      {/* Map Container */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer 
          center={riderPos} 
          zoom={16} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false} // Hide zoom buttons for a cleaner mobile look
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* This component makes the camera follow the rider */}
          <RecenterMap position={riderPos} />

          {/* The moving marker */}
          <Marker position={riderPos}>
            <Popup>Your Rider 🛵</Popup>
          </Marker>
        </MapContainer>
      </div>
      
      <div className="bg-white p-4 text-center border-t z-10 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <p className="font-bold text-green-600 animate-pulse">Arriving Soon</p>
      </div>
    </div>
  );
}