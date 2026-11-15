// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  LayoutDashboard, CreditCard, Users, Utensils, Package, ChefHat, Folder, Settings, 
  LogOut, Menu, Bell, TrendingUp, DollarSign, ShoppingBag, AlertTriangle, 
  CheckCircle, Pencil, Trash2, Beef, FileText, Printer, Calendar,
  Search, Plus, X, User, Lock, Activity, RefreshCw, Globe, Image, Store
} from 'lucide-react';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';
import { isLocalEnvironment } from '../utils/isLocal';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Burgers' }, { id: 2, name: 'Combos' }, { id: 3, name: 'Sides' }, { id: 4, name: 'Drinks' }, { id: 5, name: 'Desserts' }
];

const THEME_PRESETS = [
  { name: 'Enterprise Orange', primary: '#EA580C', bg: '#FDFBF7', text: '#1A1C23', card: '#FFFFFF' },
  { name: 'Midnight Slate', primary: '#3b82f6', bg: '#0f172a', text: '#f8fafc', card: '#1e293b' },
  { name: 'Fresh Bistro', primary: '#10b981', bg: '#f0fdf4', text: '#064e3b', card: '#ffffff' },
  { name: 'Classic Burger', primary: '#ea580c', bg: '#f8fafc', text: '#0f172a', card: '#ffffff' },
];

