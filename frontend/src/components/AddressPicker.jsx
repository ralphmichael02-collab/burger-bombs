import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, X, Navigation, CheckCircle } from 'lucide-react';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({ click(e) { setPosition(e.latlng); } });
  return position === null ? null : <Marker position={position} />;
}

export default function AddressPicker({ onConfirm, onClose }) {
  const [position, setPosition] = useState({ lat: 14.5995, lng: 120.9842 });
  const [addressText, setAddressText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`);
      const data = await res.json();
      const finalAddress = `${addressText ? addressText + ', ' : ''}${data.display_name}`;
      onConfirm(finalAddress, position.lat, position.lng);
    } catch (err) {
      onConfirm(addressText || 'Pinned Location', position.lat, position.lng);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        <div className="p-4 bg-[#1A1C23] text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2"><MapPin size={20} /> Pin Your Delivery Address</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex-1 relative">
          <MapContainer center={position} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-md z-[400] text-sm font-bold text-gray-700 pointer-events-none flex items-center gap-2">
            <Navigation size={14} /> Tap map to drop pin
          </div>
        </div>
        <div className="p-4 bg-white space-y-4">
          <input type="text" placeholder="House / Unit / Landmark" value={addressText} onChange={(e) => setAddressText(e.target.value)} className="w-full border border-gray-200 p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#EA580C] outline-none" />
          <button onClick={handleConfirm} disabled={isLoading} className="w-full bg-[#EA580C] text-white font-bold py-3 rounded-xl hover:bg-[#C2410C] transition flex items-center justify-center gap-2">
            {isLoading ? 'Getting Address...' : <><CheckCircle size={18} /> Confirm Address</>}
          </button>
        </div>
      </div>
    </div>
  );
}