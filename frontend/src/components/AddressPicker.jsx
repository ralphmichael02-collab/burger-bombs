// frontend/src/components/AddressPicker.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, X, Navigation, CheckCircle, Search } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapClickHandler({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return null;
}

// Recenters the map when the position changes externally (search result)
function RecenterOnChange({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], map.getZoom());
  }, [position?.lat, position?.lng, map]);
  return null;
}

export default function AddressPicker({
  onConfirm,
  onClose,
  initialPosition = { lat: 12.4989, lng: 124.6377 },
  title = 'Pin Your Delivery Address',
  enableSearch = false,
}) {
  const [position, setPosition] = useState(initialPosition);
  const [addressText, setAddressText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Search state (only used when enableSearch is true)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (data.length === 0) {
        setSearchError('No results. Try a more specific place name.');
        return;
      }
      const { lat, lon, display_name } = data[0];
      const newPos = { lat: parseFloat(lat), lng: parseFloat(lon) };
      setPosition(newPos);
      setAddressText(display_name);
    } catch (err) {
      setSearchError('Search failed. Check your connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
      );
      const data = await res.json();
      const finalAddress = `${addressText ? addressText + ', ' : ''}${data.display_name || ''}`;
      onConfirm(finalAddress, position.lat, position.lng);
    } catch (err) {
      onConfirm(addressText || 'Pinned Location', position.lat, position.lng);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-border">
        <div className="p-4 bg-background border-b border-border text-text flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin size={20} className="text-primary" /> {title}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text p-2 rounded-full hover:bg-surface transition">
            <X size={20} />
          </button>
        </div>

        {enableSearch && (
          <div className="p-3 bg-surface border-b border-border shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search address or place name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-text text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={runSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-sm hover:bg-primary-hover transition disabled:opacity-50"
              >
                {isSearching ? '…' : 'Search'}
              </button>
            </div>
            {searchError && <p className="text-danger text-xs mt-2">{searchError}</p>}
          </div>
        )}

        <div className="flex-1 relative">
          <MapContainer center={position} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler setPosition={setPosition} />
            <RecenterOnChange position={position} />
            <Marker
              position={position}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  if (marker != null) setPosition(marker.getLatLng());
                },
              }}
            />
          </MapContainer>

          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur px-4 py-2 rounded-full shadow-md z-[400] text-sm font-bold text-text pointer-events-none flex items-center gap-2 border border-border">
            <Navigation size={14} className="text-primary" /> Tap map or drag pin
          </div>
        </div>

        <div className="p-4 bg-surface space-y-3 shrink-0 border-t border-border">
          <div className="flex items-center justify-between text-xs text-text-muted font-mono bg-background border border-border rounded-lg px-3 py-2">
            <span>LAT: {position.lat.toFixed(6)}</span>
            <span>LNG: {position.lng.toFixed(6)}</span>
          </div>
          <input
            type="text"
            placeholder="House / Unit / Landmark (optional)"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            className="w-full border border-border p-3 rounded-lg bg-background text-text focus:ring-2 focus:ring-primary outline-none transition text-sm"
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