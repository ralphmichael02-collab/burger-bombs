// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  LayoutDashboard, CreditCard, Users, Utensils, Package, ChefHat, Folder, Settings, 
  LogOut, Menu, Bell, TrendingUp, DollarSign, ShoppingBag, AlertTriangle, 
  CheckCircle, Pencil, Trash2, Globe, Store, Beef, FileText, Printer, Calendar,
  ArrowUpRight, ArrowDownRight, Search, Plus, X, User, Lock, Activity, RefreshCw
} from 'lucide-react';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Burgers' }, { id: 2, name: 'Combos' }, { id: 3, name: 'Sides' }, { id: 4, name: 'Drinks' }, { id: 5, name: 'Desserts' }
];

const THEME_PRESETS = [
  { name: 'Enterprise Blue', primary: '#2B4FB9', bg: '#F7F7F7', text: '#1A1C23', card: '#FFFFFF' },
  { name: 'Midnight Slate', primary: '#3b82f6', bg: '#0f172a', text: '#f8fafc', card: '#1e293b' },
  { name: 'Fresh Bistro', primary: '#10b981', bg: '#f0fdf4', text: '#064e3b', card: '#ffffff' },
  { name: 'Classic Burger', primary: '#ea580c', bg: '#f8fafc', text: '#0f172a', card: '#ffffff' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [staffUser, setStaffUser] = useState(null);
  
  // Dropdown States
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

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

  // Reports States
  const [salesReport, setSalesReport] = useState([]);
  const [inventoryReport, setInventoryReport] = useState([]);
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });

  // Recipe / BOM State
  const [selectedRecipeItem, setSelectedRecipeItem] = useState(null);
  const [recipeIngredients, setRecipeIngredients] = useState({});

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const isLocal = window.location.hostname.includes('.test') || window.location.hostname.includes('localhost');

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfileMenu(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
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
    
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setCategories(d); else setCategories(DEFAULT_CATEGORIES); })
      .catch(() => setCategories(DEFAULT_CATEGORIES));
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

  const updateTheme = (newSettings) => {
    document.documentElement.style.setProperty('--theme-primary', newSettings.theme_primary_color);
    document.documentElement.style.setProperty('--theme-bg', newSettings.theme_bg_color);
    document.documentElement.style.setProperty('--theme-text', newSettings.theme_text_color);
    document.documentElement.style.setProperty('--theme-card', newSettings.theme_card_color);
  };

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
      if (cloudRes.ok) { const data = await cloudRes.json(); setSettings(prev => ({ ...prev, [field]: data.secure_url })); addToast("Image uploaded successfully!", 'success'); } else throw new Error();
    } catch (err) {
      const localFormData = new FormData(); localFormData.append('image', file);
      const localRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/upload-local`, { method: 'POST', body: localFormData });
      const data = await localRes.json(); if (data.url) { setSettings(prev => ({ ...prev, [field]: data.url })); addToast("Image saved locally.", 'warning'); }
    } finally { setIsUploading(false); }
  };

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

  const clearRecipe = async () => {
    if (!isLocal || !window.confirm("Are you sure you want to delete this entire recipe? The item will no longer deduct inventory.")) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedRecipeItem.id}/recipe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients: [] })
    });
    addToast("Recipe cleared.", 'success');
    setRecipeIngredients({});
    setSelectedRecipeItem(null);
  };

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

  const handleVerifyPayment = async (orderId) => {
    if (!window.confirm("Are you sure you received the payment? This will send the order to the kitchen.")) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/orders/${orderId}/verify-payment`, { method: 'POST' });
    addToast("Payment verified! Order sent to Kitchen.", 'success');
    fetchData();
  };

  const handlePrint = (type) => {
    const printWindow = window.open('', '_blank');
    const style = `<style>body { font-family: sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #E5E7EB; padding: 12px; text-align: left; } th { background-color: #F7F7F7; font-weight: bold; } .header { text-align: center; margin-bottom: 20px; }</style>`;
    let content = '';
    if (type === 'sales') {
      content = `<div class="header"><h1>Sales Transaction Report</h1><p>Date: ${new Date().toLocaleDateString()}</p></div><table><thead><tr><th>Order ID</th><th>Date</th><th>Type</th><th>Method</th><th>Status</th><th>Total</th></tr></thead><tbody>${salesReport.map(o => `<tr><td>#${o.id}</td><td>${new Date(o.created_at).toLocaleDateString()}</td><td>${o.order_type}</td><td>${o.payment_method}</td><td>${o.status}</td><td>₱${o.total.toFixed(2)}</td></tr>`).join('')}</tbody></table>`;
    } else {
      content = `<div class="header"><h1>Inventory Audit Report</h1><p>Date: ${new Date().toLocaleDateString()}</p></div><table><thead><tr><th>Ingredient</th><th>Unit</th><th>Actual Stock</th><th>Theoretical Usage</th><th>Variance</th></tr></thead><tbody>${inventoryReport.map(i => { const variance = i.actual_stock - i.theoretical_usage; return `<tr><td>${i.name}</td><td>${i.unit}</td><td>${i.actual_stock.toFixed(2)}</td><td>${i.theoretical_usage.toFixed(2)}</td><td style="color: ${variance < 0 ? 'red' : 'green'}">${variance.toFixed(2)}</td></tr>`; }).join('')}</tbody></table>`;
    }
    printWindow.document.write(`<html><head><title>Print Report</title>${style}</head><body>${content}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleLogout = () => { localStorage.clear(); navigate('/admin/login'); };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F7F7F7] text-[#2B4FB9] font-bold text-xl">Loading Enterprise Dashboard...</div>;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard, badge: pendingPayments.length },
    { id: 'customers', label: 'Customers & CRM', icon: Users },
    { id: 'menu', label: 'Menu Editor', icon: Utensils },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'recipes', label: 'Recipes', icon: ChefHat },
    { id: 'categories', label: 'Categories', icon: Folder },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7] font-['Source_Sans_Pro',sans-serif]">
      <div className="flex-1 flex">
        {/* SIDEBAR */}
        <aside className={`bg-white border-r border-[#E5E7EB] flex flex-col fixed h-[calc(100vh-32px)] z-20 transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-16'}`}>
          <div className="p-4 flex items-center gap-3 border-b border-[#E5E7EB] h-16">
            <div className="w-8 h-8 bg-[#2B4FB9] rounded-lg flex items-center justify-center text-white shrink-0"><Beef size={18} strokeWidth={2.5} /></div>
            {sidebarOpen && <span className="font-bold text-[#1A1C23] truncate">{settings?.restaurant_name || 'Burger Bombs'}</span>}
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-semibold text-sm transition-all
                    ${activeTab === item.id ? 'bg-[#2B4FB9]/10 text-[#2B4FB9]' : 'text-[#6B7280] hover:bg-[#F7F7F7] hover:text-[#1A1C23]'}`}>
                  <div className="flex items-center gap-3">
                    <Icon size={20} /> {sidebarOpen && <span>{item.label}</span>}
                  </div>
                  {sidebarOpen && item.badge > 0 && <span className="bg-[#EA001E] text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className={`flex-1 transition-all duration-300 flex flex-col ${sidebarOpen ? 'ml-60' : 'ml-16'}`}>
          <header className="bg-white h-16 border-b border-[#E5E7EB] flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-[#6B7280] hover:bg-[#F7F7F7] hover:text-[#1A1C23] transition"><Menu size={22} /></button>
              <h1 className="text-lg font-bold text-[#1A1C23] capitalize">{activeTab}</h1>
            </div>
            
            <div className="flex items-center gap-4 relative">
              <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 relative rounded-full hover:bg-[#F7F7F7] transition">
                  <Bell size={20} className="text-[#6B7280]" />
                  {liveFeed.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EA001E] rounded-full"></span>}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#E5E7EB] z-50 overflow-hidden">
                    <div className="p-4 border-b border-[#E5E7EB] bg-[#F7F7F7]"><h3 className="font-bold text-[#1A1C23]">Notifications</h3></div>
                    <div className="max-h-64 overflow-y-auto">
                      {liveFeed.length === 0 ? <p className="p-4 text-sm text-[#6B7280]">No new notifications</p> : liveFeed.slice(0, 5).map(log => (
                        <div key={log.id} className="p-4 border-b border-[#F3F4F6] hover:bg-[#F7F7F7]">
                          <p className="text-sm font-semibold text-[#1A1C23]">{log.user_name}</p>
                          <p className="text-xs text-[#6B7280]">{log.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 pl-4 border-l border-[#E5E7EB] relative" ref={profileRef}>
                <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 hover:opacity-80 transition">
                  <div className="w-9 h-9 bg-[#2B4FB9] text-white rounded-full flex items-center justify-center font-bold text-sm">{staffUser?.name?.charAt(0) || 'A'}</div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-bold text-[#1A1C23] leading-tight">{staffUser?.name || 'Admin'}</p>
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{staffUser?.role || 'Administrator'}</p>
                  </div>
                </button>
                {showProfileMenu && (
                  <div className="absolute top-12 right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E5E7EB] z-50 overflow-hidden">
                    <div className="p-4 border-b border-[#E5E7EB] bg-[#F7F7F7]"><p className="text-sm font-bold text-[#1A1C23]">{staffUser?.name}</p><p className="text-xs text-[#6B7280]">{staffUser?.email}</p></div>
                    <button onClick={() => addToast("Profile Edit coming soon.", 'info')} className="w-full text-left px-4 py-3 text-sm font-semibold text-[#6B7280] hover:bg-[#F7F7F7] hover:text-[#1A1C23] flex items-center gap-3"><User size={16} /> Edit Profile</button>
                    <button onClick={() => addToast("Password change coming soon.", 'info')} className="w-full text-left px-4 py-3 text-sm font-semibold text-[#6B7280] hover:bg-[#F7F7F7] hover:text-[#1A1C23] flex items-center gap-3"><Lock size={16} /> Change Password</button>
                    <div className="border-t border-[#E5E7EB]"></div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-[#EA001E] hover:bg-red-50 flex items-center gap-3"><LogOut size={16} /> Logout</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="p-6 max-w-[1440px] mx-auto w-full flex-1 pb-16">
            {/* Tabs content identical to previous, use the CSS variables */}
            {/* Overview Tab */}
            {activeTab === 'overview' && data && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider">Gross Revenue</span>
                      <DollarSign size={20} className="text-[#2B4FB9] opacity-50" />
                    </div>
                    <div className="text-3xl font-black text-[#1A1C23]">₱{data.metrics.total_sales.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider">Total Orders</span>
                      <ShoppingBag size={20} className="text-[#FE9339] opacity-50" />
                    </div>
                    <div className="text-3xl font-black text-[#1A1C23]">{data.metrics.total_orders}</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider">Avg. Order Value</span>
                      <TrendingUp size={20} className="text-[#2B4FB9] opacity-50" />
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
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                    <h2 className="font-bold text-lg text-[#1A1C23] mb-6">Revenue Trend (7 Days)</h2>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12, fontWeight: 600}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12, fontWeight: 600}} tickFormatter={(v) => `₱${v}`} />
                          <Tooltip cursor={{fill: '#F7F7F7'}} contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB'}} />
                          <Bar dataKey="daily_sales" fill="#2B4FB9" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-[#E5E7EB]"><h2 className="font-bold text-lg text-[#1A1C23]">Live Activity</h2></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {liveFeed.length === 0 ? <p className="text-sm text-[#6B7280]">No activity yet...</p> : liveFeed.slice(0, 5).map(log => (
                        <div key={log.id} className="flex justify-between items-center p-3 bg-[#F7F7F7] border border-[#E5E7EB] rounded-lg text-sm">
                          <p className="font-medium text-[#1A1C23]"><b>{log.user_name}</b>: {log.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Reports, Payments, Menu, Inventory, Recipes, Categories, Settings tabs from previous code */}
          </div>

          <footer className="fixed bottom-0 right-0 h-8 bg-white border-t border-[#E5E7EB] flex items-center justify-between px-6 text-xs font-semibold text-[#6B7280] z-20" style={{ left: sidebarOpen ? '240px' : '64px', transition: 'all 0.3s' }}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Activity size={12} className="text-[#45C65A]" /> System Online</span>
              <span className="hidden md:inline">Database: Connected</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}