// frontend/src/components/RiderPortal.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Truck, MapPin, CheckCircle, Navigation, LogOut } from 'lucide-react';

const socket = io(window.location.origin, { transports: ['polling', 'websocket'], reconnection: true });

export default function RiderPortal() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/ready-for-delivery');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!tracking || !activeOrder) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        socket.emit('rider:location', {
          orderId: activeOrder.id,
          lat: latitude,
          lng: longitude,
          timestamp: new Date().toISOString(),
        });
        setLastSent(new Date().toLocaleTimeString());
      },
      (err) => console.error('[geo]', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [tracking, activeOrder]);

  const markDelivered = async () => {
    try {
      await fetch(`/api/orders/${activeOrder.id}/deliver`, { method: 'POST' });
      setActiveOrder(null);
      setTracking(false);
      fetchOrders();
    } catch (err) { alert('Failed to mark delivered'); }
  };

  return (
    <div className="min-h-screen bg-background p-4 font-['Source_Sans_Pro',sans-serif]">
      <header className="mb-6 flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-text flex items-center gap-2">
            <Truck size={28} className="text-primary" /> Rider Portal
          </h1>
          <p className="text-sm text-text-muted">Deliver orders to customers</p>
        </div>
        <button onClick={() => navigate('/mobile')} className="p-2 text-danger bg-danger/10 rounded-lg hover:bg-danger/20">
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
                    <span>{order.delivery_address || 'No address provided'}</span>
                  </div>
                  <button onClick={() => setActiveOrder(order)} className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover">
                    Start Delivery
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-lg max-w-md mx-auto">
          <h2 className="text-xl font-black mb-4">Delivering Order #{activeOrder.id}</h2>
          <div className="flex items-start gap-2 text-text-muted mb-4 p-3 bg-background rounded-lg">
            <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
            <span>{activeOrder.delivery_address || 'No address'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-background p-3 rounded-lg text-center">
              <p className="text-xs text-text-muted uppercase">Total</p>
              <p className="text-xl font-black">₱{activeOrder.total}</p>
            </div>
            <div className="bg-background p-3 rounded-lg text-center">
              <p className="text-xs text-text-muted uppercase">Items</p>
              <p className="text-xl font-black">{activeOrder.items.length}</p>
            </div>
          </div>

          <button
            onClick={() => setTracking(!tracking)}
            className={`w-full py-3 font-bold rounded-xl mb-3 ${tracking ? 'bg-danger text-white' : 'bg-success text-white'}`}
          >
            <Navigation size={18} className="inline mr-2" />
            {tracking ? 'Stop GPS Tracking' : 'Start GPS Tracking'}
          </button>
          {lastSent && <p className="text-xs text-center text-text-muted mb-3">Location sent: {lastSent}</p>}

          <button onClick={markDelivered} className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-hover flex items-center justify-center gap-2">
            <CheckCircle size={20} /> Mark as Delivered
          </button>
        </div>
      )}
    </div>
  );
}