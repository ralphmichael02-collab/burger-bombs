// frontend/src/components/TrackOrder.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { io } from 'socket.io-client';
import L from 'leaflet';
import { ArrowLeft, Truck, AlertTriangle, CheckCircle, Star } from 'lucide-react';
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

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    safeFetch(`${API_BASE}/api/orders/by-id/${orderId}`)
      .then(r => r.json())
      .then(data => {
        setOrder(data);
        if (data.status === 'DELIVERED') setShowConfirmModal(true);
      })
      .catch(err => setError(err.message));

    socket.emit('join:order', orderId);

    socket.on('rider:location', ({ lat, lng }) => {
      setPosition([lat, lng]);
      setLastUpdate(new Date().toLocaleTimeString());
    });

    // Listen for the rider marking it delivered
    socket.on('order:delivered', () => {
      setOrder(prev => ({ ...prev, status: 'DELIVERED' }));
      setShowConfirmModal(true);
    });

    return () => {
      socket.off('rider:location');
      socket.off('order:delivered');
    };
  }, [orderId]);

  const handleConfirmReceipt = async () => {
    setIsSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          customerId: order.customer_id || null, 
          rating, 
          comment 
        })
      });

      await fetch(`${API_BASE}/api/orders/${orderId}/confirm-receipt`, { method: 'POST' });

      setOrder(prev => ({ ...prev, status: 'RECEIVED' }));
      setShowConfirmModal(false);
    } catch (err) {
      alert('Failed to confirm receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <button onClick={() => window.location.reload()} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Retry</button>
        </div>
      ) : (
        <div className="flex-1 relative bg-gray-200 flex flex-col">
          <div className="flex-1 w-full relative z-0">
            <MapContainer center={[12.4989, 124.6377]} zoom={14} style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}>
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
                <p className={`text-sm font-bold ${order?.status === 'RECEIVED' ? 'text-success' : 'text-text-muted'}`}>
                  {order?.status === 'DELIVERED' ? 'Rider has arrived!' : order?.status || 'Loading...'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted uppercase font-bold">Last Update</p>
                <p className="font-mono text-sm">{lastUpdate || 'Waiting for rider...'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 shadow-2xl border border-border">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-black text-text">Did you receive your order?</h2>
              <p className="text-text-muted mt-1">Please confirm so we can finalize your delivery.</p>
            </div>

            <div className="bg-background p-4 rounded-xl border border-border mb-6 text-center">
              <p className="font-bold text-text mb-2">Rate your experience</p>
              <div className="flex justify-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRating(star)} className={`transition transform hover:scale-110 ${star <= rating ? 'text-orange-500' : 'text-gray-300'}`}>
                    <Star size={32} fill={star <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
              <textarea 
                value={comment} 
                onChange={e => setComment(e.target.value)} 
                placeholder="Any comments? (Optional)" 
                className="w-full border border-border p-2 rounded-lg bg-surface text-text text-sm focus:ring-2 focus:ring-primary outline-none" 
                rows="2"
              />
            </div>

            <button 
              onClick={handleConfirmReceipt} 
              disabled={isSubmitting}
              className="w-full bg-success text-white font-black py-4 rounded-xl shadow-lg hover:bg-success/90 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Confirming...' : 'Yes, I received my order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}