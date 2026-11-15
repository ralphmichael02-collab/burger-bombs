// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Modal from './ui/Modal';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Burgers' }, { id: 2, name: 'Combos' }, { id: 3, name: 'Sides' }, { id: 4, name: 'Drinks' }, { id: 5, name: 'Desserts' }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [ingredients, setIngredients] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [settings, setSettings] = useState(null);

  // Recipe / BOM State
  const [selectedRecipeItem, setSelectedRecipeItem] = useState(null);
  const [recipeIngredients, setRecipeIngredients] = useState({});

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'delete'
  const [selectedItem, setSelectedItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const isLocal = window.location.hostname.includes('.test') || window.location.hostname.includes('localhost');

  const fetchData = () => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/stats`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(console.error);
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/chart-data`).then(r => r.json()).then(d => setChartData(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu`).then(r => r.json()).then(d => setMenuItems(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${import.meta.env.VITE_API_BASE}/api/ingredients`).then(r => r.json()).then(d => setIngredients(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/pending-payments`).then(r => r.json()).then(d => setPendingPayments(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`).then(r => r.json()).then(d => setSettings(d)).catch(console.error);
    
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setCategories(d); else setCategories(DEFAULT_CATEGORIES); })
      .catch(() => setCategories(DEFAULT_CATEGORIES));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- RECIPE LOGIC ---
  const loadRecipe = async (item) => {
    setSelectedRecipeItem(item);
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${item.id}/recipe`);
    const recipe = await res.json();
    const recipeMap = {};
    recipe.forEach(r => { 
      if (r.ingredient_id) recipeMap[`ing_${r.ingredient_id}`] = r.quantity;
      if (r.component_menu_item_id) recipeMap[`comp_${r.component_menu_item_id}`] = r.quantity;
    });
    setRecipeIngredients(recipeMap);
  };

  const handleRecipeChange = (key, qty) => setRecipeIngredients(prev => ({ ...prev, [key]: parseFloat(qty) || 0 }));

  const saveRecipe = async () => {
    if (!isLocal) return alert("Only the local store can edit recipes.");
    const payload = Object.keys(recipeIngredients).map(key => {
      const [type, id] = key.split('_');
      return { ingredient_id: type === 'ing' ? parseInt(id) : null, component_menu_item_id: type === 'comp' ? parseInt(id) : null, quantity: recipeIngredients[key] };
    }).filter(p => p.quantity > 0);

    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedRecipeItem.id}/recipe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients: payload })
    });
    alert("Recipe saved successfully!");
    setSelectedRecipeItem(null);
  };

  // --- MENU LOGIC ---
  const handleRestock = async (id) => {
    const amount = prompt("How many units are you adding?");
    if (!amount || isNaN(amount)) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/ingredients/${id}/restock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseInt(amount) }) });
    fetchData();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      if (cloudRes.ok) { const data = await cloudRes.json(); setSelectedItem(prev => ({ ...prev, image_url: data.secure_url })); } else throw new Error();
    } catch (err) {
      const localFormData = new FormData(); localFormData.append('image', file);
      const localRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/upload-local`, { method: 'POST', body: localFormData });
      const data = await localRes.json(); if (data.url) setSelectedItem(prev => ({ ...prev, image_url: data.url }));
    } finally { setIsUploading(false); }
  };

  const openModal = (mode, item = null) => {
    setModalMode(mode);
    setSelectedItem(item || { name: '', price: '', cost: '', category: categories[0]?.name || 'Burgers', image_url: '' });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!isLocal) return alert("Only local store can modify items.");
    const url = modalMode === 'edit' ? `${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedItem.id}` : `${import.meta.env.VITE_API_BASE}/api/admin/menu`;
    await fetch(url, { method: modalMode === 'edit' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selectedItem, price: parseFloat(selectedItem.price), cost: parseFloat(selectedItem.cost) }) });
    setIsModalOpen(false); fetchData();
  };

  const handleDeleteItem = async () => {
    if (!isLocal) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedItem.id}`, { method: 'DELETE' });
    setIsModalOpen(false); fetchData();
  };

  // --- CATEGORY LOGIC ---
  const handleAddCategory = async (e) => {
    e.preventDefault(); const name = e.target.categoryName.value.trim(); if (!name) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (res.ok) { e.target.reset(); fetchData(); } else { const d = await res.json(); alert(d.error); }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData(); else { const d = await res.json(); alert(d.error); }
  };

  // --- VERIFY PAYMENT LOGIC ---
  const handleVerifyPayment = async (orderId) => {
    if (!window.confirm("Are you sure you received the payment? This will send the order to the kitchen.")) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/verify-payment`, { method: 'POST' });
    fetchData();
    alert("Payment verified! Order sent to Kitchen.");
  };

  const handleLogout = () => { localStorage.removeItem('burger_admin_auth'); navigate('/admin/login'); };

  if (loading) return <div className="h-screen flex items-center justify-center bg-theme-main text-accent font-bold text-xl">Loading Enterprise Dashboard...</div>;

  return (
    <div className="min-h-screen flex bg-theme-main font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-theme-sidebar border-r border-slate-200 flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">🍔</div>
          <div>
            <h1 className="font-black text-theme-primary leading-tight">Burger Bombs</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Suite</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'payments', label: 'Payments', icon: '💳', badge: pendingPayments.length },
            { id: 'menu', label: 'Menu Editor', icon: '🍔' },
            { id: 'inventory', label: 'Inventory', icon: '📦' },
            { id: 'recipes', label: 'Recipes', icon: '👨‍🍳' },
            { id: 'categories', label: 'Categories', icon: '📁' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all
                ${activeTab === item.id ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}>
              <div className="flex items-center gap-3"><span>{item.icon}</span> {item.label}</div>
              {item.badge > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4">
          <button onClick={handleLogout} className="w-full py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition text-sm">Logout</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-theme-primary capitalize">{activeTab}</h1>
            <p className="text-theme-secondary font-medium mt-1">Manage your restaurant operations.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <span className="text-sm font-bold text-slate-600">System Online</span>
          </div>
        </header>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && data && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-theme-card p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gross Revenue</p>
                <p className="text-3xl font-black text-theme-primary">₱{data.metrics.total_sales.toLocaleString()}</p>
              </div>
              <div className="bg-theme-card p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ingredient Cost</p>
                <p className="text-3xl font-black text-red-500">-₱{(data.metrics.total_cost || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg relative overflow-hidden text-white transform hover:scale-[1.02] transition cursor-default">
                <p className="text-xs font-bold text-green-100 uppercase tracking-wider mb-2">Net Profit</p>
                <p className="text-3xl font-black">₱{(data.metrics.net_profit || 0).toLocaleString()}</p>
              </div>
              <div className="bg-theme-card p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Orders</p>
                <p className="text-3xl font-black text-theme-primary">{data.metrics.total_orders}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-theme-card p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="font-bold text-lg text-theme-primary mb-6">Sales Trend (7 Days)</h2>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} tickFormatter={(v) => `₱${v}`} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="daily_sales" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-theme-card rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100"><h2 className="font-bold text-lg text-theme-primary">Recent Orders</h2></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {data.recentOrders.map(o => (
                    <div key={o.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                      <div>
                        <p className="font-bold text-theme-primary">#{o.id} <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{o.order_type}</span></p>
                        <p className="text-xs text-slate-500 mt-0.5">{o.ip_address || 'Local'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-theme-primary">₱{o.total}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          o.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-700' : 
                          o.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                        }`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PAYMENTS TAB --- */}
        {activeTab === 'payments' && (
          <div className="bg-theme-card rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 bg-amber-50">
              <h2 className="font-bold text-xl text-amber-800">Pending Payment Verifications</h2>
              <p className="text-sm text-amber-600 mt-1">Verify the GCash/Maya reference before sending to kitchen.</p>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr><th className="p-4">Order</th><th className="p-4">Method</th><th className="p-4">Ref #</th><th className="p-4">Total</th><th className="p-4 text-right">Action</th></tr>
              </thead>
              <tbody>
                {pendingPayments.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-bold">No pending payments.</td></tr>
                ) : pendingPayments.map(o => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold text-theme-primary">#{o.id}</td>
                    <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{o.payment_method}</span></td>
                    <td className="p-4 font-mono text-sm text-slate-600">{o.payment_reference || 'N/A'}</td>
                    <td className="p-4 font-black">₱{o.total}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleVerifyPayment(o.id)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-sm">Verify Payment</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- MENU TAB --- */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-theme-primary">Menu Catalog</h2>
              <button onClick={() => openModal('add')} className="bg-accent text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-accent-hover transition flex items-center gap-2">
                <span>+</span> Add Menu Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map(item => (
                <div key={item.id} className="bg-theme-card rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-lg transition">
                  <div className="h-40 overflow-hidden relative">
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full bg-slate-200" />}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-black text-slate-800 uppercase shadow-sm">{item.category}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-theme-primary leading-tight">{item.name}</h3>
                      <span className="font-black text-accent">₱{item.price}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => openModal('edit', item)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-sm transition">Edit</button>
                      <button onClick={() => openModal('delete', item)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-lg text-sm transition">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- INVENTORY TAB --- */}
        {activeTab === 'inventory' && (
          <div className="bg-theme-card rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-500">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr><th className="p-4">Ingredient</th><th className="p-4">Current Stock</th><th className="p-4 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {ingredients.map(ing => (
                  <tr key={ing.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold text-theme-primary">{ing.name}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-lg text-sm font-bold ${ing.stock <= ing.low_stock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{ing.stock} {ing.unit}</span></td>
                    <td className="p-4 text-right">
                      {isLocal ? <button onClick={() => handleRestock(ing.id)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-black transition">Restock</button> : <span className="text-gray-400 text-sm italic">Cloud View Only</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- RECIPES TAB --- */}
        {activeTab === 'recipes' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            <div className="bg-theme-card p-4 rounded-2xl shadow-sm border border-slate-100 h-[calc(100vh-140px)] overflow-y-auto">
              <h2 className="font-bold text-lg mb-4 text-theme-primary sticky top-0 bg-white pb-2">Menu Items</h2>
              <div className="space-y-2">
                {menuItems.map(item => (
                  <button key={item.id} onClick={() => loadRecipe(item)} className={`w-full text-left p-3 rounded-xl border font-bold transition ${selectedRecipeItem?.id === item.id ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' : 'border-slate-100 hover:bg-slate-50'}`}>{item.name}</button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 bg-theme-card p-8 rounded-2xl shadow-sm border border-slate-100">
              {!selectedRecipeItem ? (
                <div className="text-center text-slate-400 py-32 font-bold text-xl">Select a menu item to build its recipe.</div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                    <h2 className="font-black text-3xl text-theme-primary">Recipe: {selectedRecipeItem.name}</h2>
                    <button onClick={saveRecipe} disabled={!isLocal} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-md">Save Recipe</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2"><span>🥩</span> Raw Ingredients</h3>
                      <div className="space-y-3">
                        {ingredients.map(ing => (
                          <div key={`ing_${ing.id}`} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                            <div><span className="font-bold text-slate-800">{ing.name}</span><span className="text-xs text-slate-500 ml-2">({ing.unit})</span></div>
                            <input type="number" step="0.01" disabled={!isLocal} value={recipeIngredients[`ing_${ing.id}`] || ''} onChange={(e) => handleRecipeChange(`ing_${ing.id}`, e.target.value)} placeholder="0" className="w-24 border-slate-200 border p-2 rounded-lg text-right font-bold focus:ring-2 focus:ring-accent outline-none" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2"><span>🍟</span> Combo Components</h3>
                      <div className="space-y-3">
                        {menuItems.filter(m => m.id !== selectedRecipeItem.id).map(comp => (
                          <div key={`comp_${comp.id}`} className="flex items-center justify-between p-4 border border-blue-100 rounded-xl bg-blue-50 hover:bg-blue-100 transition">
                            <div><span className="font-bold text-slate-800">{comp.name}</span><span className="text-xs text-blue-500 ml-2">(Menu Item)</span></div>
                            <input type="number" step="1" disabled={!isLocal} value={recipeIngredients[`comp_${comp.id}`] || ''} onChange={(e) => handleRecipeChange(`comp_${comp.id}`, e.target.value)} placeholder="0" className="w-24 border-blue-200 border p-2 rounded-lg text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* --- CATEGORIES TAB --- */}
        {activeTab === 'categories' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="bg-theme-card p-8 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="font-bold text-2xl mb-6 text-theme-primary">Add New Category</h2>
              <form onSubmit={handleAddCategory} className="flex gap-4">
                <input name="categoryName" required disabled={!isLocal} placeholder="e.g. Tacos, Pasta, Coffee" className="flex-1 border-slate-200 border p-4 rounded-xl bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" />
                <button type="submit" disabled={!isLocal} className="bg-accent text-white px-8 font-bold rounded-xl hover:bg-accent-hover transition shadow-md disabled:opacity-50">Add</button>
              </form>
            </div>

            <div className="bg-theme-card rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50"><h2 className="font-bold text-xl text-theme-primary">Manage Categories</h2></div>
              <ul>
                {categories.map(cat => (
                  <li key={cat.id} className="flex justify-between items-center p-5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                    <span className="font-bold text-slate-800 text-lg">{cat.name}</span>
                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} disabled={!isLocal} className="text-red-500 bg-red-50 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition disabled:opacity-50">Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && settings && (
          <div className="bg-theme-card p-10 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
              <div>
                <h2 className="font-black text-3xl text-theme-primary">Store Customization</h2>
                <p className="text-slate-500 font-medium mt-1">White-label the app for your restaurant brand.</p>
              </div>
              {!isLocal && <span className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl text-sm font-bold">Cloud View Only</span>}
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault(); if (!isLocal) return alert("Only local store can edit settings.");
              await fetch(`${import.meta.env.VITE_API_BASE}/api/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
              alert("Settings saved! Refresh the homepage to see the changes.");
            }} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-sm font-bold text-slate-600">Restaurant Name</label><input required disabled={!isLocal} value={settings.restaurant_name} onChange={e => setSettings({...settings, restaurant_name: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
                <div><label className="text-sm font-bold text-slate-600">Tagline</label><input required disabled={!isLocal} value={settings.tagline} onChange={e => setSettings({...settings, tagline: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-slate-600">Brand URL (Subdomain)</label>
                  <div className="flex items-center mt-2">
                    <input disabled={!isLocal} value={settings.brand_url || ''} onChange={e => setSettings({...settings, brand_url: e.target.value})} className="flex-1 border-slate-200 border p-3 rounded-l-xl bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" placeholder="burger-bombs" />
                    <span className="bg-slate-200 border border-l-0 border-slate-200 p-3 rounded-r-xl text-slate-500 font-bold text-sm">.vercel.app</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">This is how your store link will appear.</p>
                </div>
                <div><label className="text-sm font-bold text-slate-600">Hero Title</label><input required disabled={!isLocal} value={settings.hero_title} onChange={e => setSettings({...settings, hero_title: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-sm font-bold text-slate-600">Hero Subtitle</label><input required disabled={!isLocal} value={settings.hero_subtitle} onChange={e => setSettings({...settings, hero_subtitle: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
                <div><label className="text-sm font-bold text-slate-600">Promo Banner Text</label><input disabled={!isLocal} value={settings.promo_banner_text || ''} onChange={e => setSettings({...settings, promo_banner_text: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              {/* THEME COLOR PICKERS */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="text-sm font-bold text-slate-600">Primary Theme Color</label>
                  <div className="flex items-center gap-3 mt-2">
                    <input type="color" disabled={!isLocal} value={settings.theme_primary_color || '#ea580c'} onChange={e => setSettings({...settings, theme_primary_color: e.target.value})} className="w-12 h-12 rounded cursor-pointer border-0 p-1 bg-white shadow-sm" />
                    <input type="text" disabled={!isLocal} value={settings.theme_primary_color || '#ea580c'} onChange={e => setSettings({...settings, theme_primary_color: e.target.value})} className="flex-1 border-slate-200 border p-3 rounded-xl bg-white focus:bg-white transition font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-600">Background Color</label>
                  <div className="flex items-center gap-3 mt-2">
                    <input type="color" disabled={!isLocal} value={settings.theme_bg_color || '#f8fafc'} onChange={e => setSettings({...settings, theme_bg_color: e.target.value})} className="w-12 h-12 rounded cursor-pointer border-0 p-1 bg-white shadow-sm" />
                    <input type="text" disabled={!isLocal} value={settings.theme_bg_color || '#f8fafc'} onChange={e => setSettings({...settings, theme_bg_color: e.target.value})} className="flex-1 border-slate-200 border p-3 rounded-xl bg-white focus:bg-white transition font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-sm font-bold text-slate-600">Logo URL</label><input disabled={!isLocal} value={settings.logo_url || ''} onChange={e => setSettings({...settings, logo_url: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" placeholder="https://..." /></div>
                <div><label className="text-sm font-bold text-slate-600">Hero Image URL</label><input disabled={!isLocal} value={settings.hero_image_url || ''} onChange={e => setSettings({...settings, hero_image_url: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" placeholder="https://..." /></div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div><label className="text-sm font-bold text-slate-600">Currency</label><input required disabled={!isLocal} value={settings.currency_symbol} onChange={e => setSettings({...settings, currency_symbol: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
                <div><label className="text-sm font-bold text-slate-600">Tax Rate</label><input required type="number" step="0.01" disabled={!isLocal} value={settings.tax_rate} onChange={e => setSettings({...settings, tax_rate: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-sm font-bold text-slate-600">Contact Phone</label><input disabled={!isLocal} value={settings.contact_phone || ''} onChange={e => setSettings({...settings, contact_phone: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
                <div><label className="text-sm font-bold text-slate-600">Contact Email</label><input disabled={!isLocal} value={settings.contact_email || ''} onChange={e => setSettings({...settings, contact_email: e.target.value})} className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-600">About Us Text</label>
                <textarea disabled={!isLocal} value={settings.about_text || ''} onChange={e => setSettings({...settings, about_text: e.target.value})} rows="3" className="w-full border-slate-200 border p-3 rounded-xl mt-2 bg-slate-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-accent" />
              </div>

              <button type="submit" disabled={!isLocal} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition disabled:opacity-50 shadow-lg mt-4">Save Settings</button>
            </form>
          </div>
        )}

      </main>

      {/* --- GLOBAL MODAL --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'delete' ? 'Confirm Deletion' : modalMode === 'edit' ? 'Edit Menu Item' : 'Add New Item'}
        variant={modalMode === 'delete' ? 'danger' : 'info'}
      >
        {modalMode === 'delete' ? (
          <div>
            <p className="text-slate-600 mb-6">Are you sure you want to delete <b>{selectedItem?.name}</b>? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
              <button onClick={handleDeleteItem} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md">Yes, Delete</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Item Name</label>
              <input required value={selectedItem?.name || ''} onChange={e => setSelectedItem({...selectedItem, name: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl mt-1 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-accent outline-none transition" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Price (₱)</label>
                <input required type="number" step="0.01" value={selectedItem?.price || ''} onChange={e => setSelectedItem({...selectedItem, price: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl mt-1 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-accent outline-none transition" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Cost (₱)</label>
                <input required type="number" step="0.01" value={selectedItem?.cost || ''} onChange={e => setSelectedItem({...selectedItem, cost: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl mt-1 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-accent outline-none transition" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
              <select value={selectedItem?.category || ''} onChange={e => setSelectedItem({...selectedItem, category: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl mt-1 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-accent outline-none transition">
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Image Upload</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full mt-2 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
              {selectedItem?.image_url && <img src={selectedItem.image_url} alt="Preview" className="w-full h-32 object-cover rounded-xl mt-3 shadow-sm" />}
            </div>
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
              <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition shadow-md disabled:opacity-50">
                {isUploading ? 'Uploading...' : 'Save Item'}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}