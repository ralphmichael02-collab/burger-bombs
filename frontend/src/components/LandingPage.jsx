import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Utensils, ShieldCheck, MapPin, ArrowRight, Store, Star } from 'lucide-react';

export default function LandingPage() {
  const [settings, setSettings] = useState(null);
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`).then(res => res.json()).then(setSettings);
    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`).then(res => res.json()).then(setMenu);
  }, []);

  if (!settings) return <div className="h-screen flex items-center justify-center bg-[#1A1C23] text-white font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-['Source_Sans_Pro',sans-serif]">
      {/* PROMO BANNER */}
      {settings.promo_banner_text && (
        <div className="bg-[#EA580C] text-white text-center py-2 px-4 text-sm font-bold tracking-wide z-50 relative">
          {settings.promo_banner_text}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 backdrop-blur-lg bg-white/90 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#EA580C] flex items-center justify-center text-white shadow-md">
                <Utensils size={20} strokeWidth={2.5} />
              </div>
            )}
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#1A1C23]">{settings.restaurant_name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-sm font-bold text-gray-500 hover:text-[#1A1C23] transition hidden md:flex items-center gap-2">
              <Store size={16} /> Merchant Portal
            </Link>
            <Link to="/store" className="bg-[#EA580C] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#C2410C] transition shadow-lg flex items-center gap-2">
              Order Now <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        {settings.hero_image_url ? (
          <img src={settings.hero_image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#1A1C23]"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30"></div>
        
        <div className="relative z-10 px-6 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 bg-[#EA580C] rounded-full"></span>
              <p className="text-white font-bold tracking-widest uppercase text-sm">Delivering happiness daily</p>
            </div>
            <h2 className="text-6xl md:text-8xl font-black text-white mb-6 leading-[1.1] drop-shadow-lg">
              Cravings, <br/><span className="text-[#EA580C] italic font-serif">delivered fast.</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-10 font-medium max-w-lg">
              Fresh burgers, sizzling pizzas & crispy bites from our kitchen to your door in under 30 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/store" className="bg-[#EA580C] text-white text-lg font-black px-10 py-4 rounded-full shadow-[0_0_30px_rgba(234,88,12,0.4)] hover:bg-[#C2410C] transition-all flex items-center justify-center gap-2">
                Order Now <ArrowRight size={20} />
              </Link>
              <a href="#menu" className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-lg font-bold px-10 py-4 rounded-full hover:bg-white/20 transition-all flex items-center justify-center">
                View Menu
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURED MENU */}
      <section id="menu" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-black text-[#1A1C23] mb-4">Featured Categories</h3>
          <p className="text-gray-500 text-lg">Browse our most-loved food categories</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {menu.slice(0, 3).map(item => (
            <div key={item.id} className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 flex flex-col">
              <div className="h-64 overflow-hidden relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center"><Utensils size={48} className="text-gray-300" /></div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-black text-[#1A1C23] shadow-sm uppercase tracking-wide">
                  {item.category}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-2xl font-bold text-[#1A1C23]">{item.name}</h4>
                  <div className="flex items-center gap-1 text-[#EA580C] font-bold">
                    <Star size={16} fill="currentColor" /> 4.9
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <p className="text-2xl font-black text-[#1A1C23]">₱{item.price}</p>
                  <Link to="/store" className="bg-[#EA580C]/10 text-[#EA580C] hover:bg-[#EA580C] hover:text-white font-bold py-2 px-6 rounded-full transition-colors">
                    Add
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT & CONTACT */}
      <section id="about" className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h3 className="text-4xl md:text-5xl font-black text-[#1A1C23] mb-6">The Story Behind {settings.restaurant_name}</h3>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              {settings.about_text || "We are passionate about serving the best food in town. Every ingredient is tracked, every order is cooked to perfection, and every delivery is tracked live to your door."}
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#EA580C]/10 rounded-full flex items-center justify-center text-[#EA580C]"><ShieldCheck size={24} /></div>
              <div>
                <p className="font-bold text-[#1A1C23]">100% Quality Guaranteed</p>
                <p className="text-sm text-gray-500">Fresh ingredients sourced daily</p>
              </div>
            </div>
          </div>
          <div className="bg-[#FDFBF7] p-10 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-black text-[#1A1C23] mb-6">Get in Touch</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#EA580C]"><MapPin size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Location</p>
                  <p className="font-bold text-[#1A1C23]">123 Burger St, Manila</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1A1C23] text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EA580C] flex items-center justify-center text-white"><Utensils size={14} /></div>
            <p className="text-white font-bold text-xl">{settings.restaurant_name}</p>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} {settings.restaurant_name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}