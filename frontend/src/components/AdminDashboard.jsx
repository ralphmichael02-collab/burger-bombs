// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Detect if we are running on Localhost/EnvKit or Vercel Cloud
  const isLocal = window.location.hostname.includes('.test') || window.location.hostname.includes('localhost');

  const fetchData = () => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/stats`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      });
      
    fetch(`${import.meta.env.VITE_API_BASE}/api/ingredients`)
      .then(res => res.json())
      .then(resData => setIngredients(Array.isArray(resData) ? resData : []));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRestock = async (id, currentStock) => {
    const amount = prompt("How many units are you adding?");
    if (!amount || isNaN(amount)) return;
    
    await fetch(`${import.meta.env.VITE_API_BASE}/api/ingredients/${id}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseInt(amount) })
    });
    fetchData();
  };

  if (loading) return <div className="p-10 text-center text-xl">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Admin Management</h1>
            <p className="text-gray-500">{isLocal ? 'Local Store (Master Control)' : 'Cloud Store (Read Only)'}</p>
          </div>
          <div className="flex bg-white rounded-lg shadow-sm p-1">
            {['overview', 'inventory', 'menu'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-md font-bold capitalize transition ${activeTab === tab ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && data && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-bold text-gray-400 uppercase">Total Revenue</p>
                <p className="text-4xl font-black text-green-600">₱{data.metrics.total_sales.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-bold text-gray-400 uppercase">Total Orders</p>
                <p className="text-4xl font-black text-gray-900">{data.metrics.total_orders}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b"><h2 className="font-bold text-xl">Recent Orders</h2></div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-sm text-gray-500">
                  <tr><th className="p-4">ID</th><th className="p-4">Type</th><th className="p-4">Status</th><th className="p-4 text-right">Total</th></tr>
                </thead>
                <tbody>
                  {data.recentOrders.map(o => (
                    <tr key={o.id} className="border-b">
                      <td className="p-4">#{o.id}</td>
                      <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{o.order_type}</span></td>
                      <td className="p-4">{o.status}</td>
                      <td className="p-4 text-right font-bold">₱{o.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="font-bold text-xl">Inventory Management</h2>
                <p className="text-sm text-gray-500">Only the Local Store can restock ingredients.</p>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-sm text-gray-500">
                <tr><th className="p-4">Ingredient</th><th className="p-4">Stock</th><th className="p-4 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {ingredients.map(ing => (
                  <tr key={ing.id} className="border-b">
                    <td className="p-4 font-bold">{ing.name}</td>
                    <td className="p-4">{ing.stock} {ing.unit}</td>
                    <td className="p-4 text-right">
                      {isLocal ? (
                        <button onClick={() => handleRestock(ing.id, ing.stock)} className="bg-green-600 text-white px-4 py-2 rounded font-bold text-sm">Restock</button>
                      ) : (
                        <span className="text-gray-400 text-sm italic">Cloud View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}