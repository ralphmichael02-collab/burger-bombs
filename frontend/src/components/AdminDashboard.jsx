// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/stats`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load stats", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-10 text-center text-xl text-gray-500">Loading Dashboard...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">Failed to load data. Is the backend running?</div>;

  const { metrics, recentOrders, lowStock } = data;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500">Burger Bombs Management System</p>
          </div>
          <button onClick={fetchStats} className="bg-black text-white px-4 py-2 rounded-lg font-bold">
            Refresh Data
          </button>
        </header>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Revenue</p>
            <p className="text-4xl font-black text-green-600">₱{metrics.total_sales.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Orders</p>
            <p className="text-4xl font-black text-gray-900">{metrics.total_orders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">POS Orders</p>
            <p className="text-4xl font-black text-blue-600">{metrics.pos_orders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Online Orders</p>
            <p className="text-4xl font-black text-purple-600">{metrics.online_orders}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* RECENT ORDERS TABLE */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Recent Transactions</h2>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-bold">Order ID</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium">#{order.id}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.order_type === 'ONLINE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.order_type}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{order.status}</td>
                    <td className="p-4 text-right font-bold text-gray-800">₱{order.total}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-500">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* LOW STOCK ALERTS */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <div className="p-6 border-b border-red-200 bg-red-50">
              <h2 className="text-xl font-bold text-red-700">Low Stock Alerts</h2>
              <p className="text-sm text-red-500 mt-1">Restock required soon.</p>
            </div>
            <ul className="p-4 space-y-4">
              {lowStock.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div>
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">Warning Level: {item.low_stock} {item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-red-600 text-lg">{item.stock} {item.unit}</p>
                  </div>
                </li>
              ))}
              {lowStock.length === 0 && (
                <li className="text-center text-gray-500 py-6">All ingredients are well stocked!</li>
              )}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}