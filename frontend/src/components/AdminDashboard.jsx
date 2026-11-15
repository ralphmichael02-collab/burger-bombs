// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]); // 👈 New State
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Menu Form State
  const [newItem, setNewItem] = useState({ name: '', price: '', cost: '', category: 'Burgers', image_url: '' });
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [menuFilter, setMenuFilter] = useState('All'); 

  // Recipe / BOM State
  const [selectedRecipeItem, setSelectedRecipeItem] = useState(null);
  const [recipeIngredients, setRecipeIngredients] = useState({});

  const isLocal = window.location.hostname.includes('.test') || window.location.hostname.includes('localhost');

  const fetchData = () => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/stats`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
    fetch(`${import.meta.env.VITE_API_BASE}/api/ingredients`).then(r => r.json()).then(d => setIngredients(Array.isArray(d) ? d : []));
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu`).then(r => r.json()).then(d => setMenuItems(Array.isArray(d) ? d : []));
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/chart-data`).then(r => r.json()).then(d => setChartData(Array.isArray(d) ? d : []));
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories`).then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])); // 👈 Fetch Categories
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`).then(r => r.json()).then(d => setSettings(d));
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

  const handleRecipeChange = (key, qty) => {
    setRecipeIngredients(prev => ({ ...prev, [key]: parseFloat(qty) || 0 }));
  };

  const saveRecipe = async () => {
    if (!isLocal) return alert("Only the local store can edit recipes.");
    
    const payload = Object.keys(recipeIngredients).map(key => {
      const [type, id] = key.split('_');
      return {
        ingredient_id: type === 'ing' ? parseInt(id) : null,
        component_menu_item_id: type === 'comp' ? parseInt(id) : null,
        quantity: recipeIngredients[key]
      };
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
    await fetch(`${import.meta.env.VITE_API_BASE}/api/ingredients/${id}/restock`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseInt(amount) })
    });
    fetchData();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST', body: formData
      });
      
      if (cloudRes.ok) {
        const data = await cloudRes.json();
        setNewItem({ ...newItem, image_url: data.secure_url });
      } else {
        throw new Error("Cloudinary failed");
      }
    } catch (err) {
      const localFormData = new FormData();
      localFormData.append('image', file);
      const localRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/upload-local`, {
        method: 'POST', body: localFormData
      });
      const data = await localRes.json();
      if (data.url) setNewItem({ ...newItem, image_url: data.url });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitMenu = async (e) => {
    e.preventDefault();
    if (!isLocal) return alert("Only the local store can modify menu items.");
    
    const url = editingId 
      ? `${import.meta.env.VITE_API_BASE}/api/admin/menu/${editingId}`
      : `${import.meta.env.VITE_API_BASE}/api/admin/menu`;
      
    await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, price: parseFloat(newItem.price), cost: parseFloat(newItem.cost) })
    });
    
    setNewItem({ name: '', price: '', cost: '', category: categories[0]?.name || 'Burgers', image_url: '' });
    setEditingId(null);
    fetchData();
  };

  const handleEditClick = (item) => {
    setNewItem({ 
      name: item.name, price: item.price.toString(), cost: item.cost ? item.cost.toString() : '0', 
      category: item.category || 'Burgers', image_url: item.image_url || '' 
    });
    setEditingId(item.id);
    window.scrollTo(0, 0);
  };

  const handleDeleteMenu = async (id) => {
    if (!isLocal || !window.confirm("Delete this item?")) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // --- CATEGORY LOGIC ---
  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = e.target.categoryName.value.trim();
    if (!name) return;
    
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
    });
    
    if (res.ok) {
      e.target.reset();
      fetchData();
    } else {
      const d = await res.json();
      alert(d.error);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
    else {
      const d = await res.json();
      alert(d.error);
    }
  };

  if (loading) return <div className="p-10 text-center text-xl">Loading Dashboard...</div>;

  const filteredMenuItems = menuItems.filter(item => menuFilter === 'All' || item.category === menuFilter);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Admin Management</h1>
            <p className="text-gray-500">{isLocal ? 'Local Store (Master Control)' : 'Cloud Store (Read Only)'}</p>
          </div>
          <div className="flex bg-white rounded-lg shadow-sm p-1 overflow-x-auto">
            {/* 👇 Added 'categories' to the tabs */}
            {['overview', 'inventory', 'menu', 'recipes', 'categories', 'settings'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-md font-bold capitalize transition whitespace-nowrap ${activeTab === tab ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
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
                <p className="text-sm font-bold text-gray-400 uppercase">Gross Revenue</p>
                <p className="text-3xl font-black text-gray-900">₱{data.metrics.total_sales.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-bold text-gray-400 uppercase">Ingredient Cost</p>
                <p className="text-3xl font-black text-red-500">-₱{(data.metrics.total_cost || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border-2 border-green-500 shadow-sm bg-green-50">
                <p className="text-sm font-bold text-green-700 uppercase">Net Profit</p>
                <p className="text-4xl font-black text-green-600">₱{(data.metrics.net_profit || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-bold text-gray-400 uppercase">Total Orders</p>
                <p className="text-3xl font-black text-blue-600">{data.metrics.total_orders}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
              <h2 className="font-bold text-xl mb-6">Sales (Last 7 Days)</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `₱${value}`} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="daily_sales" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
            <div className="p-6 border-b"><h2 className="font-bold text-xl">Inventory Management</h2></div>
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
                        <button onClick={() => handleRestock(ing.id)} className="bg-green-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-green-700">Restock</button>
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

        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit sticky top-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-xl">{editingId ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                {editingId && (
                  <button onClick={() => { setEditingId(null); setNewItem({ name: '', price: '', cost: '', category: categories[0]?.name || 'Burgers', image_url: '' }); }} className="text-sm text-red-500 font-bold hover:underline">Cancel Edit</button>
                )}
              </div>
              
              {!isLocal && <p className="text-red-500 text-sm mb-4 font-bold">Only local store can modify items.</p>}
              
              <form onSubmit={handleSubmitMenu} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500">Name</label>
                  <input required disabled={!isLocal} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full border p-2 rounded mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-500">Price (₱)</label>
                    <input required type="number" step="0.01" disabled={!isLocal} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full border p-2 rounded mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Cost (₱)</label>
                    <input required type="number" step="0.01" disabled={!isLocal} value={newItem.cost} onChange={e => setNewItem({...newItem, cost: e.target.value})} className="w-full border p-2 rounded mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Category</label>
                  {/* 👇 Dynamic Category Dropdown */}
                  <select disabled={!isLocal} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white">
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Image (Cloudinary / Local Fallback)</label>
                  <input type="file" accept="image/*" disabled={!isLocal} onChange={handleImageUpload} className="w-full mt-1" />
                  {newItem.image_url && <img src={newItem.image_url} alt="Preview" className="w-full h-32 object-cover rounded mt-2" />}
                </div>
                <button type="submit" disabled={!isLocal || isUploading} className="w-full bg-black text-white font-bold py-2 rounded hover:bg-gray-800 disabled:opacity-50">
                  {isUploading ? 'Uploading...' : editingId ? 'Update Item' : 'Save to Local & Cloud'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b flex flex-col gap-4">
                <h2 className="font-bold text-xl">Current Menu</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {/* 👇 Dynamic Menu Filters */}
                  {['All', ...categories.map(c => c.name)].map(cat => (
                    <button key={cat} onClick={() => setMenuFilter(cat)} 
                      className={`px-3 py-1 text-sm font-bold rounded-lg border whitespace-nowrap transition ${menuFilter === cat ? 'bg-black text-white border-black' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {filteredMenuItems.map(item => (
                  <div key={item.id} className={`border rounded-xl p-4 flex gap-4 ${editingId === item.id ? 'border-yellow-500 bg-yellow-50' : ''}`}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg" loading="lazy" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">No Img</div>
                    )}
                    <div className="flex-1">
                      <div className="text-xs font-bold text-yellow-600">{item.category}</div>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-gray-500">₱{item.price}</div>
                      <div className="flex gap-4 mt-2">
                        <button onClick={() => handleEditClick(item)} disabled={!isLocal} className="text-blue-500 text-sm font-bold hover:underline">Edit</button>
                        <button onClick={() => handleDeleteMenu(item.id)} disabled={!isLocal} className="text-red-500 text-sm font-bold hover:underline">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RECIPES TAB */}
        {activeTab === 'recipes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
              <h2 className="font-bold text-xl mb-4">Select a Menu Item</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {menuItems.map(item => (
                  <button key={item.id} onClick={() => loadRecipe(item)}
                    className={`w-full text-left p-3 rounded-lg border font-bold transition ${selectedRecipeItem?.id === item.id ? 'bg-yellow-50 border-yellow-500' : 'hover:bg-gray-50'}`}>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              {!selectedRecipeItem ? (
                <div className="text-center text-gray-500 py-20">Select a menu item to edit its recipe.</div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-bold text-2xl">Recipe: {selectedRecipeItem.name}</h2>
                    <button onClick={saveRecipe} disabled={!isLocal} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">Save Recipe</button>
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-gray-700">Raw Ingredients</h3>
                  <div className="space-y-3 mb-6">
                    {ingredients.map(ing => (
                      <div key={`ing_${ing.id}`} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div><span className="font-bold text-gray-800">{ing.name}</span><span className="text-xs text-gray-500 ml-2">({ing.unit})</span></div>
                        <input type="number" step="0.01" disabled={!isLocal} value={recipeIngredients[`ing_${ing.id}`] || ''} onChange={(e) => handleRecipeChange(`ing_${ing.id}`, e.target.value)} placeholder="0" className="w-24 border p-2 rounded text-right" />
                      </div>
                    ))}
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-gray-700">Combo Components (Menu Items)</h3>
                  <div className="space-y-3">
                    {menuItems.filter(m => m.id !== selectedRecipeItem.id).map(comp => (
                      <div key={`comp_${comp.id}`} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                        <div><span className="font-bold text-gray-800">{comp.name}</span><span className="text-xs text-blue-500 ml-2">(Menu Item)</span></div>
                        <input type="number" step="1" disabled={!isLocal} value={recipeIngredients[`comp_${comp.id}`] || ''} onChange={(e) => handleRecipeChange(`comp_${comp.id}`, e.target.value)} placeholder="0" className="w-24 border p-2 rounded text-right" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* CATEGORIES TAB (NEW) */}
        {activeTab === 'categories' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="font-bold text-xl mb-4">Add New Category</h2>
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input name="categoryName" required disabled={!isLocal} placeholder="e.g. Tacos, Pasta, Coffee" className="flex-1 border p-3 rounded-lg" />
                <button type="submit" disabled={!isLocal} className="bg-black text-white px-6 font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50">Add</button>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b"><h2 className="font-bold text-xl">Manage Categories</h2></div>
              <ul>
                {categories.map(cat => (
                  <li key={cat.id} className="flex justify-between items-center p-4 border-b last:border-0 hover:bg-gray-50">
                    <span className="font-bold text-gray-800">{cat.name}</span>
                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} disabled={!isLocal} className="text-red-500 text-sm font-bold hover:underline">Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && settings && (
          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-bold text-2xl">Store Customization</h2>
                <p className="text-gray-500 text-sm">White-label the app for your restaurant brand.</p>
              </div>
              {!isLocal && <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-bold">Cloud View Only</span>}
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!isLocal) return alert("Only local store can edit settings.");
              await fetch(`${import.meta.env.VITE_API_BASE}/api/settings`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings)
              });
              alert("Settings saved! Refresh the homepage to see the changes.");
            }} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500">Restaurant Name</label>
                  <input required disabled={!isLocal} value={settings.restaurant_name} onChange={e => setSettings({...settings, restaurant_name: e.target.value})} className="w-full border p-3 rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Tagline</label>
                  <input required disabled={!isLocal} value={settings.tagline} onChange={e => setSettings({...settings, tagline: e.target.value})} className="w-full border p-3 rounded-lg mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500">Hero Title (Big Text)</label>
                  <input required disabled={!isLocal} value={settings.hero_title} onChange={e => setSettings({...settings, hero_title: e.target.value})} className="w-full border p-3 rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Hero Subtitle</label>
                  <input required disabled={!isLocal} value={settings.hero_subtitle} onChange={e => setSettings({...settings, hero_subtitle: e.target.value})} className="w-full border p-3 rounded-lg mt-1" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500">Logo URL (Cloudinary)</label>
                <input disabled={!isLocal} value={settings.logo_url || ''} onChange={e => setSettings({...settings, logo_url: e.target.value})} className="w-full border p-3 rounded-lg mt-1" placeholder="https://res.cloudinary.com/..." />
                {settings.logo_url && <img src={settings.logo_url} alt="Logo Preview" className="w-16 h-16 rounded-full object-cover mt-2" />}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500">Hero Background Image URL (Cloudinary)</label>
                <input disabled={!isLocal} value={settings.hero_image_url || ''} onChange={e => setSettings({...settings, hero_image_url: e.target.value})} className="w-full border p-3 rounded-lg mt-1" placeholder="https://res.cloudinary.com/..." />
                {settings.hero_image_url && <img src={settings.hero_image_url} alt="Hero Preview" className="w-full h-32 object-cover rounded-lg mt-2" />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500">Currency Symbol</label>
                  <input required disabled={!isLocal} value={settings.currency_symbol} onChange={e => setSettings({...settings, currency_symbol: e.target.value})} className="w-full border p-3 rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Tax Rate (e.g., 0.12 for 12%)</label>
                  <input required type="number" step="0.01" disabled={!isLocal} value={settings.tax_rate} onChange={e => setSettings({...settings, tax_rate: e.target.value})} className="w-full border p-3 rounded-lg mt-1" />
                </div>
              </div>

              <button type="submit" disabled={!isLocal} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50">
                Save Settings
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}