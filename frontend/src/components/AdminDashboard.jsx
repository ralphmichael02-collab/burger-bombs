// frontend/src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Menu Form State
  const [newItem, setNewItem] = useState({ name: '', price: '', cost: '', category: 'Burgers', image_url: '' });
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Recipe / BOM State
  const [selectedRecipeItem, setSelectedRecipeItem] = useState(null);
  const [recipeIngredients, setRecipeIngredients] = useState({});

  const isLocal = window.location.hostname.includes('.test') || window.location.hostname.includes('localhost');

  const fetchData = () => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/stats`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
    fetch(`${import.meta.env.VITE_API_BASE}/api/ingredients`).then(r => r.json()).then(d => setIngredients(Array.isArray(d) ? d : []));
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu`).then(r => r.json()).then(d => setMenuItems(Array.isArray(d) ? d : []));
    fetch(`${import.meta.env.VITE_API_BASE}/api/admin/chart-data`).then(r => r.json()).then(d => setChartData(Array.isArray(d) ? d : []));
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
    recipe.forEach(r => { recipeMap[r.ingredient_id] = r.quantity; });
    setRecipeIngredients(recipeMap);
  };

  const handleRecipeChange = (ingId, qty) => {
    setRecipeIngredients(prev => ({ ...prev, [ingId]: parseFloat(qty) || 0 }));
  };

  const saveRecipe = async () => {
    if (!isLocal) return alert("Only the local store can edit recipes.");
    
    const payload = Object.keys(recipeIngredients).map(ingId => ({
      ingredient_id: parseInt(ingId),
      quantity: recipeIngredients[ingId]
    }));

    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${selectedRecipeItem.id}/recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: payload })
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
      // 1. Try Cloudinary first
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (cloudRes.ok) {
        const data = await cloudRes.json();
        setNewItem({ ...newItem, image_url: data.secure_url });
      } else {
        throw new Error("Cloudinary failed");
      }
    } catch (err) {
      // 2. Fallback to Local Backend if offline or Cloudinary fails
      console.warn("Cloudinary failed or offline. Saving locally...");
      
      try {
        const localFormData = new FormData();
        localFormData.append('image', file);
        
        const localRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/upload-local`, {
          method: 'POST',
          body: localFormData
        });
        
        const data = await localRes.json();
        if (data.url) {
          setNewItem({ ...newItem, image_url: data.url });
        }
      } catch (localErr) {
        alert("Failed to upload image entirely (both cloud and local).");
      }
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
      
    const method = editingId ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, price: parseFloat(newItem.price), cost: parseFloat(newItem.cost) })
    });
    
    setNewItem({ name: '', price: '', cost: '', category: 'Burgers', image_url: '' });
    setEditingId(null);
    fetchData();
    alert(editingId ? "Item updated!" : "Item added!");
  };

  const handleEditClick = (item) => {
    setNewItem({ 
      name: item.name, 
      price: item.price.toString(), 
      cost: item.cost ? item.cost.toString() : '0', 
      category: item.category || 'Burgers', 
      image_url: item.image_url || '' 
    });
    setEditingId(item.id);
    window.scrollTo(0, 0);
  };

  const handleDeleteMenu = async (id) => {
    if (!isLocal) return alert("Only the local store can delete menu items.");
    if (!window.confirm("Delete this item?")) return;
    
    await fetch(`${import.meta.env.VITE_API_BASE}/api/admin/menu/${id}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) return <div className="p-10 text-center text-xl">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Admin Management</h1>
            <p className="text-gray-500">{isLocal ? 'Local Store (Master Control)' : 'Cloud Store (Read Only)'}</p>
          </div>
          <div className="flex bg-white rounded-lg shadow-sm p-1">
            {['overview', 'inventory', 'menu', 'recipes'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-md font-bold capitalize transition ${activeTab === tab ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
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

            {/* SALES CHART */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
              <h2 className="font-bold text-xl mb-6">Sales (Last 7 Days)</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `₱${value}`} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}} 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="daily_sales" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b"><h2 className="font-bold text-xl">Recent Orders</h2></div>
              <div className="overflow-x-auto">
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
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b"><h2 className="font-bold text-xl">Inventory Management</h2></div>
            <div className="overflow-x-auto">
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
          </div>
        )}

        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit sticky top-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-xl">{editingId ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                {editingId && (
                  <button onClick={() => { setEditingId(null); setNewItem({ name: '', price: '', cost: '', category: 'Burgers', image_url: '' }); }} className="text-sm text-red-500 font-bold hover:underline">Cancel Edit</button>
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
                  <input required disabled={!isLocal} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full border p-2 rounded mt-1" />
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
              <div className="p-6 border-b"><h2 className="font-bold text-xl">Current Menu</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {menuItems.map(item => (
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
              <div className="space-y-2">
                {menuItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => loadRecipe(item)}
                    className={`w-full text-left p-3 rounded-lg border font-bold transition ${selectedRecipeItem?.id === item.id ? 'bg-yellow-50 border-yellow-500' : 'hover:bg-gray-50'}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              {!selectedRecipeItem ? (
                <div className="text-center text-gray-500 py-20">Select a menu item to edit its ingredients.</div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-bold text-2xl">Recipe: {selectedRecipeItem.name}</h2>
                    <button onClick={saveRecipe} disabled={!isLocal} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">Save Recipe</button>
                  </div>
                  
                  <div className="space-y-4">
                    {ingredients.map(ing => (
                      <div key={ing.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div>
                          <span className="font-bold text-gray-800">{ing.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({ing.unit})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.01"
                            disabled={!isLocal}
                            value={recipeIngredients[ing.id] || ''} 
                            onChange={(e) => handleRecipeChange(ing.id, e.target.value)}
                            placeholder="0"
                            className="w-24 border p-2 rounded text-right"
                          />
                          <span className="text-sm font-bold text-gray-500 w-8">{ing.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}