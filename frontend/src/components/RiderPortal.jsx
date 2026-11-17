// frontend/src/components/RiderPortal.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import jsQR from 'jsqr';
import { db } from '../db';
import { Truck, MapPin, CheckCircle, Navigation, LogOut, QrCode, Camera, X } from 'lucide-react';
import { API_BASE, SOCKET_URL, safeFetch } from '../config/api';

const socket = io(SOCKET_URL, { transports: ['polling', 'websocket'] });

export default function RiderPortal() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [tracking, setTracking] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  
  const [showScanner, setShowScanner] = useState(false);
  const fileInputRef = useRef(null);

  // 👇 0. LOGIN GUARD (Redirects to Mobile Portal if not logged in)
  useEffect(() => {
    const saved = localStorage.getItem('staff_user');
    if (!saved) {
      navigate('/mobile');
    }
  }, [navigate]);

  // 1. Load Data (Online + Offline Dexie)
  const loadData = async () => {
    if (navigator.onLine) {
      try {
        const res = await safeFetch(`${API_BASE}/api/orders/ready-for-delivery`);
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); }
    }
    
    // Check local DB for an active delivery (Offline resilience)
    const localActive = await db.orders.where('status').equals('OUT_FOR_DELIVERY').first();
    if (localActive) {
      setActiveOrder(localActive);
      setTracking(true);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. GPS Tracking Broadcast
  useEffect(() => {
    if (!tracking || !activeOrder) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (navigator.onLine) {
          socket.emit('rider:location', { orderId: activeOrder.id, lat: latitude, lng: longitude });
          setLastSent(new Date().toLocaleTimeString());
        }
      },
      (err) => console.error('[geo]', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [tracking, activeOrder]);

  // 3. Accept Delivery (Offline Resilient)
  const acceptDelivery = async (order) => {
    await db.orders.put({ 
      ...order, 
      status: 'OUT_FOR_DELIVERY', 
      _syncStatus: 'pending' 
    });
    
    await db.syncOutbox.add({
      mutationId: crypto.randomUUID(),
      type: 'UPDATE_STATUS',
      payload: { orderId: order.id, status: 'OUT_FOR_DELIVERY' },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    if (navigator.onLine) {
      await fetch(`${API_BASE}/api/orders/${order.id}/accept-delivery`, { method: 'POST' });
    }
    
    setActiveOrder({ ...order, status: 'OUT_FOR_DELIVERY' });
    setTracking(true);
  };

  // 4. QR Scanner Logic (Photo Capture for HTTP LAN)
  const handleFileCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; 
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const imageData = canvas.getContext('2d').getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code?.data) verifyDelivery(code.data);
        else alert("No QR code found. Try again.");
        
        URL.revokeObjectURL(url);
        setShowScanner(false);
      };
      img.src = url;
    } catch (err) { console.error(err); }
  };

  const verifyDelivery = async (scannedSyncId) => {
    // Verify it matches the active order
    if (scannedSyncId !== activeOrder.sync_id) {
      return alert("This QR code does not match the active order!");
    }

    await db.orders.update(activeOrder.id, { status: 'DELIVERED' });
    
    if (navigator.onLine) {
      await fetch(`${API_BASE}/api/orders/${activeOrder.id}/deliver`, { method: 'POST' });
    } else {
      await db.syncOutbox.add({
        mutationId: crypto.randomUUID(),
        type: 'UPDATE_STATUS',
        payload: { orderId: activeOrder.id, status: 'DELIVERED' },
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }
    
    alert('Delivery Confirmed! Waiting for customer rating.');
    setActiveOrder(null);
    setTracking(false);
    loadData();
  };

  return (
    <div className="min-h-screen bg-background p-4 font-['Source_Sans_Pro',sans-serif]">
      <header className="mb-6 flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-text flex items-center gap-2">
            <Truck size={28} className="text-primary" /> Rider Portal
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-orange-500' : 'bg-success'}`} />
            <p className="text-xs text-text-muted font-bold">{isOffline ? 'Offline Mode' : 'Online'}</p>
          </div>
        </div>
        <button onClick={() => { localStorage.clear(); navigate('/mobile'); }} className="p-2 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition">
          <LogOut size={20} />
        </button>
      </header>

      {!activeOrder ? (
        <>
          <h2 className="text-lg font-bold mb-4">Ready for Delivery ({orders.length})</h2>
          {orders.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Truck size={64} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">No orders ready for delivery</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map(order => (
                <div key={order.id} className="bg-surface p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-lg">Order #{order.id}</h3>
                    <span className="font-bold text-primary">₱{order.total}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-text-muted mb-3">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
                    <span className="line-clamp-2">{order.delivery_address}</span>
                  </div>
                  <button onClick={() => acceptDelivery(order)} className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover">
                    Accept Delivery
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-lg max-w-md mx-auto">
          <h2 className="text-xl font-black mb-4 text-center">Delivering Order #{activeOrder.id}</h2>
          
          <div className="flex items-start gap-2 text-text-muted mb-6 p-3 bg-background rounded-lg border border-border">
            <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
            <span>{activeOrder.delivery_address}</span>
          </div>
          
          <button onClick={() => setTracking(!tracking)} className={`w-full py-3 font-bold rounded-xl mb-3 flex items-center justify-center gap-2 transition ${tracking ? 'bg-danger text-white' : 'bg-success text-white'}`}>
            <Navigation size={18} /> {tracking ? 'Stop GPS Tracking' : 'Start GPS Tracking'}
          </button>
          {lastSent && <p className="text-xs text-center text-text-muted mb-3">Location sent: {lastSent}</p>}

          <button onClick={() => setShowScanner(true)} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md">
            <QrCode size={20} /> Scan Customer QR to Deliver
          </button>

          {showScanner && (
            <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
              <button onClick={() => setShowScanner(false)} className="absolute top-6 right-6 text-white hover:text-gray-300"><X size={32} /></button>
              <Camera size={64} className="text-white mb-6 animate-pulse" />
              <h3 className="text-2xl font-bold text-white mb-2">Scan Customer's QR</h3>
              <p className="text-gray-400 mb-6 text-center max-w-xs">Tap below to open your phone's camera and snap a photo of the customer's QR code.</p>
              
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileCapture} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="bg-primary text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-primary-hover transition">
                Open Camera
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}