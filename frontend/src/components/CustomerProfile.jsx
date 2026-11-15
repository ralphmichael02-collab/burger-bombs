import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './ui/Modal';
import { ShoppingBag, Star, LogOut, ArrowLeft } from 'lucide-react';

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
    fetch(`${import.meta.env.VITE_API_BASE}/api/auth/orders/${parsedUser.id}`)
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
    await fetch(`${import.meta.env.VITE_API_BASE}/api/reviews`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: selectedOrder.id, customerId: user.id, rating, comment })
    });
    setIsReviewOpen(false);
    alert('Thank you for your feedback!');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-['Source_Sans_Pro',sans-serif] pb-20">
      <header className="bg-[#1A1C23] text-white p-6 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">My Profile</h1>
          <p className="text-sm text-gray-400 mt-1">{user.email}</p>
        </div>
        <button onClick={() => navigate('/store')} className="text-sm bg-white/10 px-4 py-2 rounded-lg font-bold hover:bg-white/20 transition flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Store
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-6 mt-4 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#EA580C]/10 text-[#EA580C] rounded-full flex items-center justify-center text-2xl font-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1A1C23]">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-[#EA001E] font-bold text-sm bg-red-50 px-4 py-2 rounded-lg hover:bg-red-100 transition flex items-center gap-2">
            <LogOut size={16} /> Logout
          </button>
        </div>

        <h2 className="text-2xl font-black text-[#1A1C23]">Order History</h2>
        {orders.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl text-center border border-gray-200">
            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-bold">No orders yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-black text-xl text-[#1A1C23]">Order #{order.id}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      order.status === 'RECEIVED' || order.status === 'DELIVERED' ? 'bg-[#45C65A]/10 text-[#45C65A]' : 'bg-[#FE9339]/10 text-[#FE9339]'
                    }`}>{order.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()} • {order.items.length} items</p>
                  <p className="text-lg font-black text-[#1A1C23] mt-1">₱{order.total}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/track/${order.id}`)} className="bg-gray-50 text-[#1A1C23] font-bold px-4 py-2 rounded-xl hover:bg-gray-100 transition">Track</button>
                  {order.status === 'RECEIVED' && (
                    <button onClick={() => { setSelectedOrder(order); setIsReviewOpen(true); }} className="bg-[#EA580C] text-white font-bold px-4 py-2 rounded-xl hover:bg-[#C2410C] transition">Review</button>
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
              <button key={star} onClick={() => setRating(star)} className={`transition transform hover:scale-110 ${star <= rating ? 'text-[#FE9339]' : 'text-gray-200'}`}>
                <Star size={32} fill={star <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="How was your food?" className="w-full border border-gray-200 p-3 rounded-lg bg-gray-50 focus:bg-white transition" rows="3" />
          <button onClick={submitReview} className="w-full bg-[#EA580C] text-white font-bold py-3 rounded-lg hover:bg-[#C2410C] transition">Submit Review</button>
        </div>
      </Modal>
    </div>
  );
}