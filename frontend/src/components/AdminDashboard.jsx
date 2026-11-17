// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  LayoutDashboard, CreditCard, Users, Utensils, Package, ChefHat, Folder, Settings, 
  LogOut, Menu, Bell, TrendingUp, DollarSign, ShoppingBag, AlertTriangle, 
  CheckCircle, Pencil, Trash2, Beef, FileText, Printer, Calendar,
  Search, Plus, X, User, Lock, Activity, Globe, Image, Store, Palette, Megaphone, MapPin
} from 'lucide-react';
import Modal from './ui/Modal';
import BranchModal from './BranchModal';
import { useToast } from './ui/Toast';
import { isLocalEnvironment } from '../utils/isLocal';
import { canAccessTab, ROLE_LABELS } from '../utils/roles';
import { API_BASE } from '../config/api';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Burgers' }, { id: 2, name: 'Combos' }, { id: 3, name: 'Sides' }, { id: 4, name: 'Drinks' }, { id: 5, name: 'Desserts' }
];

const PRESET_THEMES = [
  { name: 'Enterprise Orange', colors: { primary: '#EA580C', primaryHover: '#C2410C', background: '#FDFBF7', surface: '#FFFFFF', text: '#1A1C23', textMuted: '#6B7280', border: '#E5E7EB', success: '#45C65A', danger: '#EA001E' } },
  { name: 'Midnight Slate', colors: { primary: '#3b82f6', primaryHover: '#2563eb', background: '#0f172a', surface: '#1e293b', text: '#f8fafc', textMuted: '#94a3b8', border: '#334155', success: '#22C55E', danger: '#EF4444' } },
  { name: 'Fresh Bistro', colors: { primary: '#10b981', primaryHover: '#059669', background: '#f0fdf4', surface: '#ffffff', text: '#064e3b', textMuted: '#4b5563', border: '#d1fae5', success: '#16A34A', danger: '#DC2626' } },
  { name: 'Ocean Breeze', colors: { primary: '#0ea5e9', primaryHover: '#0284c7', background: '#f0f9ff', surface: '#ffffff', text: '#0f172a', textMuted: '#64748b', border: '#e0f2fe', success: '#10b981', danger: '#ef4444' } },
  { name: 'Berry Smoothie', colors: { primary: '#d946ef', primaryHover: '#c026d3', background: '#fdf4ff', surface: '#ffffff', text: '#4a044e', textMuted: '#86198f', border: '#fae8ff', success: '#10b981', danger: '#e11d48' } },
  { name: 'Golden Bakery', colors: { primary: '#eab308', primaryHover: '#ca8a04', background: '#fefce8', surface: '#ffffff', text: '#422006', textMuted: '#854d0e', border: '#fef08a', success: '#22c55e', danger: '#ef4444' } },
  { name: 'Forest Retreat', colors: { primary: '#15803d', primaryHover: '#166534', background: '#f0fdf4', surface: '#ffffff', text: '#14532d', textMuted: '#4b5563', border: '#bbf7d0', success: '#22c55e', danger: '#ef4444' } },
  { name: 'Crimson Luxe', colors: { primary: '#be123c', primaryHover: '#9f1239', background: '#fff1f2', surface: '#ffffff', text: '#4c0519', textMuted: '#9f1239', border: '#fecdd3', success: '#10b981', danger: '#e11d48' } }
];

const ICON_OPTIONS = ['ShieldCheck', 'MapPin', 'Zap', 'Clock', 'Truck', 'Star', 'Heart', 'Utensils'];

