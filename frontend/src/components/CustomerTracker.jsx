import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { CheckCircle, Truck, Phone } from 'lucide-react';
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
  useEffect(() => { if (position && position[0] !== 0) map.setView(position, map.getZoom()); }, [position, map]);
  return null;
}

export default function CustomerTracker() {
  const { orderId } = useParams();
  const [riderPos, setRiderPos] = useState([14.5995, 120.9842]);
  const [hasSignal, setHasSignal] = useState(false);
  const [status, setStatus] = useState('TRACKING');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    socket.on('rider_location_update', (data) => {
      if (data.orderId.toString() === orderId.toString()) { setRiderPos([data.lat, data.lng]); setHasSignal(true); }
    });
    socket.on('delivery_completed', (data) => { if (data.orderId.toString() === orderId.toString()) setStatus('DELIVERED'); });
    return () => { socket.off('rider_location_update'); socket.off('delivery_completed'); };
  }, [orderId]);

  const confirmReceipt = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/confirm-receipt`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      setStatus('CONFIRMED');
    } catch (err) { alert("Error confirming receipt."); } finally { setIsConfirming(false); }
  };

  if (status === 'CONFIRMED') return (
    <div className="h-screen w-full bg-[#45C65A] flex flex-col items-center justify-center p-6 text-white text-center font-sans">
      <CheckCircle size={80} className="mb-6 opacity-80" />
      <h2 className="text-4xl font-black mb-3">Enjoy your meal!</h2>
      <p className="text-lg text-green-100 max-w-md">Thank you for ordering from Burger Bombs!</p>
    </div>
  );

  return (
    <div className="h-screen w-full relative flex flex-col font-sans bg-gray-100">
      <div className="absolute inset-0 z-0">
        <MapContainer center={riderPos} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap position={riderPos} />
          {hasSignal && <Marker position={riderPos}><Popup>Your Rider</Popup></Marker>}
        </MapContainer>
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-6 bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
        <div className="bg-white px-6 py-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center pointer-events-auto max-w-md mx-auto">
          <div><h1 className="text-xl font-black text-[#1A1C23]">Order #{orderId}</h1><p className="text-sm text-gray-500 font-medium">Estimated arrival: 15 mins</p></div>
          <div className={`w-3 h-3 rounded-full ${hasSignal ? 'bg-[#45C65A] animate-pulse' : 'bg-gray-300'}`}></div>
        </div>
      </div>

      <div className="mt-auto relative z-10 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-10 max-w-md mx-auto w-full border-t border-gray-100">
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -z-10 rounded-full"></div>
          <div className={`absolute top-1/2 left-0 h-1 bg-[#EA580C] -z-10 rounded-full transition-all duration-1000 ${status === 'DELIVERED' ? 'w-full' : 'w-2/3'}`}></div>
          {['Placed', 'Cooking', 'On the Way', 'Delivered'].map((step, idx) => {
            const isActive = idx <= (status === 'DELIVERED' ? 3 : hasSignal ? 2 : 1);
            return (
              <div key={step} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isActive ? 'bg-[#EA580C] text-white' : 'bg-gray-100 text-gray-400'}`}>{isActive ? <CheckCircle size={14} /> : idx + 1}</div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-[#1A1C23]' : 'text-gray-400'}`}>{step}</span>
              </div>
            );
          })}
        </div>

        {status === 'DELIVERED' ? (
          <div className="text-center">
            <h2 className="text-2xl font-black text-[#1A1C23] mb-2">Your order is here!</h2>
            <p className="text-gray-500 mb-6">Please confirm you have received your food.</p>
            <button onClick={confirmReceipt} disabled={isConfirming} className="w-full bg-[#45C65A] text-white font-black text-lg py-4 rounded-2xl hover:bg-[#34A853] transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"><CheckCircle size={20} /> {isConfirming ? 'Confirming...' : 'Confirm Receipt'}</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#EA580C]/10 rounded-full flex items-center justify-center"><Truck size={28} className="text-[#EA580C]" /></div>
              <div><p className="font-bold text-[#1A1C23]">Rider is on the way</p><p className="text-sm text-gray-500">{hasSignal ? 'Live tracking active' : 'Waiting for rider...'}</p></div>
            </div>
            <button className="w-12 h-12 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 transition"><Phone size={20} /></button>
          </div>
        )}
      </div>
    </div>
  );
}