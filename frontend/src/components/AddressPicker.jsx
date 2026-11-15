// frontend/src/components/AddressPicker.jsx
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, X, Navigation, CheckCircle } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 👇 Helper component to handle map clicks
function MapClickHandler({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return null;
}

export default function AddressPicker({ onConfirm, onClose }) {
  // 👇 Default location: Catarman, Northern Samar
  const [position, setPosition] = useState({ lat: 12.4989, lng: 124.6377 });
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
      <div className="bg-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[80vh] border border-border">
        <div className="p-4 bg-background border-b border-border text-text flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><MapPin size={20} className="text-primary" /> Pin Your Delivery Address</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text p-2 rounded-full hover:bg-surface transition"><X size={20} /></button>
        </div>
        
        <div className="flex-1 relative">
          <MapContainer center={position} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler setPosition={setPosition} />
            
            {/* 👇 The marker is now draggable as a fallback */}
            <Marker 
              position={position} 
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  if (marker != null) {
                    setPosition(marker.getLatLng());
                  }
                },
              }}
            />
          </MapContainer>
          
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur px-4 py-2 rounded-full shadow-md z-[400] text-sm font-bold text-text pointer-events-none flex items-center gap-2 border border-border">
            <Navigation size={14} className="text-primary" /> Tap map or drag pin
          </div>
        </div>

        <div className="p-4 bg-surface space-y-4 shrink-0 border-t border-border">
          <input 
            type="text" 
            placeholder="House / Unit / Landmark" 
            value={addressText} 
            onChange={(e) => setAddressText(e.target.value)} 
            className="w-full border border-border p-3 rounded-lg bg-background text-text focus:ring-2 focus:ring-primary outline-none transition" 
          />
          <button 
            onClick={handleConfirm} 
            disabled={isLoading} 
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-hover transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Getting Address...' : <><CheckCircle size={18} /> Confirm Address</>}
          </button>
        </div>
      </div>
    </div>
  );
}