export default function AdminDashboard({ currentColors, setCurrentColors }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [staffList, setStaffList] = useState([]);
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
  const [branchList, setBranchList] = useState([]);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const isLocal = isLocalEnvironment();
  const staffUserRole = staffUser?.role;

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = () => {
    fetch(`${API_BASE}/api/admin/stats`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(console.error);
    fetch(`${API_BASE}/api/admin/chart-data`).then(r => r.json()).then(d => setChartData(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_BASE}/api/admin/menu`).then(r => r.json()).then(d => setMenuItems(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_BASE}/api/ingredients`).then(r => r.json()).then(d => setIngredients(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_BASE}/api/admin/pending-payments`).then(r => r.json()).then(d => setPendingPayments(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_BASE}/api/settings`).then(r => r.json()).then(d => setSettings(d)).catch(console.error);
    fetch(`${API_BASE}/api/admin/customers`).then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_BASE}/api/admin/staff`).then(r => r.json()).then(d => setStaffList(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_BASE}/api/admin/reviews`).then(r => r.json()).then(d => setReviews(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_BASE}/api/auth/live-feed`).then(r => r.json()).then(d => setLiveFeed(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_BASE}/api/admin/categories`).then(r => r.json()).then(d => { if (Array.isArray(d) && d.length > 0) setCategories(d); else setCategories(DEFAULT_CATEGORIES); }).catch(() => setCategories(DEFAULT_CATEGORIES));
    fetch(`${API_BASE}/api/branches/all`).then(r => r.json()).then(d => setBranchList(Array.isArray(d) ? d : [])).catch(console.error);
  };

  const fetchReports = () => {
    const { start, end } = reportDateRange;
    fetch(`${API_BASE}/api/admin/reports/sales?startDate=${start}&endDate=${end}`).then(r => r.json()).then(setSalesReport).catch(console.error);
    fetch(`${API_BASE}/api/admin/reports/inventory`).then(r => r.json()).then(setInventoryReport).catch(console.error);
  };

  useEffect(() => {
    const user = localStorage.getItem('staff_user');
    if (user) setStaffUser(JSON.parse(user));
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (staffUser && staffUser.role === 'inventory' && activeTab === 'overview') {
      setActiveTab('inventory');
    }
  }, [staffUser]);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, reportDateRange]);

  const handleUploadImage = async (e, field, target = 'settings') => {
    if (!isLocal) return addToast("Image uploads are only available in Local Mode.", 'error');
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
      const localRes = await fetch(`${API_BASE}/api/admin/upload-local`, { method: 'POST', body: localFormData });
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
    await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings)
    });
    addToast("Settings saved! Refresh to see changes.", 'success');
  };

  const loadRecipe = async (item) => {
    setSelectedRecipeItem(item);
    const res = await fetch(`${API_BASE}/api/admin/menu/${item.id}/recipe`);
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
    await fetch(`${API_BASE}/api/admin/menu/${selectedRecipeItem.id}/recipe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients: payload })
    });
    addToast("Recipe saved!", 'success'); setSelectedRecipeItem(null);
  };
  
  const clearRecipe = async () => {
    if (!isLocal || !window.confirm("Delete this recipe?")) return;
    await fetch(`${API_BASE}/api/admin/menu/${selectedRecipeItem.id}/recipe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients: [] })
    });
    addToast("Recipe cleared.", 'success'); setRecipeIngredients({}); setSelectedRecipeItem(null);
  };

  const handleRestock = async (id) => {
    if (!isLocal) return addToast("Restock is only available in Local Mode.", 'error');
    const amount = prompt("How many units?");
    if (!amount || isNaN(amount)) return;
    await fetch(`${API_BASE}/api/ingredients/${id}/restock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseInt(amount) }) });
    addToast(`Restocked ${amount}.`, 'success'); fetchData();
  };

  const openModal = (mode, item = null) => {
    setModalMode(mode);
    setSelectedItem(item || { name: '', price: '', cost: '', category: categories[0]?.name || 'Burgers', image_url: '', description: '' });
    setIsModalOpen(true);
  };
  
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!isLocal) return addToast("Only the local store can modify items.", 'error');
    const url = modalMode === 'edit' ? `${API_BASE}/api/admin/menu/${selectedItem.id}` : `${API_BASE}/api/admin/menu`;
    await fetch(url, { method: modalMode === 'edit' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selectedItem, price: parseFloat(selectedItem.price), cost: parseFloat(selectedItem.cost) }) });
    setIsModalOpen(false); addToast("Saved!", 'success'); fetchData();
  };
  
  const handleDeleteItem = async () => {
    if (!isLocal) return;
    await fetch(`${API_BASE}/api/admin/menu/${selectedItem.id}`, { method: 'DELETE' });
    setIsModalOpen(false); addToast("Deleted.", 'success'); fetchData();
  };

  const handleAddCategory = async (e) => {
    if (!isLocal) return;
    e.preventDefault(); const name = e.target.categoryName.value.trim(); if (!name) return;
    const res = await fetch(`${API_BASE}/api/admin/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (res.ok) { e.target.reset(); addToast("Added!", 'success'); fetchData(); } else { const d = await res.json(); addToast(d.error, 'error'); }
  };
  
  const handleDeleteCategory = async (id, name) => {
    if (!isLocal) return;
    if (!window.confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`${API_BASE}/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok) { addToast("Deleted.", 'success'); fetchData(); } else { const d = await res.json(); addToast(d.error, 'error'); }
  };

  const handleVerifyPayment = async (id) => {
    if (!window.confirm("Confirm payment received? This sends the order to the kitchen.")) return;
    await fetch(`${API_BASE}/api/orders/${id}/verify-payment`, { method: 'POST' });
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

  const handleSaveBranch = async () => {
    setBranchModalOpen(false);
    setEditingBranch(null);
    addToast('Branch saved!', 'success');
    fetchData();
  };

  const handleDeleteBranch = async (id, name) => {
    if (!window.confirm(`Delete branch "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/branches/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      addToast('Branch deleted.', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/admin/login'); };

  if (loading) return <div className="h-screen flex items-center justify-center bg-background text-primary font-bold text-xl">Loading...</div>;

  const navItems = [
    { id: 'overview',   label: 'Overview',        icon: LayoutDashboard },
    { id: 'reports',    label: 'Reports',         icon: FileText },
    { id: 'payments',   label: 'Payments',        icon: CreditCard, badge: pendingPayments.length },
    { id: 'customers',  label: 'CRM',             icon: Users },
    { id: 'staff',      label: 'Staff Accounts',  icon: User, adminOnly: true },
    { id: 'menu',       label: 'Menu',            icon: Utensils },
    { id: 'inventory',  label: 'Inventory',       icon: Package },
    { id: 'recipes',    label: 'Recipes',         icon: ChefHat },
    { id: 'categories', label: 'Categories',      icon: Folder },
    { id: 'branches',   label: 'Branches',        icon: MapPin },
    { id: 'content',    label: 'Website Content', icon: Globe },
    { id: 'settings',   label: 'Settings',        icon: Settings },
  ].filter(item => {
    if (item.adminOnly && staffUserRole !== 'admin') return false;
    return canAccessTab(staffUserRole, item.id);
  });

  return (
    <div className="min-h-screen flex bg-background text-text font-['Source_Sans_Pro',sans-serif] relative">
      
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`bg-surface border-r border-border flex flex-col fixed h-[100dvh] z-40 transition-transform duration-300 w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:w-64`}>
        
        <div className="p-4 flex items-center justify-between border-b border-border h-16 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
              <Beef size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-text truncate">{settings?.restaurant_name || 'Burger Bombs'}</span>
          </div>
          <button className="md:hidden text-text-muted hover:text-text" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); if(window.innerWidth < 768) setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-semibold text-sm transition-all
                  ${activeTab === item.id ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-background hover:text-text'}`}>
                <div className="flex items-center gap-3"><Icon size={20} /> <span>{item.label}</span></div>
                {item.badge > 0 && <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>}
              </button>
            );
          })}

          {isLocal && (
            <div className="pt-4 mt-4 border-t border-border">
              <p className="px-3 text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Local Apps</p>
              <a href="/pos" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-sm text-text-muted hover:bg-background hover:text-primary transition">
                <LayoutDashboard size={20} /> POS Terminal
              </a>
              <a href="/kitchen" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-sm text-text-muted hover:bg-background hover:text-primary transition">
                <ChefHat size={20} /> Kitchen Display
              </a>
              <a href="/kiosk" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-sm text-text-muted hover:bg-background hover:text-primary transition">
                <Store size={20} /> Kiosk
              </a>
            </div>
          )}

          {!isLocal && (
            <div className="pt-4 mt-4 border-t border-border">
              <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-xs font-bold text-orange-500">☁️ Cloud Read-Only</p>
                <p className="text-xs text-orange-500/80 mt-1 leading-tight">You can track sales and orders, but editing is disabled on the cloud.</p>
              </div>
            </div>
          )}
        </nav>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-64'}`}>
        
        <header className="bg-surface h-16 border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-text-muted hover:bg-background transition md:hidden">
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold text-text capitalize truncate">{activeTab.replace('content', 'Website Content').replace('staff', 'Staff Accounts')}</h1>
          </div>
          
          <div className="flex items-center gap-4 relative">
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 relative rounded-full hover:bg-background transition">
                <Bell size={20} className="text-text-muted" />
                {liveFeed.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full"></span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                  <div className="p-4 border-b border-border bg-background"><h3 className="font-bold text-text">Notifications</h3></div>
                  <div className="max-h-64 overflow-y-auto">
                    {liveFeed.length === 0 ? <p className="p-4 text-sm text-text-muted">No new notifications</p> : liveFeed.slice(0, 5).map(log => (
                      <div key={log.id} className="p-4 border-b border-border hover:bg-background">
                        <p className="text-sm font-semibold text-text">{log.user_name}</p>
                        <p className="text-xs text-text-muted">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-border relative" ref={profileRef}>
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 hover:opacity-80 transition">
                <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">{staffUser?.name?.charAt(0) || 'A'}</div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-bold text-text leading-tight">{staffUser?.name || 'Admin'}</p>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">{ROLE_LABELS[staffUserRole] || 'Administrator'}</p>
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute top-12 right-0 mt-2 w-56 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                  <div className="p-4 border-b border-border bg-background">
                    <p className="text-sm font-bold text-text">{staffUser?.name}</p>
                    <p className="text-xs text-text-muted">{staffUser?.email}</p>
                  </div>
                  <button onClick={() => addToast("Profile Edit coming soon.", 'info')} className="w-full text-left px-4 py-3 text-sm font-semibold text-text-muted hover:bg-background hover:text-text flex items-center gap-3"><User size={16} /> Edit Profile</button>
                  <button onClick={() => addToast("Password change coming soon.", 'info')} className="w-full text-left px-4 py-3 text-sm font-semibold text-text-muted hover:bg-background hover:text-text flex items-center gap-3"><Lock size={16} /> Change Password</button>
                  <div className="border-t border-border"></div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-danger hover:bg-red-50 flex items-center gap-3"><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 flex-1 pb-16 max-w-[1600px] w-full mx-auto overflow-hidden">
          
          {activeTab === 'overview' && data && (
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface p-4 md:p-5 rounded-xl border border-border shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs md:text-sm font-semibold text-text-muted uppercase tracking-wider">Gross Revenue</span>
                    <DollarSign size={20} className="text-primary opacity-50" />
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-text truncate">₱{data.metrics.total_sales.toLocaleString()}</div>
                </div>
                <div className="bg-surface p-4 md:p-5 rounded-xl border border-border shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs md:text-sm font-semibold text-text-muted uppercase tracking-wider">Total Orders</span>
                    <ShoppingBag size={20} className="text-orange-500 opacity-50" />
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-text">{data.metrics.total_orders}</div>
                </div>
                <div className="bg-surface p-4 md:p-5 rounded-xl border border-border shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs md:text-sm font-semibold text-text-muted uppercase tracking-wider">Avg. Order Value</span>
                    <TrendingUp size={20} className="text-primary opacity-50" />
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-text truncate">₱{(data.metrics.total_sales / data.metrics.total_orders || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gradient-to-br from-[#45C65A] to-[#34A853] p-4 md:p-5 rounded-xl shadow-md text-white">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs md:text-sm font-semibold text-white/80 uppercase tracking-wider">Net Profit</span>
                    <DollarSign size={20} className="text-white/50" />
                  </div>
                  <div className="text-2xl md:text-3xl font-black truncate">₱{(data.metrics.net_profit || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 bg-surface p-4 md:p-6 rounded-xl border border-border shadow-sm">
                  <h2 className="font-bold text-base md:text-lg text-text mb-4 md:mb-6">Revenue Trend (7 Days)</h2>
                  <div className="h-64 md:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600}} tickFormatter={(v) => `₱${v}`} width={60} />
                        <Tooltip cursor={{fill: 'var(--color-background)'}} contentStyle={{borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)'}} />
                        <Bar dataKey="daily_sales" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 md:p-5 border-b border-border"><h2 className="font-bold text-base md:text-lg text-text">Live Activity</h2></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
                    {liveFeed.length === 0 ? <p className="text-sm text-text-muted">No activity yet...</p> : liveFeed.slice(0, 5).map(log => (
                      <div key={log.id} className="flex justify-between items-center p-3 bg-background border border-border rounded-lg text-sm">
                        <p className="font-medium text-text"><b>{log.user_name}</b>: {log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4 md:space-y-6">
              <div className="bg-surface p-4 md:p-5 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary"><FileText size={20} /></div>
                  <h2 className="text-base md:text-lg font-bold text-text">Business Reports</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 bg-background border border-border p-2 rounded-lg flex-1 sm:flex-none">
                    <Calendar size={16} className="text-text-muted shrink-0" />
                    <input type="date" onChange={(e) => setReportDateRange({...reportDateRange, start: e.target.value})} className="bg-transparent text-sm font-semibold outline-none text-text w-full" />
                    <span className="text-text-muted text-sm">to</span>
                    <input type="date" onChange={(e) => setReportDateRange({...reportDateRange, end: e.target.value})} className="bg-transparent text-sm font-semibold outline-none text-text w-full" />
                  </div>
                  <button onClick={fetchReports} className="bg-background border border-border text-text p-2.5 rounded-lg hover:bg-gray-200 transition"><Search size={18} /></button>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 md:p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-background/50">
                  <h3 className="font-bold text-text">Sales Transactions</h3>
                  <button onClick={() => handlePrint('sales')} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover transition flex items-center gap-2 w-full sm:w-auto justify-center"><Printer size={16} /> Print Report</button>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-background border-b border-border">
                      <tr><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Order ID</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Date</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Type</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Method</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Status</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase text-right">Total</th></tr>
                    </thead>
                    <tbody>
                      {salesReport.map(o => (
                        <tr key={o.id} className="border-b border-border hover:bg-background">
                          <td className="p-3 md:p-4 font-bold text-text">#{o.id}</td>
                          <td className="p-3 md:p-4 text-sm text-text-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                          <td className="p-3 md:p-4"><span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{o.order_type}</span></td>
                          <td className="p-3 md:p-4 text-sm font-medium text-text">{o.payment_method}</td>
                          <td className="p-3 md:p-4"><span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${o.status === 'RECEIVED' ? 'bg-success/10 text-success' : 'bg-orange-500/10 text-orange-500'}`}>{o.status}</span></td>
                          <td className="p-3 md:p-4 text-right font-black text-text whitespace-nowrap">₱{o.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 md:p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-background/50">
                  <h3 className="font-bold text-text">Inventory Audit</h3>
                  <button onClick={() => handlePrint('inventory')} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover transition flex items-center gap-2 w-full sm:w-auto justify-center"><Printer size={16} /> Print Audit</button>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-background border-b border-border">
                      <tr><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Ingredient</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Unit</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase text-right">Actual Stock</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase text-right">Theoretical</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase text-right">Variance</th></tr>
                    </thead>
                    <tbody>
                      {inventoryReport.map(i => {
                        const variance = i.actual_stock - i.theoretical_usage;
                        return (
                          <tr key={i.id} className="border-b border-border hover:bg-background">
                            <td className="p-3 md:p-4 font-bold text-text">{i.name}</td>
                            <td className="p-3 md:p-4 text-sm text-text-muted">{i.unit}</td>
                            <td className="p-3 md:p-4 text-right font-bold text-text">{i.actual_stock.toFixed(2)}</td>
                            <td className="p-3 md:p-4 text-right text-sm text-text-muted">{i.theoretical_usage.toFixed(2)}</td>
                            <td className={`p-3 md:p-4 text-right font-bold ${variance < 0 ? 'text-danger' : 'text-success'}`}>{variance.toFixed(2)}</td>
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
            <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 md:p-5 border-b border-border bg-orange-500/10">
                <h2 className="font-bold text-base md:text-lg text-orange-500 flex items-center gap-2"><AlertTriangle size={20} /> Pending Payment Verifications</h2>
                <p className="text-sm text-orange-500/80 mt-1">Verify the GCash/Maya reference before sending to kitchen.</p>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-background border-b border-border">
                    <tr><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Order</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Method</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Ref #</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Total</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {pendingPayments.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-text-muted font-bold">No pending payments.</td></tr>
                    ) : pendingPayments.map(o => (
                      <tr key={o.id} className="border-b border-border hover:bg-background">
                        <td className="p-3 md:p-4 font-bold text-text">#{o.id}</td>
                        <td className="p-3 md:p-4"><span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{o.payment_method}</span></td>
                        <td className="p-3 md:p-4 font-mono text-sm text-text-muted">{o.payment_reference || 'N/A'}</td>
                        <td className="p-3 md:p-4 font-black text-text whitespace-nowrap">₱{o.total}</td>
                        <td className="p-3 md:p-4 text-right">
                          <button onClick={() => handleVerifyPayment(o.id)} className="bg-success text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-success/90 transition shadow-sm flex items-center gap-1 ml-auto">
                            <CheckCircle size={14} /> Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-4 md:space-y-6">
              <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 md:p-5 border-b border-border bg-background/50">
                  <h2 className="font-bold text-base md:text-lg text-text">Customer Database</h2>
                  <p className="text-sm text-text-muted">Track user activity, IP addresses, and lifetime spend.</p>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-background border-b border-border">
                      <tr><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Customer</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Contact</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Orders</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Lifetime Spend</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Last Delivery Address</th></tr>
                    </thead>
                    <tbody>
                      {customers.length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-text-muted font-bold">No customers registered yet.</td></tr>
                      ) : customers.map(c => (
                        <tr key={c.id} className="border-b border-border hover:bg-background">
                          <td className="p-3 md:p-4">
                            <p className="font-bold text-text">{c.name}</p>
                            <p className="text-xs text-text-muted">{c.email}</p>
                          </td>
                          <td className="p-3 md:p-4 text-sm text-text-muted">{c.phone || 'N/A'}</td>
                          <td className="p-3 md:p-4 font-bold text-text">{c.total_orders}</td>
                          <td className="p-3 md:p-4 font-black text-success whitespace-nowrap">₱{c.total_spent.toLocaleString()}</td>
                          <td className="p-3 md:p-4 text-xs text-text-muted max-w-[200px] truncate" title={c.last_address}>{c.last_address || 'No delivery yet'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 md:p-5 border-b border-border bg-orange-500/10">
                  <h2 className="font-bold text-base md:text-lg text-orange-500">Customer Feedback</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
                  {reviews.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 text-center text-text-muted font-bold py-8">No reviews yet.</div>
                  ) : reviews.map(r => (
                    <div key={r.id} className="border border-border rounded-xl p-4 bg-background">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-bold text-text">{r.customer_name || 'Guest'}</p>
                        <p className="text-orange-500 text-lg">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                      </div>
                      <p className="text-sm text-text-muted italic">"{r.comment}"</p>
                      <p className="text-xs text-text-muted mt-3 text-right">Order #{r.order_id} • {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border">
                <h2 className="font-bold text-xl mb-4 text-text flex items-center gap-2"><Users size={20} className="text-primary"/> Register New Employee</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const name = e.target.name.value;
                  const email = e.target.email.value;
                  const password = e.target.password.value;
                  const role = e.target.role.value;
                  const res = await fetch(`${API_BASE}/api/admin/staff`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                  });
                  if (res.ok) { e.target.reset(); addToast('Staff registered!', 'success'); fetchData(); } 
                  else { const d = await res.json(); addToast(d.error, 'error'); }
                }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-text-muted uppercase">Name</label><input name="name" required className="w-full border border-border p-3 rounded-lg mt-1 bg-background text-text" /></div>
                  <div><label className="text-xs font-bold text-text-muted uppercase">Email</label><input name="email" type="email" required className="w-full border border-border p-3 rounded-lg mt-1 bg-background text-text" /></div>
                  <div><label className="text-xs font-bold text-text-muted uppercase">Password</label><input name="password" type="password" required className="w-full border border-border p-3 rounded-lg mt-1 bg-background text-text" /></div>
                  <div><label className="text-xs font-bold text-text-muted uppercase">Role</label>
                    <select name="role" className="w-full border border-border p-3 rounded-lg mt-1 bg-background text-text">
                      <option value="manager">Manager</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="cashier">Cashier</option>
                      <option value="kitchen">Kitchen Staff</option>
                      <option value="inventory">Inventory Staff</option>
                      <option value="rider">Rider</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 pt-2">
                    <button type="submit" className="bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-primary-hover transition shadow-md w-full md:w-auto">Create Account</button>
                  </div>
                </form>
              </div>

              <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border bg-background/50"><h3 className="font-bold text-text">Manage Staff</h3></div>
                <table className="w-full text-left">
                  <thead className="bg-background border-b border-border">
                    <tr><th className="p-4 text-xs font-bold text-text-muted uppercase">Name</th><th className="p-4 text-xs font-bold text-text-muted uppercase">Email</th><th className="p-4 text-xs font-bold text-text-muted uppercase">Role</th><th className="p-4 text-xs font-bold text-text-muted uppercase text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {staffList.map(s => (
                      <tr key={s.id} className="border-b border-border hover:bg-background">
                        <td className="p-4 font-bold text-text">{s.name}</td>
                        <td className="p-4 text-sm text-text-muted">{s.email}</td>
                        <td className="p-4"><span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold uppercase">{s.role}</span></td>
                        <td className="p-4 text-right">
                          <button onClick={async () => {
                            if (!window.confirm(`Delete ${s.name}?`)) return;
                            await fetch(`${API_BASE}/api/admin/staff/${s.id}`, { method: 'DELETE' });
                            addToast('Staff removed', 'success'); fetchData();
                          }} className="text-danger font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100"><Trash2 size={14} className="inline mr-1" /> Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg md:text-xl font-bold text-text">Menu Catalog</h2>
                <button onClick={() => openModal('add')} disabled={!isLocal} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-primary-hover transition flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50">
                  <Plus size={18} /> Add Menu Item
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {menuItems.map(item => (
                  <div key={item.id} className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden group hover:shadow-lg transition flex flex-col">
                    <div className="h-40 md:h-48 overflow-hidden relative shrink-0">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full bg-background flex items-center justify-center"><Utensils size={32} className="text-text-muted opacity-50" /></div>}
                      <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-black text-text uppercase shadow-sm">{item.category}</span>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="font-bold text-base md:text-lg text-text leading-tight truncate">{item.name}</h3>
                        <span className="font-black text-primary whitespace-nowrap">₱{item.price}</span>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2 mb-3">{item.description || 'No description'}</p>
                      <div className="flex gap-2 mt-auto pt-4">
                        <button onClick={() => openModal('edit', item)} disabled={!isLocal} className="flex-1 bg-background hover:bg-gray-200 text-text-muted font-bold py-2 rounded-lg text-xs md:text-sm transition border border-border flex items-center justify-center gap-1 md:gap-2 disabled:opacity-50"><Pencil size={14} /> Edit</button>
                        <button onClick={() => openModal('delete', item)} disabled={!isLocal} className="flex-1 bg-red-50 hover:bg-red-100 text-danger font-bold py-2 rounded-lg text-xs md:text-sm transition flex items-center justify-center gap-1 md:gap-2 disabled:opacity-50"><Trash2 size={14} /> Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-background border-b border-border">
                    <tr><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Ingredient</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase">Current Stock</th><th className="p-3 md:p-4 text-xs font-bold text-text-muted uppercase text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {ingredients.map(ing => (
                      <tr key={ing.id} className="border-b border-border hover:bg-background">
                        <td className="p-3 md:p-4 font-bold text-text">{ing.name}</td>
                        <td className="p-3 md:p-4"><span className={`px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 w-fit ${ing.stock <= ing.low_stock ? 'bg-red-100 text-danger' : 'bg-green-100 text-success'}`}>{ing.stock} {ing.unit}</span></td>
                        <td className="p-3 md:p-4 text-right">
                          {isLocal ? <button onClick={() => handleRestock(ing.id)} className="bg-primary text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-primary-hover transition inline-flex items-center gap-1 md:gap-2"><Plus size={14} /> Restock</button> : <span className="text-text-muted text-xs md:text-sm italic">Cloud View Only</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
              <div className="bg-surface p-4 rounded-xl border border-border shadow-sm lg:w-1/4 shrink-0 lg:h-[calc(100vh-140px)] overflow-y-auto">
                <h2 className="font-bold text-base md:text-lg mb-4 text-text sticky top-0 bg-surface pb-2">Menu Items</h2>
                <div className="space-y-2">
                  {menuItems.map(item => (
                    <button key={item.id} onClick={() => loadRecipe(item)} className={`w-full text-left p-2 md:p-3 rounded-lg border font-bold text-sm transition ${selectedRecipeItem?.id === item.id ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'border-border hover:bg-background text-text-muted'}`}>{item.name}</button>
                  ))}
                </div>
              </div>

              <div className="flex-1 bg-surface p-4 md:p-8 rounded-xl shadow-sm border border-border">
                {!selectedRecipeItem ? (
                  <div className="text-center text-text-muted py-20 font-bold text-lg md:text-xl flex flex-col items-center gap-4"><ChefHat size={48} opacity={0.2} /> Select a menu item to build its recipe.</div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 pb-4 border-b border-border gap-4">
                      <h2 className="font-black text-xl md:text-3xl text-text">Recipe: {selectedRecipeItem.name}</h2>
                      <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                        <button onClick={clearRecipe} disabled={!isLocal} className="flex-1 sm:flex-none bg-red-50 text-danger px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold hover:bg-red-100 transition shadow-sm flex items-center justify-center gap-2 text-sm md:text-base disabled:opacity-50"><Trash2 size={16} /> Clear</button>
                        <button onClick={saveRecipe} disabled={!isLocal} className="flex-1 sm:flex-none bg-success text-white px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold hover:bg-success/90 transition shadow-md flex items-center justify-center gap-2 text-sm md:text-base disabled:opacity-50"><CheckCircle size={16} /> Save</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                      <div>
                        <h3 className="font-bold text-base md:text-lg mb-4 text-text flex items-center gap-2"><Beef size={20} /> Raw Ingredients</h3>
                        <div className="space-y-2 md:space-y-3">
                          {ingredients.map(ing => (
                            <div key={`ing_${ing.id}`} className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:bg-gray-100 transition">
                              <div className="truncate pr-2"><span className="font-bold text-text text-sm md:text-base">{ing.name}</span><span className="text-xs text-text-muted ml-2">({ing.unit})</span></div>
                              <input type="number" step="0.01" disabled={!isLocal} value={recipeIngredients[`ing_${ing.id}`] || ''} onChange={(e) => handleRecipeChange(`ing_${ing.id}`, e.target.value)} placeholder="0" className="w-20 md:w-24 border-border border p-1.5 md:p-2 rounded-lg text-right font-bold bg-surface text-text focus:ring-2 focus:ring-primary outline-none text-sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-base md:text-lg mb-4 text-text flex items-center gap-2"><Utensils size={20} /> Combo Components</h3>
                        <div className="space-y-2 md:space-y-3">
                          {menuItems.filter(m => m.id !== selectedRecipeItem.id).map(comp => (
                            <div key={`comp_${comp.id}`} className="flex items-center justify-between p-3 border border-primary/30 rounded-lg bg-primary/5 transition">
                              <div className="truncate pr-2"><span className="font-bold text-text text-sm md:text-base">{comp.name}</span><span className="text-xs text-primary ml-2 hidden sm:inline">(Menu Item)</span></div>
                              <input type="number" step="1" disabled={!isLocal} value={recipeIngredients[`comp_${comp.id}`] || ''} onChange={(e) => handleRecipeChange(`comp_${comp.id}`, e.target.value)} placeholder="0" className="w-20 md:w-24 border-border border p-1.5 md:p-2 rounded-lg text-right font-bold bg-surface text-text focus:ring-2 focus:ring-primary outline-none text-sm" />
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
            <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
              <div className="bg-surface p-4 md:p-8 rounded-xl shadow-sm border border-border">
                <h2 className="font-bold text-lg md:text-2xl mb-4 md:mb-6 text-text">Add New Category</h2>
                <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <input name="categoryName" required disabled={!isLocal} placeholder="e.g. Tacos, Pasta, Coffee" className="flex-1 border-border border p-3 md:p-4 rounded-lg bg-background text-text focus:bg-surface transition font-medium outline-none focus:ring-2 focus:ring-primary" />
                  <button type="submit" disabled={!isLocal} className="bg-primary text-white px-6 md:px-8 py-3 md:py-4 font-bold rounded-lg hover:bg-primary-hover transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"><Plus size={18} /> Add</button>
                </form>
              </div>
              <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="p-4 md:p-6 border-b border-border bg-background/50"><h2 className="font-bold text-lg md:text-xl text-text">Manage Categories</h2></div>
                <ul>
                  {categories.map(cat => (
                    <li key={cat.id} className="flex justify-between items-center p-4 md:p-5 border-b border-border last:border-0 hover:bg-background transition">
                      <span className="font-bold text-text text-base md:text-lg flex items-center gap-2 md:gap-3 truncate pr-2"><Folder size={18} className="text-text-muted shrink-0" /> {cat.name}</span>
                      <button onClick={() => handleDeleteCategory(cat.id, cat.name)} disabled={!isLocal} className="text-danger bg-red-50 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1 md:gap-2 shrink-0"><Trash2 size={14} /> Delete</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'branches' && (
            <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-text">Store Branches</h2>
                  <p className="text-sm text-text-muted">Manage locations, delivery zones, and map pins.</p>
                </div>
                <button
                  onClick={() => { setEditingBranch(null); setBranchModalOpen(true); }}
                  disabled={!isLocal}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-primary-hover transition flex items-center gap-2 disabled:opacity-50 w-full sm:w-auto justify-center"
                >
                  <Plus size={18} /> Add Branch
                </button>
              </div>

              {!isLocal && (
                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-600 p-3 rounded-xl text-sm">
                  <b>Read-only on Cloud.</b> Switch to the local network to add or edit branches.
                </div>
              )}

              {branchList.length === 0 ? (
                <div className="bg-surface rounded-xl border border-border shadow-sm p-10 text-center">
                  <MapPin size={48} className="mx-auto mb-4 text-text-muted opacity-40" />
                  <p className="text-text-muted font-bold">No branches yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branchList.map((b) => (
                    <div key={b.id} className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-border bg-background/50 flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-text truncate">{b.name}</h3>
                            {b.is_main && <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">Main</span>}
                            {!b.is_active && <span className="text-[10px] font-black bg-danger/10 text-danger px-2 py-0.5 rounded uppercase">Inactive</span>}
                          </div>
                          <p className="text-xs text-text-muted mt-1 truncate">{b.address || 'No address'}</p>
                        </div>
                      </div>
                      <div className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Delivery Radius</span>
                          <span className="font-bold text-text">{b.delivery_radius_km} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Phone</span>
                          <span className="font-medium text-text">{b.phone || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Hours</span>
                          <span className="font-medium text-text">{b.hours || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Coordinates</span>
                          <span className="font-mono text-xs text-text">{Number(b.lat).toFixed(4)}, {Number(b.lng).toFixed(4)}</span>
                        </div>
                      </div>
                      <div className="p-3 border-t border-border bg-background/50 flex gap-2">
                        <button
                          onClick={() => { setEditingBranch(b); setBranchModalOpen(true); }}
                          disabled={!isLocal}
                          className="flex-1 bg-surface border border-border text-text-muted font-bold py-2 rounded-lg text-xs hover:bg-gray-100 transition disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(b.id, b.name)}
                          disabled={!isLocal}
                          className="flex-1 bg-red-50 text-danger font-bold py-2 rounded-lg text-xs hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'content' && settings && (
            <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto">
              <div className="bg-surface p-4 md:p-8 rounded-2xl border border-border shadow-sm">
                <h2 className="font-black text-xl md:text-2xl text-text mb-4 md:mb-6 flex items-center gap-3"><Globe size={24} className="text-primary" /> Browser & Branding</h2>
                <div className="space-y-4 md:space-y-5">
                  <div>
                    <label className="text-sm font-bold text-text-muted mb-1 block">Browser Tab Title</label>
                    <input type="text" disabled={!isLocal} value={settings.site_title || ''} onChange={e => setSettings({...settings, site_title: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background focus:bg-surface transition outline-none focus:ring-2 focus:ring-primary text-text" placeholder="e.g. Burger Bombs | Best Burgers in Manila" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-text-muted mb-2 block">Favicon (Browser Icon)</label>
                    <input type="file" accept="image/png,image/x-icon,image/svg+xml" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'favicon_url')} className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    {settings.favicon_url && (
                      <div className="mt-3 flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                        <img src={settings.favicon_url} alt="Favicon" className="w-8 h-8" />
                        <button onClick={() => setSettings({...settings, favicon_url: ''})} className="ml-auto text-danger hover:bg-red-50 p-1 rounded"><X size={16} /></button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-bold text-text-muted mb-2 block">Restaurant Logo</label>
                    <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'logo_url')} className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="mt-3 w-16 h-16 rounded-lg object-cover" />}
                  </div>
                </div>
              </div>

              <div className="bg-surface p-4 md:p-8 rounded-2xl border border-border shadow-sm">
                <h2 className="font-black text-xl md:text-2xl text-text mb-4 md:mb-6 flex items-center gap-3"><Image size={24} className="text-primary" /> Homepage Hero</h2>
                <div className="space-y-4 md:space-y-5">
                  <div>
                    <label className="text-sm font-bold text-text-muted mb-1 block">Hero Background Image (or GIF)</label>
                    <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'hero_image_url')} className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    {settings.hero_image_url && <img src={settings.hero_image_url} alt="Hero" className="mt-3 w-full h-40 object-cover rounded-xl" />}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">Hero Title</label><input type="text" disabled={!isLocal} value={settings.hero_title || ''} onChange={e => setSettings({...settings, hero_title: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" /></div>
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">Hero Subtitle</label><input type="text" disabled={!isLocal} value={settings.hero_subtitle || ''} onChange={e => setSettings({...settings, hero_subtitle: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">Button Text</label><input type="text" disabled={!isLocal} value={settings.hero_button_text || ''} onChange={e => setSettings({...settings, hero_button_text: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" /></div>
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">Button Link</label><input type="text" disabled={!isLocal} value={settings.hero_button_link || ''} onChange={e => setSettings({...settings, hero_button_link: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" placeholder="/store" /></div>
                  </div>
                </div>
              </div>

              <div className="bg-surface p-4 md:p-8 rounded-2xl border border-border shadow-sm">
                <h2 className="font-black text-xl md:text-2xl text-text mb-4 md:mb-6 flex items-center gap-3"><Megaphone size={24} className="text-primary" /> Ads & Commercials</h2>
                <div className="space-y-5">
                  <div className="flex items-center justify-between bg-background p-3 rounded-xl border border-border">
                    <div><p className="font-bold text-text">Show Promo Banner</p><p className="text-xs text-text-muted">Display a clickable image banner on the homepage.</p></div>
                    <input type="checkbox" disabled={!isLocal} checked={settings.show_ad_banner} onChange={e => setSettings({...settings, show_ad_banner: e.target.checked})} className="w-5 h-5 accent-primary" />
                  </div>
                  {settings.show_ad_banner && (
                    <div className="pl-4 space-y-3 border-l-2 border-primary/20">
                      <div>
                        <label className="text-sm font-bold text-text-muted mb-2 block">Banner Image (or GIF)</label>
                        <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'ad_banner_image_url')} className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                        {settings.ad_banner_image_url && <img src={settings.ad_banner_image_url} alt="Ad Banner" className="mt-3 w-full h-32 object-cover rounded-xl" />}
                      </div>
                      <div><label className="text-sm font-bold text-text-muted mb-1 block">Banner Link (URL)</label><input type="text" disabled={!isLocal} value={settings.ad_banner_link || ''} onChange={e => setSettings({...settings, ad_banner_link: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:ring-2 focus:ring-primary outline-none" placeholder="https://..." /></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-background p-3 rounded-xl border border-border mt-4">
                    <div><p className="font-bold text-text">Show Commercial Video</p><p className="text-xs text-text-muted">Embed a YouTube video or MP4 on the homepage.</p></div>
                    <input type="checkbox" disabled={!isLocal} checked={settings.show_video} onChange={e => setSettings({...settings, show_video: e.target.checked})} className="w-5 h-5 accent-primary" />
                  </div>
                  {settings.show_video && (
                    <div className="pl-4 border-l-2 border-primary/20">
                      <label className="text-sm font-bold text-text-muted mb-1 block">Video Embed URL</label>
                      <input type="text" disabled={!isLocal} value={settings.video_url || ''} onChange={e => setSettings({...settings, video_url: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:ring-2 focus:ring-primary outline-none" placeholder="https://www.youtube.com/embed/..." />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-surface p-4 md:p-8 rounded-2xl border border-border shadow-sm">
                <h2 className="font-black text-xl md:text-2xl text-text mb-4 md:mb-6 flex items-center gap-3"><MapPin size={24} className="text-primary" /> Contact Us Section</h2>
                <div className="space-y-4 md:space-y-5">
                  <div><label className="text-sm font-bold text-text-muted mb-1 block">Address Text</label><input type="text" disabled={!isLocal} value={settings.contact_address || ''} onChange={e => setSettings({...settings, contact_address: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:ring-2 focus:ring-primary outline-none" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">Latitude</label><input type="number" step="any" disabled={!isLocal} value={settings.contact_lat || 12.4989} onChange={e => setSettings({...settings, contact_lat: parseFloat(e.target.value)})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:ring-2 focus:ring-primary outline-none" /></div>
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">Longitude</label><input type="number" step="any" disabled={!isLocal} value={settings.contact_lng || 124.6377} onChange={e => setSettings({...settings, contact_lng: parseFloat(e.target.value)})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:ring-2 focus:ring-primary outline-none" /></div>
                  </div>
                  <p className="text-xs text-text-muted italic">Note: If you've added branches in the Branches tab, the homepage map uses those instead.</p>
                </div>
              </div>

              <div className="bg-surface p-4 md:p-8 rounded-2xl border border-border shadow-sm">
                <h2 className="font-black text-xl md:text-2xl text-text mb-4 md:mb-6 flex items-center gap-3">
                  <Lock size={24} className="text-primary" /> Login Page Branding
                </h2>
                <p className="text-xs text-text-muted mb-4">
                  These fields apply to <b>all</b> login screens (Merchant Portal, POS, Kitchen, Rider).
                  The logo above (in Browser & Branding) is reused here.
                </p>
                <div className="space-y-4 md:space-y-5">
                  <div>
                    <label className="text-sm font-bold text-text-muted mb-1 block">Login Welcome Title</label>
                    <input type="text" disabled={!isLocal} value={settings.login_welcome_title || ''} onChange={e => setSettings({...settings, login_welcome_title: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" placeholder="Welcome back" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-text-muted mb-1 block">Login Subtitle</label>
                    <input type="text" disabled={!isLocal} value={settings.login_welcome_subtitle || ''} onChange={e => setSettings({...settings, login_welcome_subtitle: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" placeholder="Sign in to continue" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-text-muted mb-2 block">Login Background Image</label>
                    <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'login_hero_image_url')} className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    {settings.login_hero_image_url && (
                      <div className="mt-3 relative">
                        <img src={settings.login_hero_image_url} alt="Login background" className="w-full h-40 object-cover rounded-xl border border-border" />
                        <button
                          onClick={() => setSettings({...settings, login_hero_image_url: ''})}
                          className="absolute top-2 right-2 bg-danger text-white p-1.5 rounded-lg shadow"
                          type="button"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-text-muted mt-2">If empty, the Homepage Hero image is used as a fallback.</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface p-4 md:p-8 rounded-2xl border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
                  <h2 className="font-black text-xl md:text-2xl text-text">Feature Highlights</h2>
                  <label className="flex items-center gap-2 cursor-pointer bg-background px-3 py-1.5 rounded-lg border border-border">
                    <input type="checkbox" disabled={!isLocal} checked={settings.show_features} onChange={e => setSettings({...settings, show_features: e.target.checked})} className="w-5 h-5 accent-primary" />
                    <span className="text-sm font-bold text-text-muted">Show on Homepage</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                  {[1, 2, 3].map(num => (
                    <div key={num} className="p-4 md:p-5 border border-border rounded-xl bg-background">
                      <p className="text-xs font-bold text-text-muted uppercase mb-3">Feature {num}</p>
                      <div className="space-y-3">
                        <div><label className="text-xs font-bold text-text-muted mb-1 block">Icon</label>
                          <select disabled={!isLocal} value={settings[`feature_${num}_icon`] || ''} onChange={e => setSettings({...settings, [`feature_${num}_icon`]: e.target.value})} className="w-full border-border border p-2 rounded-lg bg-surface text-sm text-text">
                            {ICON_OPTIONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                          </select>
                        </div>
                        <div><label className="text-xs font-bold text-text-muted mb-1 block">Title</label><input type="text" disabled={!isLocal} value={settings[`feature_${num}_title`] || ''} onChange={e => setSettings({...settings, [`feature_${num}_title`]: e.target.value})} className="w-full border-border border p-2 rounded-lg bg-surface text-sm text-text" /></div>
                        <div><label className="text-xs font-bold text-text-muted mb-1 block">Description</label><input type="text" disabled={!isLocal} value={settings[`feature_${num}_desc`] || ''} onChange={e => setSettings({...settings, [`feature_${num}_desc`]: e.target.value})} className="w-full border-border border p-2 rounded-lg bg-surface text-sm text-text" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface p-4 md:p-8 rounded-2xl border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
                  <h2 className="font-black text-xl md:text-2xl text-text">About Us Section</h2>
                  <label className="flex items-center gap-2 cursor-pointer bg-background px-3 py-1.5 rounded-lg border border-border">
                    <input type="checkbox" disabled={!isLocal} checked={settings.show_about} onChange={e => setSettings({...settings, show_about: e.target.checked})} className="w-5 h-5 accent-primary" />
                    <span className="text-sm font-bold text-text-muted">Show on Homepage</span>
                  </label>
                </div>
                <div className="space-y-4 md:space-y-5">
                  <div><label className="text-sm font-bold text-text-muted mb-1 block">About Title</label><input type="text" disabled={!isLocal} value={settings.about_title || ''} onChange={e => setSettings({...settings, about_title: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" /></div>
                  <div><label className="text-sm font-bold text-text-muted mb-1 block">About Description</label><textarea rows="4" disabled={!isLocal} value={settings.about_text || ''} onChange={e => setSettings({...settings, about_text: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" /></div>
                  <div>
                    <label className="text-sm font-bold text-text-muted mb-2 block">About Image</label>
                    <input type="file" accept="image/*" disabled={!isLocal || isUploading} onChange={e => handleUploadImage(e, 'about_image_url')} className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    {settings.about_image_url && <img src={settings.about_image_url} alt="About" className="mt-3 w-full h-40 object-cover rounded-xl" />}
                  </div>
                </div>
              </div>

              <div className="bg-surface p-4 md:p-8 rounded-2xl border border-border shadow-sm">
                <h2 className="font-black text-xl md:text-2xl text-text mb-4 md:mb-6">Footer & Social Media</h2>
                <div className="space-y-4 md:space-y-5">
                  <div><label className="text-sm font-bold text-text-muted mb-1 block">Footer Text</label><input type="text" disabled={!isLocal} value={settings.footer_text || ''} onChange={e => setSettings({...settings, footer_text: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">Facebook URL</label><input type="url" disabled={!isLocal} value={settings.social_facebook || ''} onChange={e => setSettings({...settings, social_facebook: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" placeholder="https://facebook.com/..." /></div>
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">Instagram URL</label><input type="url" disabled={!isLocal} value={settings.social_instagram || ''} onChange={e => setSettings({...settings, social_instagram: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" placeholder="https://instagram.com/..." /></div>
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">TikTok URL</label><input type="url" disabled={!isLocal} value={settings.social_tiktok || ''} onChange={e => setSettings({...settings, social_tiktok: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" placeholder="https://tiktok.com/@..." /></div>
                    <div><label className="text-sm font-bold text-text-muted mb-1 block">Twitter / X URL</label><input type="url" disabled={!isLocal} value={settings.social_twitter || ''} onChange={e => setSettings({...settings, social_twitter: e.target.value})} className="w-full border-border border p-3 rounded-xl bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none" placeholder="https://x.com/..." /></div>
                  </div>
                </div>
              </div>

              <button onClick={saveSettings} disabled={!isLocal || isUploading} className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-hover transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 sticky bottom-20 z-10">
                {isUploading ? 'Uploading...' : <><CheckCircle size={20} /> Save All Changes</>}
              </button>
            </div>
          )}

          {activeTab === 'settings' && settings && (
            <div className="bg-surface p-4 md:p-8 rounded-2xl shadow-sm border border-border max-w-5xl mx-auto">
              <h2 className="font-black text-2xl md:text-3xl text-text flex items-center gap-3 mb-6 md:mb-8 pb-4 md:pb-6 border-b border-border"><Settings size={28} className="text-primary" /> Store Settings</h2>
              
              <div className="space-y-8 md:space-y-10 mb-8 md:mb-10">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-text mb-4 flex items-center gap-2"><Palette size={20} /> One-Click Themes</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {PRESET_THEMES.map((preset) => {
                      const isActive = currentColors.primary === preset.colors.primary && currentColors.background === preset.colors.background;
                      return (
                        <button key={preset.name} type="button" disabled={!isLocal}
                          onClick={() => { setCurrentColors(preset.colors); addToast(`${preset.name} applied`, 'success'); }}
                          className={`relative p-3 md:p-4 rounded-xl border-2 transition-all text-left ${isActive ? 'border-primary shadow-md scale-[1.02]' : 'border-border hover:border-gray-300'}`}>
                          <div className="flex gap-1.5 md:gap-2 mb-2 md:mb-3">
                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full shadow-sm" style={{ backgroundColor: preset.colors.primary }}></div>
                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full shadow-sm border border-border" style={{ backgroundColor: preset.colors.background }}></div>
                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full shadow-sm border border-border" style={{ backgroundColor: preset.colors.surface }}></div>
                          </div>
                          <p className="font-bold text-text text-xs md:text-sm truncate">{preset.name}</p>
                          {isActive && <span className="absolute top-2 right-2 text-primary text-xs md:text-base">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg md:text-xl font-bold text-text mb-4 flex items-center gap-2"><Palette size={20} /> Customize Colors</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {[['primary', 'Primary (Buttons)'],['primaryHover', 'Primary Hover'],['background', 'Background'],['surface', 'Surface (Cards)'],['text', 'Text'],['textMuted', 'Muted Text'],['border', 'Borders'],['success', 'Success'],['danger', 'Danger']].map(([key, label]) => (
                      <div key={key} className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                        <input type="color" value={currentColors[key] || '#000000'} disabled={!isLocal} onChange={(e) => setCurrentColors({...currentColors, [key]: e.target.value})} className="w-8 h-8 md:w-10 md:h-10 rounded cursor-pointer border-none p-0 bg-transparent shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm font-bold text-text truncate">{label}</div>
                          <div className="text-[10px] md:text-xs text-text-muted font-mono">{currentColors[key]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div><label className="text-sm font-bold text-text-muted">Restaurant Name</label><input required disabled={!isLocal} value={settings.restaurant_name || ''} onChange={e => setSettings({...settings, restaurant_name: e.target.value})} className="w-full border-border border p-3 rounded-xl mt-2 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition" /></div>
                  <div><label className="text-sm font-bold text-text-muted">Tagline</label><input required disabled={!isLocal} value={settings.tagline || ''} onChange={e => setSettings({...settings, tagline: e.target.value})} className="w-full border-border border p-3 rounded-xl mt-2 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div><label className="text-sm font-bold text-text-muted">Contact Phone</label><input disabled={!isLocal} value={settings.contact_phone || ''} onChange={e => setSettings({...settings, contact_phone: e.target.value})} className="w-full border-border border p-3 rounded-xl mt-2 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition" /></div>
                  <div><label className="text-sm font-bold text-text-muted">Contact Email</label><input disabled={!isLocal} value={settings.contact_email || ''} onChange={e => setSettings({...settings, contact_email: e.target.value})} className="w-full border-border border p-3 rounded-xl mt-2 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div><label className="text-sm font-bold text-text-muted">Currency Symbol</label><input disabled={!isLocal} value={settings.currency_symbol || '₱'} onChange={e => setSettings({...settings, currency_symbol: e.target.value})} className="w-full border-border border p-3 rounded-xl mt-2 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition" /></div>
                  <div><label className="text-sm font-bold text-text-muted">Tax Rate</label><input type="number" step="0.01" disabled={!isLocal} value={settings.tax_rate || 0} onChange={e => setSettings({...settings, tax_rate: e.target.value})} className="w-full border-border border p-3 rounded-xl mt-2 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition" /></div>
                </div>
                <div><label className="text-sm font-bold text-text-muted">Promo Banner Text</label><input disabled={!isLocal} value={settings.promo_banner_text || ''} onChange={e => setSettings({...settings, promo_banner_text: e.target.value})} className="w-full border-border border p-3 rounded-xl mt-2 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition" /></div>
                <button onClick={saveSettings} disabled={!isLocal || isUploading} className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-hover transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"><CheckCircle size={20} /> Save Settings</button>
              </div>
            </div>
          )}

        </div>

        <footer className="bg-surface border-t border-border flex items-center justify-between px-4 md:px-6 py-2 text-xs font-semibold text-text-muted mt-auto shrink-0">
          <span className="flex items-center gap-1"><Activity size={12} className="text-success" /> {isLocal ? 'Local Mode' : 'Cloud Mode'} — System Online</span>
        </footer>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'delete' ? 'Confirm Deletion' : modalMode === 'edit' ? 'Edit Menu Item' : 'Add New Item'} variant={modalMode === 'delete' ? 'danger' : 'info'}>
        {modalMode === 'delete' ? (
          <div>
            <p className="text-text-muted mb-6 text-sm md:text-base">Are you sure you want to delete <b>{selectedItem?.name}</b>? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 md:py-3 bg-background text-text-muted font-bold rounded-lg hover:bg-gray-200 transition border border-border text-sm md:text-base">Cancel</button>
              <button onClick={handleDeleteItem} className="flex-1 py-2 md:py-3 bg-danger text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md flex items-center justify-center gap-2 text-sm md:text-base"><Trash2 size={16} /> Yes, Delete</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveItem} className="space-y-3 md:space-y-4">
            <div><label className="text-xs font-bold text-text-muted uppercase">Item Name</label><input required value={selectedItem?.name || ''} onChange={e => setSelectedItem({...selectedItem, name: e.target.value})} className="w-full border border-border p-2 md:p-3 rounded-lg mt-1 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition text-sm md:text-base" /></div>
            <div><label className="text-xs font-bold text-text-muted uppercase">Description</label><textarea rows="2" value={selectedItem?.description || ''} onChange={e => setSelectedItem({...selectedItem, description: e.target.value})} placeholder="Classic beef patty with lettuce, tomato, and house sauce" className="w-full border border-border p-2 md:p-3 rounded-lg mt-1 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition text-sm md:text-base" /></div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div><label className="text-xs font-bold text-text-muted uppercase">Price (₱)</label><input required type="number" step="0.01" value={selectedItem?.price || ''} onChange={e => setSelectedItem({...selectedItem, price: e.target.value})} className="w-full border border-border p-2 md:p-3 rounded-lg mt-1 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition text-sm md:text-base" /></div>
              <div><label className="text-xs font-bold text-text-muted uppercase">Cost (₱)</label><input required type="number" step="0.01" value={selectedItem?.cost || ''} onChange={e => setSelectedItem({...selectedItem, cost: e.target.value})} className="w-full border border-border p-2 md:p-3 rounded-lg mt-1 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition text-sm md:text-base" /></div>
            </div>
            <div><label className="text-xs font-bold text-text-muted uppercase">Category</label><select value={selectedItem?.category || ''} onChange={e => setSelectedItem({...selectedItem, category: e.target.value})} className="w-full border border-border p-2 md:p-3 rounded-lg mt-1 bg-background text-text focus:bg-surface focus:ring-2 focus:ring-primary outline-none transition text-sm md:text-base">{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
            <div><label className="text-xs font-bold text-text-muted uppercase">Image Upload</label><input type="file" accept="image/*" onChange={e => handleUploadImage(e, 'image_url', 'menu')} className="w-full mt-2 text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />{selectedItem?.image_url && <img src={selectedItem.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg mt-3 shadow-sm" />}</div>
            <div className="pt-2 md:pt-4 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 md:py-3 bg-background text-text-muted font-bold rounded-lg hover:bg-gray-200 transition border border-border text-sm md:text-base">Cancel</button>
              <button type="submit" disabled={isUploading} className="flex-1 py-2 md:py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base">{isUploading ? 'Uploading...' : <><CheckCircle size={16} /> Save Item</>}</button>
            </div>
          </form>
        )}
      </Modal>

      {branchModalOpen && (
        <BranchModal
          branch={editingBranch}
          onSave={handleSaveBranch}
          onClose={() => { setBranchModalOpen(false); setEditingBranch(null); }}
        />
      )}
    </div>
  );
}