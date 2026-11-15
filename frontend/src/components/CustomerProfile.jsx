// frontend/src/components/CustomerProfile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './ui/Modal';
import { ShoppingBag, Star, LogOut, ArrowLeft } from 'lucide-react';
import { API_BASE } from '../config/api';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('burger_user');
    if (!savedUser) return navigate('/store');
    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);
    
    fetch(`${API_BASE}/api/auth/orders/${parsedUser.id}`)
      .then(res => res.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('burger_user');
    localStorage.removeItem('burger_token');
    navigate('/');
  };

  const submitReview = async () => {
    await fetch(`${API_BASE}/api/reviews`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: selectedOrder.id, customerId: user.id, rating, comment })
    });
    setIsReviewOpen(false);
    alert('Thank you for your feedback!');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background font-['Source_Sans_Pro',sans-serif] pb-20">
      <header className="bg-surface border-b border-border text-text p-6 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-text">My Profile</h1>
          <p className="text-sm text-text-muted mt-1">{user.email}</p>
        </div>
        <button onClick={() => navigate('/store')} className="text-sm bg-background border border-border text-text px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Store
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-6 mt-4 space-y-6">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-text">{user.name}</h2>
              <p className="text-sm text-text-muted">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-danger font-bold text-sm bg-danger/10 px-4 py-2 rounded-lg hover:bg-danger/20 transition flex items-center gap-2">
            <LogOut size={16} /> Logout
          </button>
        </div>

        <h2 className="text-2xl font-black text-text">Order History</h2>
        {orders.length === 0 ? (
          <div className="bg-surface p-10 rounded-2xl text-center border border-border">
            <ShoppingBag size={48} className="mx-auto mb-4 text-text-muted opacity-50" />
            <p className="text-text-muted font-bold">No orders yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-black text-xl text-text">Order #{order.id}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      order.status === 'RECEIVED' || order.status === 'DELIVERED' ? 'bg-success/10 text-success' : 'bg-orange-500/10 text-orange-500'
                    }`}>{order.status}</span>
                  </div>
                  <p className="text-sm text-text-muted">{new Date(order.created_at).toLocaleDateString()} • {order.items.length} items</p>
                  <p className="text-lg font-black text-text mt-1">₱{order.total}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => navigate(`/track/${order.id}`)} className="flex-1 sm:flex-none bg-background border border-border text-text font-bold px-4 py-2 rounded-xl hover:bg-gray-100 transition text-center">Track</button>
                  {order.status === 'RECEIVED' && (
                    <button onClick={() => { setSelectedOrder(order); setIsReviewOpen(true); }} className="flex-1 sm:flex-none bg-primary text-white font-bold px-4 py-2 rounded-xl hover:bg-primary-hover transition text-center">Review</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} title={`Review Order #${selectedOrder?.id}`}>
        <div className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)} className={`transition transform hover:scale-110 ${star <= rating ? 'text-orange-500' : 'text-gray-300'}`}>
                <Star size={32} fill={star <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="How was your food?" className="w-full border border-border p-3 rounded-lg bg-background text-text focus:bg-surface transition outline-none focus:ring-2 focus:ring-primary" rows="3" />
          <button onClick={submitReview} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-hover transition">Submit Review</button>
        </div>
      </Modal>
    </div>
  );
}