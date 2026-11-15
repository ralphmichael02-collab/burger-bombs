// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  LayoutDashboard, CreditCard, Users, Utensils, Package, ChefHat, Folder, Settings, 
  LogOut, Plus, TrendingUp, DollarSign, ShoppingBag, AlertTriangle, CheckCircle,
  Pencil, Trash2, Globe, Store, ScanLine, Beef, Edit3
} from 'lucide-react';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Burgers' }, { id: 2, name: 'Combos' }, { id: 3, name: 'Sides' }, { id: 4, name: 'Drinks' }, { id: 5, name: 'Desserts' }
];

const THEME_PRESETS = [
  { name: 'Classic Burger', primary: '#ea580c', bg: '#f8fafc', text: '#0f172a', card: '#ffffff' },
  { name: 'Midnight Slate', primary: '#3b82f6', bg: '#0f172a', text: '#f8fafc', card: '#1e293b' },
  { name: 'Fresh Bistro', primary: '#10b981', bg: '#f0fdf4', text: '#064e3b', card: '#ffffff' },
  { name: 'Elegant Diner', primary: '#be123c', bg: '#fff1f2', text: '#4c0519', card: '#ffffff' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
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
  
  // CRM States
  const [customers, setCustomers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);

  // Recipe / BOM State
  const [selectedRecipeItem, setSelectedRecipeItem] = useState(null);
  const [recipeIngredients, setRecipeIngredients] = useState({});

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
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
    
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/customers`).then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/reviews`).then(r => r.json()).then(d => setReviews(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${import.meta.env.VITE_API_BASE}/api/auth/live-feed`).then(r => r.json()).then(d => setLiveFeed(Array.isArray(d) ? d : [])).catch(console.error);
    
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

  const updateTheme = (newSettings) => {
    document.documentElement.style.setProperty('--theme-primary', newSettings.theme_primary_color);
    document.documentElement.style.setProperty('--theme-bg', newSettings.theme_bg_color);
    document.documentElement.style.setProperty('--theme-text', newSettings.theme_text_color);
    document.documentElement.style.setProperty('--theme-card', newSettings.theme_card_color);
  };

  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      if (cloudRes.ok) { const data = await cloudRes.json(); setSelectedItem(prev => ({ ...prev, image_url: data.secure_url })); addToast("Image uploaded!", 'success'); } else throw new Error();
    } catch (err) {
      const localFormData = new FormData(); localFormData.append('image', file);
      const localRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/upload-local`, { method: 'POST', body: localFormData });
      const data = await localRes.json(); if (data.url) { setSelectedItem(prev => ({ ...prev, image_url: data.url })); addToast("Image saved locally.", 'warning'); }
    } finally { setIsUploading(false); }
  };

  const handleSettingsImageUpload = async (e, field) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      if (cloudRes.ok) { 
        const data = await cloudRes.json(); 
        setSettings(prev => ({ ...prev, [field]: data.secure_url })); 
        addToast("Image uploaded successfully!", 'success'); 
      } else throw new Error();
    } catch (err) {
      const localFormData = new FormData(); localFormData.append('image', file);
      const localRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/upload-local`, { method: 'POST', body: localFormData });
      const data = await localRes.json(); 
      if (data.url) { 
        setSettings(prev => ({ ...prev, [field]: data.url })); 
        addToast("Image saved locally.", 'warning'); 
      }
    } finally { setIsUploading(false); }
  };

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
    if (!isLocal) return addToast("Only the local store can edit recipes.", 'error');
    const payload = Object.keys(recipeIngredients).map(key => {
      const [type, id] = key.split('_');
      return { ingredient_id: type === 'ing' ? parseInt(id) : null, component_menu_item_id: type === 'comp' ? parseInt(id) : null, quantity: recipeIngredients[key] };
    }).filter(p => p.quantity > 0);

    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedRecipeItem.id}/recipe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients: payload })
    });
    addToast("Recipe saved successfully!", 'success');
    setSelectedRecipeItem(null);
  };

  // --- MENU LOGIC ---
  const handleRestock = async (id) => {
    const amount = prompt("How many units are you adding?");
    if (!amount || isNaN(amount)) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/ingredients/${id}/restock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseInt(amount) }) });
    addToast(`Restocked ${amount} units.`, 'success');
    fetchData();
  };

  const openModal = (mode, item = null) => {
    setModalMode(mode);
    setSelectedItem(item || { name: '', price: '', cost: '', category: categories[0]?.name || 'Burgers', image_url: '' });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!isLocal) return addToast("Only local store can modify items.", 'error');
    const url = modalMode === 'edit' ? `${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedItem.id}` : `${import.meta.env.VITE_API_BASE}/api/admin/menu`;
    await fetch(url, { method: modalMode === 'edit' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selectedItem, price: parseFloat(selectedItem.price), cost: parseFloat(selectedItem.cost) }) });
    setIsModalOpen(false); 
    addToast(modalMode === 'edit' ? "Item updated!" : "Item added!", 'success');
    fetchData();
  };

  const handleDeleteItem = async () => {
    if (!isLocal) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedItem.id}`, { method: 'DELETE' });
    setIsModalOpen(false); 
    addToast("Item deleted.", 'success');
    fetchData();
  };

  // --- CATEGORY LOGIC ---
  const handleAddCategory = async (e) => {
    e.preventDefault(); const name = e.target.categoryName.value.trim(); if (!name) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (res.ok) { e.target.reset(); addToast("Category added!", 'success'); fetchData(); } else { const d = await res.json(); addToast(d.error, 'error'); }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok) { addToast("Category deleted.", 'success'); fetchData(); } else { const d = await res.json(); addToast(d.error, 'error'); }
  };

  // --- VERIFY PAYMENT LOGIC ---
  const handleVerifyPayment = async (orderId) => {
    if (!window.confirm("Are you sure you received the payment? This will send the order to the kitchen.")) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/verify-payment`, { method: 'POST' });
    addToast("Payment verified! Order sent to Kitchen.", 'success');
    fetchData();
  };

  const handleLogout = () => { 
    localStorage.removeItem('burger_admin_auth'); 
    localStorage.removeItem('staff_token'); 
    localStorage.removeItem('staff_user'); 
    navigate('/admin/login'); 
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-theme-main text-accent font-bold text-xl">Loading Enterprise Dashboard...</div>;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'payments', label: 'Payments', icon: CreditCard, badge: pendingPayments.length },
    { id: 'customers', label: 'Customers & CRM', icon: Users },
    { id: 'menu', label: 'Menu Editor', icon: Utensils },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'recipes', label: 'Recipes', icon: ChefHat },
    { id: 'categories', label: 'Categories', icon: Folder },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-theme-main font-sans transition-colors duration-300">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-theme-card border-r border-theme flex flex-col fixed h-full z-20 transition-colors duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-theme">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-md">
            <Beef size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-black text-theme-primary leading-tight">{settings?.restaurant_name || 'Burger Bombs'}</h1>
            <p className="text-xs font-bold text-theme-secondary uppercase tracking-wider">Admin Suite</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all
                  ${activeTab === item.id ? 'bg-accent text-white shadow-sm' : 'text-theme-secondary hover:bg-theme-main hover:text-theme-primary'}`}>
                <div className="flex items-center gap-3">
                  <Icon size={18} strokeWidth={2.5} />
                  {item.label}
                </div>
                {item.badge > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-theme">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 p-8 transition-colors duration-300">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-theme-primary capitalize flex items-center gap-3">
              {activeTab === 'overview' && <LayoutDashboard size={28} className="text-accent" />}
              {activeTab === 'payments' && <CreditCard size={28} className="text-accent" />}
              {activeTab === 'customers' && <Users size={28} className="text-accent" />}
              {activeTab === 'menu' && <Utensils size={28} className="text-accent" />}
              {activeTab === 'inventory' && <Package size={28} className="text-accent" />}
              {activeTab === 'recipes' && <ChefHat size={28} className="text-accent" />}
              {activeTab === 'categories' && <Folder size={28} className="text-accent" />}
              {activeTab === 'settings' && <Settings size={28} className="text-accent" />}
              {activeTab.replace('customers', 'Customers & CRM')}
            </h1>
            <p className="text-theme-secondary font-medium mt-1">Manage your restaurant operations.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <span className="text-sm font-bold text-theme-secondary">System Online</span>
          </div>
        </header>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && data && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-theme-card p-6 rounded-2xl shadow-sm border border-theme flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-theme-secondary uppercase tracking-wider mb-2">Gross Revenue</p>
                  <DollarSign size={20} className="text-theme-secondary opacity-50" />
                </div>
                <p className="text-3xl font-black text-theme-primary">₱{data.metrics.total_sales.toLocaleString()}</p>
              </div>
              <div className="bg-theme-card p-6 rounded-2xl shadow-sm border border-theme flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-theme-secondary uppercase tracking-wider mb-2">Ingredient Cost</p>
                  <TrendingUp size={20} className="text-theme-secondary opacity-50" />
                </div>
                <p className="text-3xl font-black text-red-500">-₱{(data.metrics.total_cost || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg relative overflow-hidden text-white transform hover:scale-[1.02] transition cursor-default">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-green-100 uppercase tracking-wider mb-2">Net Profit</p>
                  <TrendingUp size={20} className="text-green-100 opacity-50" />
                </div>
                <p className="text-3xl font-black">₱{(data.metrics.net_profit || 0).toLocaleString()}</p>
              </div>
              <div className="bg-theme-card p-6 rounded-2xl shadow-sm border border-theme flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-theme-secondary uppercase tracking-wider mb-2">Total Orders</p>
                  <ShoppingBag size={20} className="text-theme-secondary opacity-50" />
                </div>
                <p className="text-3xl font-black text-theme-primary">{data.metrics.total_orders}</p>
              </div>
            </div>

            <div className="bg-theme-card p-6 rounded-2xl shadow-sm border border-theme mb-6">
              <h2 className="font-bold text-lg text-theme-primary mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live Activity
              </h2>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {liveFeed.length === 0 ? <p className="text-sm text-theme-secondary">No activity yet...</p> : liveFeed.map(log => (
                  <div key={log.id} className="flex justify-between items-center p-3 bg-theme-main border border-theme rounded-xl text-sm animate-in fade-in slide-in-from-left duration-500">
                    <p className="font-medium text-theme-primary"><b>{log.user_name}</b>: {log.details}</p>
                    <span className="text-xs text-theme-secondary">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-theme-card p-6 rounded-2xl shadow-sm border border-theme">
                <h2 className="font-bold text-lg text-theme-primary mb-6">Sales Trend (7 Days)</h2>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-text)" opacity={0.1} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'var(--theme-text)', opacity: 0.6, fontSize: 12, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--theme-text)', opacity: 0.6, fontSize: 12, fontWeight: 'bold'}} tickFormatter={(v) => `₱${v}`} />
                      <Tooltip cursor={{fill: 'var(--theme-bg)'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="daily_sales" fill="var(--theme-primary)" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-theme-card rounded-2xl shadow-sm border border-theme overflow-hidden flex flex-col">
                <div className="p-6 border-b border-theme"><h2 className="font-bold text-lg text-theme-primary">Recent Orders</h2></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {data.recentOrders.map(o => (
                    <div key={o.id} className="flex justify-between items-center p-3 border border-theme rounded-xl hover:bg-theme-main transition">
                      <div>
                        <p className="font-bold text-theme-primary flex items-center gap-2">
                          #{o.id} 
                          {o.order_type === 'ONLINE' ? <Globe size={12} className="text-blue-500" /> : <Store size={12} className="text-orange-500" />}
                        </p>
                        <p className="text-xs text-theme-secondary mt-0.5">{o.ip_address || 'Local'}</p>
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
          <div className="bg-theme-card rounded-2xl shadow-sm border border-theme overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-theme bg-amber-50">
              <h2 className="font-bold text-xl text-amber-800 flex items-center gap-2"><AlertTriangle size={20} /> Pending Payment Verifications</h2>
              <p className="text-sm text-amber-600 mt-1">Verify the GCash/Maya reference before sending to kitchen.</p>
            </div>
            <table className="w-full text-left">
              <thead className="bg-theme-main text-sm text-theme-secondary border-b border-theme">
                <tr><th className="p-4">Order</th><th className="p-4">Method</th><th className="p-4">Ref #</th><th className="p-4">Total</th><th className="p-4 text-right">Action</th></tr>
              </thead>
              <tbody>
                {pendingPayments.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-theme-secondary font-bold">No pending payments.</td></tr>
                ) : pendingPayments.map(o => (
                  <tr key={o.id} className="border-b border-theme hover:bg-theme-main">
                    <td className="p-4 font-bold text-theme-primary">#{o.id}</td>
                    <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{o.payment_method}</span></td>
                    <td className="p-4 font-mono text-sm text-theme-secondary">{o.payment_reference || 'N/A'}</td>
                    <td className="p-4 font-black text-theme-primary">₱{o.total}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleVerifyPayment(o.id)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-sm flex items-center gap-1 ml-auto">
                        <CheckCircle size={16} /> Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- CUSTOMERS (CRM) TAB --- */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-theme-card rounded-2xl shadow-sm border border-theme overflow-hidden">
              <div className="p-6 border-b border-theme bg-theme-main/50">
                <h2 className="font-bold text-xl text-theme-primary">Customer Database</h2>
                <p className="text-sm text-theme-secondary">Track user activity, IP addresses, and lifetime spend.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-theme-main text-sm text-theme-secondary border-b border-theme">
                    <tr>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Total Orders</th>
                      <th className="p-4">Lifetime Spend</th>
                      <th className="p-4">Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-theme-secondary font-bold">No customers registered yet.</td></tr>
                    ) : customers.map(c => (
                      <tr key={c.id} className="border-b border-theme hover:bg-theme-main">
                        <td className="p-4">
                          <p className="font-bold text-theme-primary">{c.name}</p>
                          <p className="text-xs text-theme-secondary">{c.email}</p>
                        </td>
                        <td className="p-4 text-sm text-theme-secondary">{c.phone || 'N/A'}</td>
                        <td className="p-4 font-bold text-theme-primary">{c.total_orders}</td>
                        <td className="p-4 font-black text-green-600">₱{c.total_spent.toLocaleString()}</td>
                        <td className="p-4 text-xs text-theme-secondary">{c.last_order ? new Date(c.last_order).toLocaleDateString() : 'Never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-theme-card rounded-2xl shadow-sm border border-theme overflow-hidden">
              <div className="p-6 border-b border-theme bg-amber-50">
                <h2 className="font-bold text-xl text-amber-800">Customer Feedback</h2>
                <p className="text-sm text-amber-600">Monitor reviews to ensure quality control.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {reviews.length === 0 ? (
                  <div className="col-span-2 text-center text-theme-secondary font-bold py-8">No reviews yet.</div>
                ) : reviews.map(r => (
                  <div key={r.id} className="border border-theme rounded-xl p-4 bg-theme-main">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-theme-primary">{r.customer_name || 'Guest'}</p>
                      <p className="text-yellow-500 text-lg">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                    </div>
                    <p className="text-sm text-theme-secondary italic">"{r.comment}"</p>
                    <p className="text-xs text-theme-secondary mt-3 text-right">Order #{r.order_id} • {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- MENU TAB --- */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-theme-primary">Menu Catalog</h2>
              <button onClick={() => openModal('add')} className="bg-accent text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:opacity-90 transition flex items-center gap-2">
                <Plus size={18} /> Add Menu Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map(item => (
                <div key={item.id} className="bg-theme-card rounded-2xl shadow-sm border border-theme overflow-hidden group hover:shadow-lg transition">
                  <div className="h-40 overflow-hidden relative">
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full bg-theme-main flex items-center justify-center text-theme-secondary"><Utensils size={32} opacity={0.2} /></div>}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-black text-slate-800 uppercase shadow-sm">{item.category}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-theme-primary leading-tight">{item.name}</h3>
                      <span className="font-black text-accent">₱{item.price}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => openModal('edit', item)} className="flex-1 bg-theme-main hover:bg-theme-bg text-theme-secondary font-bold py-2 rounded-lg text-sm transition border border-theme flex items-center justify-center gap-2"><Pencil size={14} /> Edit</button>
                      <button onClick={() => openModal('delete', item)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- INVENTORY TAB --- */}
        {activeTab === 'inventory' && (
          <div className="bg-theme-card rounded-2xl shadow-sm border border-theme overflow-hidden animate-in fade-in duration-500">
            <table className="w-full text-left">
              <thead className="bg-theme-main text-sm text-theme-secondary border-b border-theme">
                <tr><th className="p-4">Ingredient</th><th className="p-4">Current Stock</th><th className="p-4 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {ingredients.map(ing => (
                  <tr key={ing.id} className="border-b border-theme hover:bg-theme-main">
                    <td className="p-4 font-bold text-theme-primary">{ing.name}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 w-fit ${ing.stock <= ing.low_stock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{ing.stock} {ing.unit}</span></td>
                    <td className="p-4 text-right">
                      {isLocal ? <button onClick={() => handleRestock(ing.id)} className="bg-accent text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition inline-flex items-center gap-2"><Plus size={14} /> Restock</button> : <span className="text-theme-secondary text-sm italic">Cloud View Only</span>}
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
            <div className="bg-theme-card p-4 rounded-2xl shadow-sm border border-theme h-[calc(100vh-140px)] overflow-y-auto">
              <h2 className="font-bold text-lg mb-4 text-theme-primary sticky top-0 bg-theme-card pb-2">Menu Items</h2>
              <div className="space-y-2">
                {menuItems.map(item => (
                  <button key={item.id} onClick={() => loadRecipe(item)} className={`w-full text-left p-3 rounded-xl border font-bold transition ${selectedRecipeItem?.id === item.id ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' : 'border-theme hover:bg-theme-main text-theme-secondary'}`}>{item.name}</button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 bg-theme-card p-8 rounded-2xl shadow-sm border border-theme">
              {!selectedRecipeItem ? (
                <div className="text-center text-theme-secondary py-32 font-bold text-xl flex flex-col items-center gap-4">
                  <ChefHat size={48} opacity={0.2} />
                  Select a menu item to build its recipe.
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-theme">
                    <h2 className="font-black text-3xl text-theme-primary">Recipe: {selectedRecipeItem.name}</h2>
                    <button onClick={saveRecipe} disabled={!isLocal} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-md flex items-center gap-2"><CheckCircle size={18} /> Save Recipe</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-bold text-lg mb-4 text-theme-primary flex items-center gap-2"><Beef size={20} /> Raw Ingredients</h3>
                      <div className="space-y-3">
                        {ingredients.map(ing => (
                          <div key={`ing_${ing.id}`} className="flex items-center justify-between p-4 border border-theme rounded-xl bg-theme-main hover:bg-theme-bg transition">
                            <div><span className="font-bold text-theme-primary">{ing.name}</span><span className="text-xs text-theme-secondary ml-2">({ing.unit})</span></div>
                            <input type="number" step="0.01" disabled={!isLocal} value={recipeIngredients[`ing_${ing.id}`] || ''} onChange={(e) => handleRecipeChange(`ing_${ing.id}`, e.target.value)} placeholder="0" className="w-24 border-theme border p-2 rounded-lg text-right font-bold bg-theme-card text-theme-primary focus:ring-2 focus:ring-accent outline-none" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg mb-4 text-theme-primary flex items-center gap-2"><Utensils size={20} /> Combo Components</h3>
                      <div className="space-y-3">
                        {menuItems.filter(m => m.id !== selectedRecipeItem.id).map(comp => (
                          <div key={`comp_${comp.id}`} className="flex items-center justify-between p-4 border border-blue-500/30 rounded-xl bg-blue-500/10 transition">
                            <div><span className="font-bold text-theme-primary">{comp.name}</span><span className="text-xs text-blue-500 ml-2">(Menu Item)</span></div>
                            <input type="number" step="1" disabled={!isLocal} value={recipeIngredients[`comp_${comp.id}`] || ''} onChange={(e) => handleRecipeChange(`comp_${comp.id}`, e.target.value)} placeholder="0" className="w-24 border-theme border p-2 rounded-lg text-right font-bold bg-theme-card text-theme-primary focus:ring-2 focus:ring-blue-500 outline-none" />
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
            <div className="bg-theme-card p-8 rounded-2xl shadow-sm border border-theme">
              <h2 className="font-bold text-2xl mb-6 text-theme-primary">Add New Category</h2>
              <form onSubmit={handleAddCategory} className="flex gap-4">
                <input name="categoryName" required disabled={!isLocal} placeholder="e.g. Tacos, Pasta, Coffee" className="flex-1 border-theme border p-4 rounded-xl bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" />
                <button type="submit" disabled={!isLocal} className="bg-accent text-white px-8 font-bold rounded-xl hover:opacity-90 transition shadow-md disabled:opacity-50 flex items-center gap-2"><Plus size={18} /> Add</button>
              </form>
            </div>

            <div className="bg-theme-card rounded-2xl shadow-sm border border-theme overflow-hidden">
              <div className="p-6 border-b border-theme bg-theme-main/50"><h2 className="font-bold text-xl text-theme-primary">Manage Categories</h2></div>
              <ul>
                {categories.map(cat => (
                  <li key={cat.id} className="flex justify-between items-center p-5 border-b border-theme last:border-0 hover:bg-theme-main transition">
                    <span className="font-bold text-theme-primary text-lg flex items-center gap-3"><Folder size={18} className="text-theme-secondary" /> {cat.name}</span>
                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} disabled={!isLocal} className="text-red-500 bg-red-50 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && settings && (
          <div className="bg-theme-card p-10 rounded-2xl shadow-sm border border-theme max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-theme">
              <div>
                <h2 className="font-black text-3xl text-theme-primary flex items-center gap-3"><Settings size={28} className="text-accent" /> Store Customization</h2>
                <p className="text-theme-secondary font-medium mt-1">White-label the app for your restaurant brand.</p>
              </div>
              {!isLocal && <span className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl text-sm font-bold">Cloud View Only</span>}
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault(); if (!isLocal) return addToast("Only local store can edit settings.", 'error');
              await fetch(`${import.meta.env.VITE_API_BASE}/api/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
              addToast("Settings saved! Refresh to see changes.", 'success');
            }} className="space-y-8">
              
              {/* THEME PRESETS */}
              <div>
                <h3 className="text-xl font-bold text-theme-primary mb-4 flex items-center gap-2"><Settings size={20} /> One-Click Themes</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {THEME_PRESETS.map((theme) => {
                    const isActive = settings.theme_primary_color === theme.primary && settings.theme_bg_color === theme.bg;
                    return (
                      <button
                        key={theme.name}
                        type="button"
                        disabled={!isLocal}
                        onClick={() => {
                          const newSettings = {
                            ...settings,
                            theme_primary_color: theme.primary,
                            theme_bg_color: theme.bg,
                            theme_text_color: theme.text,
                            theme_card_color: theme.card
                          };
                          setSettings(newSettings);
                          updateTheme(newSettings); 
                        }}
                        className={`relative p-4 rounded-2xl border-2 transition-all text-left overflow-hidden ${isActive ? 'border-accent shadow-md transform scale-[1.02]' : 'border-theme hover:border-theme hover:opacity-80'}`}
                      >
                        <div className="flex gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: theme.primary }}></div>
                          <div className="w-6 h-6 rounded-full shadow-sm border border-theme" style={{ backgroundColor: theme.bg }}></div>
                          <div className="w-6 h-6 rounded-full shadow-sm border border-theme" style={{ backgroundColor: theme.card }}></div>
                        </div>
                        <p className="font-bold text-theme-primary text-sm">{theme.name}</p>
                        {isActive && <span className="absolute top-2 right-2 text-accent text-lg">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ADVANCED CUSTOM COLORS */}
              <div>
                <h3 className="text-xl font-bold text-theme-primary mb-4">Advanced Color Customization</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-theme-main rounded-2xl border border-theme">
                  <div>
                    <label className="text-sm font-bold text-theme-secondary">Primary Accent</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="color" disabled={!isLocal} value={settings.theme_primary_color || '#ea580c'} onChange={e => { const s = {...settings, theme_primary_color: e.target.value}; setSettings(s); updateTheme(s); }} className="w-10 h-10 rounded cursor-pointer border-0 p-1 bg-theme-card shadow-sm" />
                      <input type="text" disabled={!isLocal} value={settings.theme_primary_color || '#ea580c'} onChange={e => { const s = {...settings, theme_primary_color: e.target.value}; setSettings(s); updateTheme(s); }} className="flex-1 border-theme border p-2 rounded-lg bg-theme-card text-theme-primary transition font-mono text-xs uppercase outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-theme-secondary">Main Background</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="color" disabled={!isLocal} value={settings.theme_bg_color || '#f8fafc'} onChange={e => { const s = {...settings, theme_bg_color: e.target.value}; setSettings(s); updateTheme(s); }} className="w-10 h-10 rounded cursor-pointer border-0 p-1 bg-theme-card shadow-sm" />
                      <input type="text" disabled={!isLocal} value={settings.theme_bg_color || '#f8fafc'} onChange={e => { const s = {...settings, theme_bg_color: e.target.value}; setSettings(s); updateTheme(s); }} className="flex-1 border-theme border p-2 rounded-lg bg-theme-card text-theme-primary transition font-mono text-xs uppercase outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-theme-secondary">Card Background</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="color" disabled={!isLocal} value={settings.theme_card_color || '#ffffff'} onChange={e => { const s = {...settings, theme_card_color: e.target.value}; setSettings(s); updateTheme(s); }} className="w-10 h-10 rounded cursor-pointer border-0 p-1 bg-theme-card shadow-sm" />
                      <input type="text" disabled={!isLocal} value={settings.theme_card_color || '#ffffff'} onChange={e => { const s = {...settings, theme_card_color: e.target.value}; setSettings(s); updateTheme(s); }} className="flex-1 border-theme border p-2 rounded-lg bg-theme-card text-theme-primary transition font-mono text-xs uppercase outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-theme-secondary">Text Color</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="color" disabled={!isLocal} value={settings.theme_text_color || '#0f172a'} onChange={e => { const s = {...settings, theme_text_color: e.target.value}; setSettings(s); updateTheme(s); }} className="w-10 h-10 rounded cursor-pointer border-0 p-1 bg-theme-card shadow-sm" />
                      <input type="text" disabled={!isLocal} value={settings.theme_text_color || '#0f172a'} onChange={e => { const s = {...settings, theme_text_color: e.target.value}; setSettings(s); updateTheme(s); }} className="flex-1 border-theme border p-2 rounded-lg bg-theme-card text-theme-primary transition font-mono text-xs uppercase outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-sm font-bold text-theme-secondary">Restaurant Name</label><input required disabled={!isLocal} value={settings.restaurant_name} onChange={e => setSettings({...settings, restaurant_name: e.target.value})} className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
                <div><label className="text-sm font-bold text-theme-secondary">Tagline</label><input required disabled={!isLocal} value={settings.tagline} onChange={e => setSettings({...settings, tagline: e.target.value})} className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-theme-secondary">Brand URL (Subdomain)</label>
                  <div className="flex items-center mt-2">
                    <input disabled={!isLocal} value={settings.brand_url || ''} onChange={e => setSettings({...settings, brand_url: e.target.value})} className="flex-1 border-theme border p-3 rounded-l-xl bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" placeholder="burger-bombs" />
                    <span className="bg-theme-main border border-l-0 border-theme p-3 rounded-r-xl text-theme-secondary font-bold text-sm">.vercel.app</span>
                  </div>
                </div>
                <div><label className="text-sm font-bold text-theme-secondary">Hero Title</label><input required disabled={!isLocal} value={settings.hero_title} onChange={e => setSettings({...settings, hero_title: e.target.value})} className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-sm font-bold text-theme-secondary">Hero Subtitle</label><input required disabled={!isLocal} value={settings.hero_subtitle} onChange={e => setSettings({...settings, hero_subtitle: e.target.value})} className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
                <div><label className="text-sm font-bold text-theme-secondary">Promo Banner Text</label><input disabled={!isLocal} value={settings.promo_banner_text || ''} onChange={e => setSettings({...settings, promo_banner_text: e.target.value})} className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              {/* IMAGE UPLOADERS */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-theme-main rounded-2xl border border-theme">
                <div>
                  <label className="text-sm font-bold text-theme-secondary">Restaurant Logo</label>
                  <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleSettingsImageUpload(e, 'logo_url')} className="w-full mt-2 text-sm text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-accent file:text-white hover:file:opacity-90 transition" />
                  {settings.logo_url && (
                    <div className="mt-3 relative w-20 h-20 group">
                      <img src={settings.logo_url} alt="Logo Preview" className="w-full h-full object-cover rounded-xl shadow-sm border-2 border-theme" />
                      <button type="button" onClick={() => setSettings({...settings, logo_url: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-md"><X size={12} /></button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-bold text-theme-secondary">Hero Background Image</label>
                  <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleSettingsImageUpload(e, 'hero_image_url')} className="w-full mt-2 text-sm text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-accent file:text-white hover:file:opacity-90 transition" />
                  {settings.hero_image_url && (
                    <div className="mt-3 relative w-full h-24 group">
                      <img src={settings.hero_image_url} alt="Hero Preview" className="w-full h-full object-cover rounded-xl shadow-sm border-2 border-theme" />
                      <button type="button" onClick={() => setSettings({...settings, hero_image_url: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-md"><X size={12} /></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div><label className="text-sm font-bold text-theme-secondary">Currency</label><input required disabled={!isLocal} value={settings.currency_symbol} onChange={e => setSettings({...settings, currency_symbol: e.target.value})} className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
                <div><label className="text-sm font-bold text-theme-secondary">Tax Rate</label><input required type="number" step="0.01" disabled={!isLocal} value={settings.tax_rate} onChange={e => setSettings({...settings, tax_rate: e.target.value})} className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-sm font-bold text-theme-secondary">Contact Phone</label><input disabled={!isLocal} value={settings.contact_phone || ''} onChange={e => setSettings({...settings, contact_phone: e.target.value})} className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
                <div><label className="text-sm font-bold text-theme-secondary">Contact Email</label><input disabled={!isLocal} value={settings.contact_email || ''} onChange={e => setSettings({...settings, contact_email: e.target.value})} className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" /></div>
              </div>

              <div>
                <label className="text-sm font-bold text-theme-secondary">About Us Text</label>
                <textarea disabled={!isLocal} value={settings.about_text || ''} onChange={e => setSettings({...settings, about_text: e.target.value})} rows="3" className="w-full border-theme border p-3 rounded-xl mt-2 bg-theme-main text-theme-primary focus:bg-theme-card transition font-medium outline-none focus:ring-2 focus:ring-accent" />
              </div>

              <button type="submit" disabled={!isLocal || isUploading} className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:opacity-90 transition disabled:opacity-50 shadow-lg mt-4 flex items-center justify-center gap-2">
                {isUploading ? 'Uploading Image...' : <><CheckCircle size={20} /> Save Settings</>}
              </button>
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
            <p className="text-theme-secondary mb-6">Are you sure you want to delete <b>{selectedItem?.name}</b>? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-theme-main text-theme-secondary font-bold rounded-xl hover:bg-theme-bg transition border border-theme">Cancel</button>
              <button onClick={handleDeleteItem} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md flex items-center justify-center gap-2"><Trash2 size={16} /> Yes, Delete</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-theme-secondary uppercase">Item Name</label>
              <input required value={selectedItem?.name || ''} onChange={e => setSelectedItem({...selectedItem, name: e.target.value})} className="w-full border border-theme p-3 rounded-xl mt-1 bg-theme-main text-theme-primary focus:bg-theme-card focus:ring-2 focus:ring-accent outline-none transition" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-theme-secondary uppercase">Price (₱)</label>
                <input required type="number" step="0.01" value={selectedItem?.price || ''} onChange={e => setSelectedItem({...selectedItem, price: e.target.value})} className="w-full border border-theme p-3 rounded-xl mt-1 bg-theme-main text-theme-primary focus:bg-theme-card focus:ring-2 focus:ring-accent outline-none transition" />
              </div>
              <div>
                <label className="text-xs font-bold text-theme-secondary uppercase">Cost (₱)</label>
                <input required type="number" step="0.01" value={selectedItem?.cost || ''} onChange={e => setSelectedItem({...selectedItem, cost: e.target.value})} className="w-full border border-theme p-3 rounded-xl mt-1 bg-theme-main text-theme-primary focus:bg-theme-card focus:ring-2 focus:ring-accent outline-none transition" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-theme-secondary uppercase">Category</label>
              <select value={selectedItem?.category || ''} onChange={e => setSelectedItem({...selectedItem, category: e.target.value})} className="w-full border border-theme p-3 rounded-xl mt-1 bg-theme-main text-theme-primary focus:bg-theme-card focus:ring-2 focus:ring-accent outline-none transition">
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-theme-secondary uppercase">Image Upload</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full mt-2 text-sm text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-accent file:text-white hover:file:opacity-90 transition" />
              {selectedItem?.image_url && <img src={selectedItem.image_url} alt="Preview" className="w-full h-32 object-cover rounded-xl mt-3 shadow-sm" />}
            </div>
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-theme-main text-theme-secondary font-bold rounded-xl hover:bg-theme-bg transition border border-theme">Cancel</button>
              <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                {isUploading ? 'Uploading...' : <><CheckCircle size={16} /> Save Item</>}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}