const ICON_OPTIONS = ['ShieldCheck', 'MapPin', 'Zap', 'Clock', 'Truck', 'Star', 'Heart', 'Utensils'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [staffUser, setStaffUser] = useState(null);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [ingredients, setIngredients] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [salesReport, setSalesReport] = useState([]);
  const [inventoryReport, setInventoryReport] = useState([]);
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });
  const [selectedRecipeItem, setSelectedRecipeItem] = useState(null);
  const [recipeIngredients, setRecipeIngredients] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const isLocal = isLocalEnvironment();

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories`).then(r => r.json()).then(d => { if (Array.isArray(d) && d.length > 0) setCategories(d); else setCategories(DEFAULT_CATEGORIES); }).catch(() => setCategories(DEFAULT_CATEGORIES));
  };

  const fetchReports = () => {
    const { start, end } = reportDateRange;
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/reports/sales?startDate=${start}&endDate=${end}`).then(r => r.json()).then(setSalesReport).catch(console.error);
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/reports/inventory`).then(r => r.json()).then(setInventoryReport).catch(console.error);
  };

  useEffect(() => {
    const user = localStorage.getItem('staff_user');
    if (user) setStaffUser(JSON.parse(user));
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, reportDateRange]);

  const updateTheme = (s) => {
    document.documentElement.style.setProperty('--theme-primary', s.theme_primary_color);
    document.documentElement.style.setProperty('--theme-bg', s.theme_bg_color);
    document.documentElement.style.setProperty('--theme-text', s.theme_text_color);
    document.documentElement.style.setProperty('--theme-card', s.theme_card_color);
  };

  const handleUploadImage = async (e, field, target = 'settings') => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData(); 
      formData.append('file', file); 
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      if (cloudRes.ok) { 
        const data = await cloudRes.json(); 
        if (target === 'settings') setSettings(prev => ({ ...prev, [field]: data.secure_url }));
        else setSelectedItem(prev => ({ ...prev, [field]: data.secure_url }));
        addToast("Image uploaded!", 'success'); 
      } else throw new Error();
    } catch (err) {
      const localFormData = new FormData(); localFormData.append('image', file);
      const localRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/upload-local`, { method: 'POST', body: localFormData });
      const data = await localRes.json(); 
      if (data.url) { 
        if (target === 'settings') setSettings(prev => ({ ...prev, [field]: data.url }));
        else setSelectedItem(prev => ({ ...prev, [field]: data.url }));
        addToast("Image saved locally.", 'warning'); 
      }
    } finally { setIsUploading(false); }
  };

  const saveSettings = async () => {
    if (!isLocal) return addToast("Only the local store can edit settings.", 'error');
    await fetch(`${import.meta.env.VITE_API_BASE}/api/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings)
    });
    addToast("Settings saved! Refresh to see changes.", 'success');
  };

  const loadRecipe = async (item) => {
    setSelectedRecipeItem(item);
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${item.id}/recipe`);
    const recipe = await res.json();
    const map = {};
    recipe.forEach(r => { 
      if (r.ingredient_id) map[`ing_${r.ingredient_id}`] = r.quantity;
      if (r.component_menu_item_id) map[`comp_${r.component_menu_item_id}`] = r.quantity;
    });
    setRecipeIngredients(map);
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
    addToast("Recipe saved!", 'success'); setSelectedRecipeItem(null);
  };
  const clearRecipe = async () => {
    if (!isLocal || !window.confirm("Delete this recipe?")) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedRecipeItem.id}/recipe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients: [] })
    });
    addToast("Recipe cleared.", 'success'); setRecipeIngredients({}); setSelectedRecipeItem(null);
  };

  const handleRestock = async (id) => {
    const amount = prompt("How many units?");
    if (!amount || isNaN(amount)) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/ingredients/${id}/restock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseInt(amount) }) });
    addToast(`Restocked ${amount}.`, 'success'); fetchData();
  };

  const openModal = (mode, item = null) => {
    setModalMode(mode);
    setSelectedItem(item || { name: '', price: '', cost: '', category: categories[0]?.name || 'Burgers', image_url: '' });
    setIsModalOpen(true);
  };
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!isLocal) return addToast("Only the local store can modify items.", 'error');
    const url = modalMode === 'edit' ? `${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedItem.id}` : `${import.meta.env.VITE_API_BASE}/api/admin/menu`;
    await fetch(url, { method: modalMode === 'edit' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selectedItem, price: parseFloat(selectedItem.price), cost: parseFloat(selectedItem.cost) }) });
    setIsModalOpen(false); addToast("Saved!", 'success'); fetchData();
  };
  const handleDeleteItem = async () => {
    if (!isLocal) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedItem.id}`, { method: 'DELETE' });
    setIsModalOpen(false); addToast("Deleted.", 'success'); fetchData();
  };

  const handleAddCategory = async (e) => {
    e.preventDefault(); const name = e.target.categoryName.value.trim(); if (!name) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (res.ok) { e.target.reset(); addToast("Added!", 'success'); fetchData(); } else { const d = await res.json(); addToast(d.error, 'error'); }
  };
  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok) { addToast("Deleted.", 'success'); fetchData(); } else { const d = await res.json(); addToast(d.error, 'error'); }
  };

  const handleVerifyPayment = async (id) => {
    if (!window.confirm("Confirm payment received? This sends the order to the kitchen.")) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${id}/verify-payment`, { method: 'POST' });
    addToast("Payment verified!", 'success'); fetchData();
  };

  const handlePrint = (type) => {
    const printWindow = window.open('', '_blank');
    const style = `<style>body { font-family: sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #E5E7EB; padding: 12px; text-align: left; } th { background-color: #F7F7F7; font-weight: bold; } .header { text-align: center; margin-bottom: 20px; }</style>`;
    let content = '';
    if (type === 'sales') {
      content = `<div class="header"><h1>Sales Report</h1><p>${new Date().toLocaleDateString()}</p></div><table><thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Method</th><th>Status</th><th>Total</th></tr></thead><tbody>${salesReport.map(o => `<tr><td>#${o.id}</td><td>${new Date(o.created_at).toLocaleDateString()}</td><td>${o.order_type}</td><td>${o.payment_method}</td><td>${o.status}</td><td>₱${o.total.toFixed(2)}</td></tr>`).join('')}</tbody></table>`;
    } else {
      content = `<div class="header"><h1>Inventory Audit</h1><p>${new Date().toLocaleDateString()}</p></div><table><thead><tr><th>Ingredient</th><th>Unit</th><th>Actual</th><th>Theoretical</th><th>Variance</th></tr></thead><tbody>${inventoryReport.map(i => { const v = i.actual_stock - i.theoretical_usage; return `<tr><td>${i.name}</td><td>${i.unit}</td><td>${i.actual_stock.toFixed(2)}</td><td>${i.theoretical_usage.toFixed(2)}</td><td style="color:${v < 0 ? 'red' : 'green'}">${v.toFixed(2)}</td></tr>`; }).join('')}</tbody></table>`;
    }
    printWindow.document.write(`<html><head><title>Report</title>${style}</head><body>${content}</body></html>`);
    printWindow.document.close(); printWindow.print();
  };

  const handleLogout = () => { localStorage.clear(); navigate('/admin/login'); };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFBF7] text-[#EA580C] font-bold text-xl">Loading...</div>;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard, badge: pendingPayments.length },
    { id: 'customers', label: 'CRM', icon: Users },
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'recipes', label: 'Recipes', icon: ChefHat },
    { id: 'categories', label: 'Categories', icon: Folder },
    { id: 'content', label: 'Website Content', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] font-['Source_Sans_Pro',sans-serif]">
      <div className="flex-1 flex">
        
        {/* SIDEBAR */}
        <aside className={`bg-white border-r border-gray-200 flex flex-col fixed h-[calc(100vh-32px)] z-20 transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-16'}`}>
          <div className="p-4 flex items-center gap-3 border-b border-gray-200 h-16">
            <div className="w-8 h-8 bg-[#EA580C] rounded-lg flex items-center justify-center text-white shrink-0">
              <Beef size={18} strokeWidth={2.5} />
            </div>
            {sidebarOpen && <span className="font-bold text-[#1A1C23] truncate">{settings?.restaurant_name || 'Burger Bombs'}</span>}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-semibold text-sm transition-all
                    ${activeTab === item.id ? 'bg-[#EA580C]/10 text-[#EA580C]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1A1C23]'}`}>
                  <div className="flex items-center gap-3"><Icon size={20} /> {sidebarOpen && <span>{item.label}</span>}</div>
                  {sidebarOpen && item.badge > 0 && <span className="bg-[#EA001E] text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>}
                </button>
              );
            })}

            {/* LOCAL-ONLY QUICK ACCESS (hidden from cloud) */}
            {isLocal && sidebarOpen && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Local Apps</p>
                <a href="/pos" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-sm text-gray-500 hover:bg-gray-50 hover:text-[#EA580C] transition">
                  <LayoutDashboard size={20} /> POS Terminal
                </a>
                <a href="/kitchen" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-sm text-gray-500 hover:bg-gray-50 hover:text-[#EA580C] transition">
                  <ChefHat size={20} /> Kitchen Display
                </a>
                <a href="/kiosk" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-sm text-gray-500 hover:bg-gray-50 hover:text-[#EA580C] transition">
                  <Store size={20} /> Kiosk
                </a>
              </div>
            )}

            {/* CLOUD INFO NOTE (only when on cloud) */}
            {!isLocal && sidebarOpen && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs font-bold text-blue-700">☁️ Cloud Mode</p>
                  <p className="text-xs text-blue-600 mt-1 leading-tight">POS, Kitchen & Kiosk are only available on the local network.</p>
                </div>
              </div>
            )}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className={`flex-1 transition-all duration-300 flex flex-col ${sidebarOpen ? 'ml-60' : 'ml-16'}`}>
          
          <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition"><Menu size={22} /></button>
              <h1 className="text-lg font-bold text-[#1A1C23] capitalize">{activeTab.replace('content', 'Website Content')}</h1>
            </div>
            
            <div className="flex items-center gap-4 relative">
              <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 relative rounded-full hover:bg-gray-50 transition">
                  <Bell size={20} className="text-gray-500" />
                  {liveFeed.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EA001E] rounded-full"></span>}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50"><h3 className="font-bold text-[#1A1C23]">Notifications</h3></div>
                    <div className="max-h-64 overflow-y-auto">
                      {liveFeed.length === 0 ? <p className="p-4 text-sm text-gray-500">No new notifications</p> : liveFeed.slice(0, 5).map(log => (
                        <div key={log.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                          <p className="text-sm font-semibold text-[#1A1C23]">{log.user_name}</p>
                          <p className="text-xs text-gray-500">{log.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pl-4 border-l border-gray-200 relative" ref={profileRef}>
                <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 hover:opacity-80 transition">
                  <div className="w-9 h-9 bg-[#EA580C] text-white rounded-full flex items-center justify-center font-bold text-sm">{staffUser?.name?.charAt(0) || 'A'}</div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-bold text-[#1A1C23] leading-tight">{staffUser?.name || 'Admin'}</p>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{staffUser?.role || 'Administrator'}</p>
                  </div>
                </button>
                {showProfileMenu && (
                  <div className="absolute top-12 right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <p className="text-sm font-bold text-[#1A1C23]">{staffUser?.name}</p>
                      <p className="text-xs text-gray-500">{staffUser?.email}</p>
                    </div>
                    <button onClick={() => addToast("Profile Edit coming soon.", 'info')} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-[#1A1C23] flex items-center gap-3"><User size={16} /> Edit Profile</button>
                    <button onClick={() => addToast("Password change coming soon.", 'info')} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-[#1A1C23] flex items-center gap-3"><Lock size={16} /> Change Password</button>
                    <div className="border-t border-gray-200"></div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-[#EA001E] hover:bg-red-50 flex items-center gap-3"><LogOut size={16} /> Logout</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="p-6 max-w-[1440px] mx-auto w-full flex-1 pb-16">
            
            {activeTab === 'overview' && data && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Gross Revenue</span>
                      <DollarSign size={20} className="text-[#EA580C] opacity-50" />
                    </div>
                    <div className="text-3xl font-black text-[#1A1C23]">₱{data.metrics.total_sales.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Orders</span>
                      <ShoppingBag size={20} className="text-[#FE9339] opacity-50" />
                    </div>
                    <div className="text-3xl font-black text-[#1A1C23]">{data.metrics.total_orders}</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Avg. Order Value</span>
                      <TrendingUp size={20} className="text-[#EA580C] opacity-50" />
                    </div>
                    <div className="text-3xl font-black text-[#1A1C23]">₱{(data.metrics.total_sales / data.metrics.total_orders || 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-[#45C65A] to-[#34A853] p-5 rounded-xl shadow-md text-white">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">Net Profit</span>
                      <DollarSign size={20} className="text-white/50" />
                    </div>
                    <div className="text-3xl font-black">₱{(data.metrics.net_profit || 0).toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="font-bold text-lg text-[#1A1C23] mb-6">Revenue Trend (7 Days)</h2>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12, fontWeight: 600}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12, fontWeight: 600}} tickFormatter={(v) => `₱${v}`} />
                          <Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB'}} />
                          <Bar dataKey="daily_sales" fill="#EA580C" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-200"><h2 className="font-bold text-lg text-[#1A1C23]">Live Activity</h2></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {liveFeed.length === 0 ? <p className="text-sm text-gray-500">No activity yet...</p> : liveFeed.slice(0, 5).map(log => (
                        <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm">
                          <p className="font-medium text-[#1A1C23]"><b>{log.user_name}</b>: {log.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#EA580C]/10 rounded-lg text-[#EA580C]"><FileText size={20} /></div>
                    <h2 className="text-lg font-bold text-[#1A1C23]">Business Reports</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg">
                      <Calendar size={16} className="text-gray-500" />
                      <input type="date" onChange={(e) => setReportDateRange({...reportDateRange, start: e.target.value})} className="bg-transparent text-sm font-semibold outline-none text-[#1A1C23]" />
                      <span className="text-gray-500">to</span>
                      <input type="date" onChange={(e) => setReportDateRange({...reportDateRange, end: e.target.value})} className="bg-transparent text-sm font-semibold outline-none text-[#1A1C23]" />
                    </div>
                    <button onClick={fetchReports} className="bg-gray-50 border border-gray-200 text-[#1A1C23] p-2.5 rounded-lg hover:bg-gray-100 transition"><Search size={18} /></button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-[#1A1C23]">Sales Transactions</h3>
                    <button onClick={() => handlePrint('sales')} className="bg-[#EA580C] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#C2410C] transition flex items-center gap-2"><Printer size={16} /> Print Report</button>
                  </div>
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                        <tr><th className="p-4 text-xs font-bold text-gray-500 uppercase">Order ID</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Type</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Method</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th><th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Total</th></tr>
                      </thead>
                      <tbody>
                        {salesReport.map(o => (
                          <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-4 font-bold text-[#1A1C23]">#{o.id}</td>
                            <td className="p-4 text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td className="p-4"><span className="bg-[#EA580C]/10 text-[#EA580C] px-2 py-1 rounded text-xs font-bold">{o.order_type}</span></td>
                            <td className="p-4 text-sm font-medium text-[#1A1C23]">{o.payment_method}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${o.status === 'RECEIVED' ? 'bg-[#45C65A]/10 text-[#45C65A]' : 'bg-[#FE9339]/10 text-[#FE9339]'}`}>{o.status}</span></td>
                            <td className="p-4 text-right font-black text-[#1A1C23]">₱{o.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-[#1A1C23]">Inventory Audit (Stock vs. Theoretical Usage)</h3>
                    <button onClick={() => handlePrint('inventory')} className="bg-[#EA580C] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#C2410C] transition flex items-center gap-2"><Printer size={16} /> Print Audit</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr><th className="p-4 text-xs font-bold text-gray-500 uppercase">Ingredient</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Unit</th><th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actual Stock</th><th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Theoretical Usage</th><th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Variance</th></tr>
                      </thead>
                      <tbody>
                        {inventoryReport.map(i => {
                          const variance = i.actual_stock - i.theoretical_usage;
                          return (
                            <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-4 font-bold text-[#1A1C23]">{i.name}</td>
                              <td className="p-4 text-sm text-gray-500">{i.unit}</td>
                              <td className="p-4 text-right font-bold text-[#1A1C23]">{i.actual_stock.toFixed(2)}</td>
                              <td className="p-4 text-right text-sm text-gray-500">{i.theoretical_usage.toFixed(2)}</td>
                              <td className={`p-4 text-right font-bold ${variance < 0 ? 'text-[#EA001E]' : 'text-[#45C65A]'}`}>{variance.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-[#FE9339]/10">
                  <h2 className="font-bold text-lg text-[#FE9339] flex items-center gap-2"><AlertTriangle size={20} /> Pending Payment Verifications</h2>
                  <p className="text-sm text-[#FE9339]/80 mt-1">Verify the GCash/Maya reference before sending to kitchen.</p>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr><th className="p-4 text-xs font-bold text-gray-500 uppercase">Order</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Method</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Ref #</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Total</th><th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {pendingPayments.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-bold">No pending payments.</td></tr>
                    ) : pendingPayments.map(o => (
                      <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 font-bold text-[#1A1C23]">#{o.id}</td>
                        <td className="p-4"><span className="bg-[#EA580C]/10 text-[#EA580C] px-2 py-1 rounded text-xs font-bold">{o.payment_method}</span></td>
                        <td className="p-4 font-mono text-sm text-gray-500">{o.payment_reference || 'N/A'}</td>
                        <td className="p-4 font-black text-[#1A1C23]">₱{o.total}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleVerifyPayment(o.id)} className="bg-[#45C65A] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#34A853] transition shadow-sm flex items-center gap-1 ml-auto">
                            <CheckCircle size={16} /> Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-200 bg-gray-50/50">
                    <h2 className="font-bold text-lg text-[#1A1C23]">Customer Database</h2>
                    <p className="text-sm text-gray-500">Track user activity, IP addresses, and lifetime spend.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr><th className="p-4 text-xs font-bold text-gray-500 uppercase">Customer</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Contact</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Total Orders</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Lifetime Spend</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Last Order</th></tr>
                      </thead>
                      <tbody>
                        {customers.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-bold">No customers registered yet.</td></tr>
                        ) : customers.map(c => (
                          <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-4">
                              <p className="font-bold text-[#1A1C23]">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.email}</p>
                            </td>
                            <td className="p-4 text-sm text-gray-500">{c.phone || 'N/A'}</td>
                            <td className="p-4 font-bold text-[#1A1C23]">{c.total_orders}</td>
                            <td className="p-4 font-black text-[#45C65A]">₱{c.total_spent.toLocaleString()}</td>
                            <td className="p-4 text-xs text-gray-500">{c.last_order ? new Date(c.last_order).toLocaleDateString() : 'Never'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-200 bg-[#FE9339]/10">
                    <h2 className="font-bold text-lg text-[#FE9339]">Customer Feedback</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                    {reviews.length === 0 ? (
                      <div className="col-span-2 text-center text-gray-500 font-bold py-8">No reviews yet.</div>
                    ) : reviews.map(r => (
                      <div key={r.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-bold text-[#1A1C23]">{r.customer_name || 'Guest'}</p>
                          <p className="text-[#FE9339] text-lg">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                        </div>
                        <p className="text-sm text-gray-500 italic">"{r.comment}"</p>
                        <p className="text-xs text-gray-400 mt-3 text-right">Order #{r.order_id} • {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'menu' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#1A1C23]">Menu Catalog</h2>
                  <button onClick={() => openModal('add')} className="bg-[#EA580C] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#C2410C] transition flex items-center gap-2">
                    <Plus size={18} /> Add Menu Item
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {menuItems.map(item => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-lg transition">
                      <div className="h-40 overflow-hidden relative">
                        {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full bg-gray-50 flex items-center justify-center"><Utensils size={32} className="text-gray-300" /></div>}
                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-black text-[#1A1C23] uppercase shadow-sm">{item.category}</span>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg text-[#1A1C23] leading-tight">{item.name}</h3>
                          <span className="font-black text-[#EA580C]">₱{item.price}</span>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => openModal('edit', item)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-2 rounded-lg text-sm transition border border-gray-200 flex items-center justify-center gap-2"><Pencil size={14} /> Edit</button>
                          <button onClick={() => openModal('delete', item)} className="flex-1 bg-red-50 hover:bg-red-100 text-[#EA001E] font-bold py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"><Trash2 size={14} /> Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr><th className="p-4 text-xs font-bold text-gray-500 uppercase">Ingredient</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Current Stock</th><th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {ingredients.map(ing => (
                      <tr key={ing.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 font-bold text-[#1A1C23]">{ing.name}</td>
                        <td className="p-4"><span className={`px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 w-fit ${ing.stock <= ing.low_stock ? 'bg-red-100 text-[#EA001E]' : 'bg-green-100 text-[#45C65A]'}`}>{ing.stock} {ing.unit}</span></td>
                        <td className="p-4 text-right">
                          {isLocal ? <button onClick={() => handleRestock(ing.id)} className="bg-[#EA580C] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#C2410C] transition inline-flex items-center gap-2"><Plus size={14} /> Restock</button> : <span className="text-gray-400 text-sm italic">Cloud View Only</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'recipes' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-[calc(100vh-140px)] overflow-y-auto">
                  <h2 className="font-bold text-lg mb-4 text-[#1A1C23] sticky top-0 bg-white pb-2">Menu Items</h2>
                  <div className="space-y-2">
                    {menuItems.map(item => (
                      <button key={item.id} onClick={() => loadRecipe(item)} className={`w-full text-left p-3 rounded-lg border font-bold transition ${selectedRecipeItem?.id === item.id ? 'bg-[#EA580C]/10 border-[#EA580C] text-[#EA580C] shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>{item.name}</button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-3 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                  {!selectedRecipeItem ? (
                    <div className="text-center text-gray-400 py-32 font-bold text-xl flex flex-col items-center gap-4"><ChefHat size={48} opacity={0.2} /> Select a menu item to build its recipe.</div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
                        <h2 className="font-black text-3xl text-[#1A1C23]">Recipe: {selectedRecipeItem.name}</h2>
                        <div className="flex gap-3">
                          <button onClick={clearRecipe} disabled={!isLocal} className="bg-red-50 text-[#EA001E] px-6 py-3 rounded-lg font-bold hover:bg-red-100 transition shadow-sm flex items-center gap-2"><Trash2 size={18} /> Clear</button>
                          <button onClick={saveRecipe} disabled={!isLocal} className="bg-[#45C65A] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#34A853] transition shadow-md flex items-center gap-2"><CheckCircle size={18} /> Save Recipe</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h3 className="font-bold text-lg mb-4 text-[#1A1C23] flex items-center gap-2"><Beef size={20} /> Raw Ingredients</h3>
                          <div className="space-y-3">
                            {ingredients.map(ing => (
                              <div key={`ing_${ing.id}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                                <div><span className="font-bold text-[#1A1C23]">{ing.name}</span><span className="text-xs text-gray-500 ml-2">({ing.unit})</span></div>
                                <input type="number" step="0.01" disabled={!isLocal} value={recipeIngredients[`ing_${ing.id}`] || ''} onChange={(e) => handleRecipeChange(`ing_${ing.id}`, e.target.value)} placeholder="0" className="w-24 border-gray-200 border p-2 rounded-lg text-right font-bold bg-white text-[#1A1C23] focus:ring-2 focus:ring-[#EA580C] outline-none" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-4 text-[#1A1C23] flex items-center gap-2"><Utensils size={20} /> Combo Components</h3>
                          <div className="space-y-3">
                            {menuItems.filter(m => m.id !== selectedRecipeItem.id).map(comp => (
                              <div key={`comp_${comp.id}`} className="flex items-center justify-between p-4 border border-[#EA580C]/30 rounded-lg bg-[#EA580C]/5 transition">
                                <div><span className="font-bold text-[#1A1C23]">{comp.name}</span><span className="text-xs text-[#EA580C] ml-2">(Menu Item)</span></div>
                                <input type="number" step="1" disabled={!isLocal} value={recipeIngredients[`comp_${comp.id}`] || ''} onChange={(e) => handleRecipeChange(`comp_${comp.id}`, e.target.value)} placeholder="0" className="w-24 border-gray-200 border p-2 rounded-lg text-right font-bold bg-white text-[#1A1C23] focus:ring-2 focus:ring-[#EA580C] outline-none" />
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

            {activeTab === 'categories' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="font-bold text-2xl mb-6 text-[#1A1C23]">Add New Category</h2>
                  <form onSubmit={handleAddCategory} className="flex gap-4">
                    <input name="categoryName" required disabled={!isLocal} placeholder="e.g. Tacos, Pasta, Coffee" className="flex-1 border-gray-200 border p-4 rounded-lg bg-gray-50 text-[#1A1C23] focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-[#EA580C]" />
                    <button type="submit" disabled={!isLocal} className="bg-[#EA580C] text-white px-8 font-bold rounded-lg hover:bg-[#C2410C] transition shadow-md disabled:opacity-50 flex items-center gap-2"><Plus size={18} /> Add</button>
                  </form>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 bg-gray-50/50"><h2 className="font-bold text-xl text-[#1A1C23]">Manage Categories</h2></div>
                  <ul>
                    {categories.map(cat => (
                      <li key={cat.id} className="flex justify-between items-center p-5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition">
                        <span className="font-bold text-[#1A1C23] text-lg flex items-center gap-3"><Folder size={18} className="text-gray-400" /> {cat.name}</span>
                        <button onClick={() => handleDeleteCategory(cat.id, cat.name)} disabled={!isLocal} className="text-[#EA001E] bg-red-50 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'content' && settings && (
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                  <h2 className="font-black text-2xl text-[#1A1C23] mb-6 flex items-center gap-3"><Globe size={24} className="text-[#EA580C]" /> Browser & Branding</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-bold text-gray-600 mb-1 block">Browser Tab Title</label>
                      <input type="text" disabled={!isLocal} value={settings.site_title || ''} onChange={e => setSettings({...settings, site_title: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white transition outline-none focus:ring-2 focus:ring-[#EA580C]" placeholder="e.g. Burger Bombs | Best Burgers in Manila" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-600 mb-2 block">Favicon (Browser Icon)</label>
                      <input type="file" accept="image/png,image/x-icon,image/svg+xml" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'favicon_url')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#EA580C]/10 file:text-[#EA580C] hover:file:bg-[#EA580C]/20" />
                      {settings.favicon_url && (
                        <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <img src={settings.favicon_url} alt="Favicon" className="w-8 h-8" />
                          <button onClick={() => setSettings({...settings, favicon_url: ''})} className="ml-auto text-red-500 hover:bg-red-50 p-1 rounded"><X size={16} /></button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-600 mb-2 block">Restaurant Logo</label>
                      <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'logo_url')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#EA580C]/10 file:text-[#EA580C] hover:file:bg-[#EA580C]/20" />
                      {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="mt-3 w-16 h-16 rounded-lg object-cover" />}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                  <h2 className="font-black text-2xl text-[#1A1C23] mb-6 flex items-center gap-3"><Image size={24} className="text-[#EA580C]" /> Homepage Hero</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-bold text-gray-600 mb-1 block">Hero Background Image</label>
                      <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'hero_image_url')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#EA580C]/10 file:text-[#EA580C] hover:file:bg-[#EA580C]/20" />
                      {settings.hero_image_url && <img src={settings.hero_image_url} alt="Hero" className="mt-3 w-full h-40 object-cover rounded-xl" />}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div><label className="text-sm font-bold text-gray-600 mb-1 block">Hero Title</label><input type="text" disabled={!isLocal} value={settings.hero_title || ''} onChange={e => setSettings({...settings, hero_title: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                      <div><label className="text-sm font-bold text-gray-600 mb-1 block">Hero Subtitle</label><input type="text" disabled={!isLocal} value={settings.hero_subtitle || ''} onChange={e => setSettings({...settings, hero_subtitle: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div><label className="text-sm font-bold text-gray-600 mb-1 block">Button Text</label><input type="text" disabled={!isLocal} value={settings.hero_button_text || ''} onChange={e => setSettings({...settings, hero_button_text: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                      <div><label className="text-sm font-bold text-gray-600 mb-1 block">Button Link</label><input type="text" disabled={!isLocal} value={settings.hero_button_link || ''} onChange={e => setSettings({...settings, hero_button_link: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" placeholder="/store" /></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-black text-2xl text-[#1A1C23]">Feature Highlights</h2>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" disabled={!isLocal} checked={settings.show_features} onChange={e => setSettings({...settings, show_features: e.target.checked})} className="w-5 h-5 accent-[#EA580C]" />
                      <span className="text-sm font-bold text-gray-600">Show on Homepage</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[1, 2, 3].map(num => (
                      <div key={num} className="p-5 border border-gray-200 rounded-xl bg-gray-50">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Feature {num}</p>
                        <div className="space-y-3">
                          <div><label className="text-xs font-bold text-gray-600 mb-1 block">Icon</label>
                            <select disabled={!isLocal} value={settings[`feature_${num}_icon`] || ''} onChange={e => setSettings({...settings, [`feature_${num}_icon`]: e.target.value})} className="w-full border-gray-200 border p-2 rounded-lg bg-white text-sm">
                              {ICON_OPTIONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                            </select>
                          </div>
                          <div><label className="text-xs font-bold text-gray-600 mb-1 block">Title</label><input type="text" disabled={!isLocal} value={settings[`feature_${num}_title`] || ''} onChange={e => setSettings({...settings, [`feature_${num}_title`]: e.target.value})} className="w-full border-gray-200 border p-2 rounded-lg bg-white text-sm" /></div>
                          <div><label className="text-xs font-bold text-gray-600 mb-1 block">Description</label><input type="text" disabled={!isLocal} value={settings[`feature_${num}_desc`] || ''} onChange={e => setSettings({...settings, [`feature_${num}_desc`]: e.target.value})} className="w-full border-gray-200 border p-2 rounded-lg bg-white text-sm" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-black text-2xl text-[#1A1C23]">About Us Section</h2>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" disabled={!isLocal} checked={settings.show_about} onChange={e => setSettings({...settings, show_about: e.target.checked})} className="w-5 h-5 accent-[#EA580C]" />
                      <span className="text-sm font-bold text-gray-600">Show on Homepage</span>
                    </label>
                  </div>
                  <div className="space-y-5">
                    <div><label className="text-sm font-bold text-gray-600 mb-1 block">About Title</label><input type="text" disabled={!isLocal} value={settings.about_title || ''} onChange={e => setSettings({...settings, about_title: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                    <div><label className="text-sm font-bold text-gray-600 mb-1 block">About Description</label><textarea rows="4" disabled={!isLocal} value={settings.about_text || ''} onChange={e => setSettings({...settings, about_text: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                    <div>
                      <label className="text-sm font-bold text-gray-600 mb-2 block">About Image</label>
                      <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'about_image_url')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#EA580C]/10 file:text-[#EA580C] hover:file:bg-[#EA580C]/20" />
                      {settings.about_image_url && <img src={settings.about_image_url} alt="About" className="mt-3 w-full h-40 object-cover rounded-xl" />}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                  <h2 className="font-black text-2xl text-[#1A1C23] mb-6">Footer & Social Media</h2>
                  <div className="space-y-5">
                    <div><label className="text-sm font-bold text-gray-600 mb-1 block">Footer Text</label><input type="text" disabled={!isLocal} value={settings.footer_text || ''} onChange={e => setSettings({...settings, footer_text: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div><label className="text-sm font-bold text-gray-600 mb-1 block">Facebook URL</label><input type="url" disabled={!isLocal} value={settings.social_facebook || ''} onChange={e => setSettings({...settings, social_facebook: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" placeholder="https://facebook.com/..." /></div>
                      <div><label className="text-sm font-bold text-gray-600 mb-1 block">Instagram URL</label><input type="url" disabled={!isLocal} value={settings.social_instagram || ''} onChange={e => setSettings({...settings, social_instagram: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" placeholder="https://instagram.com/..." /></div>
                      <div><label className="text-sm font-bold text-gray-600 mb-1 block">TikTok URL</label><input type="url" disabled={!isLocal} value={settings.social_tiktok || ''} onChange={e => setSettings({...settings, social_tiktok: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" placeholder="https://tiktok.com/@..." /></div>
                      <div><label className="text-sm font-bold text-gray-600 mb-1 block">Twitter / X URL</label><input type="url" disabled={!isLocal} value={settings.social_twitter || ''} onChange={e => setSettings({...settings, social_twitter: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" placeholder="https://x.com/..." /></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                  <h2 className="font-black text-2xl text-[#1A1C23] mb-2">Custom Domain / URL</h2>
                  <p className="text-sm text-gray-500 mb-6">This is your "vanity URL" slug.</p>
                  <div className="flex items-center">
                    <input disabled={!isLocal} value={settings.brand_url || ''} onChange={e => setSettings({...settings, brand_url: e.target.value})} className="flex-1 border-gray-200 border p-3 rounded-l-xl bg-gray-50 focus:bg-white transition font-medium outline-none focus:ring-2 focus:ring-[#EA580C]" placeholder="burger-bombs" />
                    <span className="bg-gray-100 border border-l-0 border-gray-200 p-3 rounded-r-xl text-gray-500 font-bold text-sm">.vercel.app</span>
                  </div>
                </div>

                <button onClick={saveSettings} disabled={!isLocal || isUploading} className="w-full bg-[#EA580C] text-white font-bold py-4 rounded-xl hover:bg-[#C2410C] transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 sticky bottom-20 z-10">
                  {isUploading ? 'Uploading...' : <><CheckCircle size={20} /> Save All Changes</>}
                </button>
              </div>
            )}

            {activeTab === 'settings' && settings && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-5xl mx-auto">
                <h2 className="font-black text-3xl text-[#1A1C23] flex items-center gap-3 mb-8 pb-6 border-b border-gray-200"><Settings size={28} className="text-[#EA580C]" /> Store Settings</h2>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-[#1A1C23] mb-4">One-Click Themes</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {THEME_PRESETS.map((theme) => {
                        const isActive = settings.theme_primary_color === theme.primary && settings.theme_bg_color === theme.bg;
                        return (
                          <button key={theme.name} type="button" disabled={!isLocal}
                            onClick={() => { const s = { ...settings, theme_primary_color: theme.primary, theme_bg_color: theme.bg, theme_text_color: theme.text, theme_card_color: theme.card }; setSettings(s); updateTheme(s); }}
                            className={`relative p-4 rounded-xl border-2 transition-all text-left ${isActive ? 'border-[#EA580C] shadow-md scale-[1.02]' : 'border-gray-200'}`}>
                            <div className="flex gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: theme.primary }}></div>
                              <div className="w-6 h-6 rounded-full shadow-sm border" style={{ backgroundColor: theme.bg }}></div>
                              <div className="w-6 h-6 rounded-full shadow-sm border" style={{ backgroundColor: theme.card }}></div>
                            </div>
                            <p className="font-bold text-[#1A1C23] text-sm">{theme.name}</p>
                            {isActive && <span className="absolute top-2 right-2 text-[#EA580C]">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div><label className="text-sm font-bold text-gray-600">Restaurant Name</label><input required disabled={!isLocal} value={settings.restaurant_name} onChange={e => setSettings({...settings, restaurant_name: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl mt-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                    <div><label className="text-sm font-bold text-gray-600">Tagline</label><input required disabled={!isLocal} value={settings.tagline} onChange={e => setSettings({...settings, tagline: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl mt-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div><label className="text-sm font-bold text-gray-600">Contact Phone</label><input disabled={!isLocal} value={settings.contact_phone || ''} onChange={e => setSettings({...settings, contact_phone: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl mt-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                    <div><label className="text-sm font-bold text-gray-600">Contact Email</label><input disabled={!isLocal} value={settings.contact_email || ''} onChange={e => setSettings({...settings, contact_email: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl mt-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div><label className="text-sm font-bold text-gray-600">Currency Symbol</label><input disabled={!isLocal} value={settings.currency_symbol} onChange={e => setSettings({...settings, currency_symbol: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl mt-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                    <div><label className="text-sm font-bold text-gray-600">Tax Rate</label><input type="number" step="0.01" disabled={!isLocal} value={settings.tax_rate} onChange={e => setSettings({...settings, tax_rate: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl mt-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                  </div>
                  <div><label className="text-sm font-bold text-gray-600">Promo Banner Text</label><input disabled={!isLocal} value={settings.promo_banner_text || ''} onChange={e => setSettings({...settings, promo_banner_text: e.target.value})} className="w-full border-gray-200 border p-3 rounded-xl mt-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none" /></div>
                  <button onClick={saveSettings} disabled={!isLocal || isUploading} className="w-full bg-[#EA580C] text-white font-bold py-4 rounded-xl hover:bg-[#C2410C] transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"><CheckCircle size={20} /> Save Settings</button>
                </div>
              </div>
            )}

          </div>

          <footer className="fixed bottom-0 right-0 h-8 bg-white border-t border-gray-200 flex items-center justify-between px-6 text-xs font-semibold text-gray-500 z-20" style={{ left: sidebarOpen ? '240px' : '64px', transition: 'all 0.3s' }}>
            <span className="flex items-center gap-1"><Activity size={12} className="text-[#45C65A]" /> {isLocal ? 'Local Mode' : 'Cloud Mode'} — System Online</span>
          </footer>
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'delete' ? 'Confirm Deletion' : modalMode === 'edit' ? 'Edit Menu Item' : 'Add New Item'} variant={modalMode === 'delete' ? 'danger' : 'info'}>
        {modalMode === 'delete' ? (
          <div>
            <p className="text-gray-500 mb-6">Are you sure you want to delete <b>{selectedItem?.name}</b>? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition border border-gray-200">Cancel</button>
              <button onClick={handleDeleteItem} className="flex-1 py-3 bg-[#EA001E] text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md flex items-center justify-center gap-2"><Trash2 size={16} /> Yes, Delete</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div><label className="text-xs font-bold text-gray-500 uppercase">Item Name</label><input required value={selectedItem?.name || ''} onChange={e => setSelectedItem({...selectedItem, name: e.target.value})} className="w-full border border-gray-200 p-3 rounded-lg mt-1 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none transition" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Price (₱)</label><input required type="number" step="0.01" value={selectedItem?.price || ''} onChange={e => setSelectedItem({...selectedItem, price: e.target.value})} className="w-full border border-gray-200 p-3 rounded-lg mt-1 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none transition" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Cost (₱)</label><input required type="number" step="0.01" value={selectedItem?.cost || ''} onChange={e => setSelectedItem({...selectedItem, cost: e.target.value})} className="w-full border border-gray-200 p-3 rounded-lg mt-1 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none transition" /></div>
            </div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Category</label><select value={selectedItem?.category || ''} onChange={e => setSelectedItem({...selectedItem, category: e.target.value})} className="w-full border border-gray-200 p-3 rounded-lg mt-1 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#EA580C] outline-none transition">{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Image Upload</label><input type="file" accept="image/*" onChange={e => handleUploadImage(e, 'image_url', 'menu')} className="w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#EA580C]/10 file:text-[#EA580C] hover:file:bg-[#EA580C]/20 transition" />{selectedItem?.image_url && <img src={selectedItem.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg mt-3 shadow-sm" />}</div>
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition border border-gray-200">Cancel</button>
              <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-[#EA580C] text-white font-bold rounded-lg hover:bg-[#C2410C] transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2">{isUploading ? 'Uploading...' : <><CheckCircle size={16} /> Save Item</>}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}