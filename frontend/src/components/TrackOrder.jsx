// frontend/src/components/TrackOrder.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { io } from 'socket.io-client';
import L from 'leaflet';
import { ArrowLeft, Truck, AlertTriangle } from 'lucide-react';
import { API_BASE, SOCKET_URL, safeFetch } from '../config/api';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const socket = io(SOCKET_URL, { transports: ['polling', 'websocket'] });

export default function TrackOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    safeFetch(`${API_BASE}/api/orders/by-id/${orderId}`)
      .then(r => r.json())
      .then(setOrder)
      .catch(err => {
        console.error(err);
        setError(err.message);
      });

    socket.emit('join:order', orderId);

    socket.on('rider:location', ({ lat, lng }) => {
      setPosition([lat, lng]);
      setLastUpdate(new Date().toLocaleTimeString());
    });

    return () => {
      socket.off('rider:location');
    };
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-['Source_Sans_Pro',sans-serif]">
      <header className="bg-surface p-4 shadow-sm flex items-center gap-4 border-b border-border z-10 relative">
        <button onClick={() => navigate('/store')} className="p-2 bg-background rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-text flex items-center gap-2">
          <Truck size={24} className="text-primary" /> Track Your Order
        </h1>
      </header>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle size={64} className="text-orange-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-text-muted mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">
            Retry
          </button>
        </div>
      ) : (
        <div className="flex-1 relative bg-gray-200 flex flex-col">
          <div className="flex-1 w-full relative z-0">
            {/* 👇 Default Center: Northern Samar */}
            <MapContainer 
              center={[12.4989, 124.6377]} 
              zoom={14} 
              style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {position && (
                <Marker position={position}>
                  <Popup>🛵 Your rider is here</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-surface p-4 rounded-xl shadow-lg border border-border z-[400]">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-black text-lg text-text">Order #{orderId}</p>
                <p className="text-sm text-text-muted">{order?.status || 'Loading...'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted uppercase font-bold">Last Update</p>
                <p className="font-mono text-sm">{lastUpdate || 'Waiting for rider...'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}