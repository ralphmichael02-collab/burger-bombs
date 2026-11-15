import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Utensils, ShieldCheck, MapPin, ArrowRight, Store } from 'lucide-react';

export default function LandingPage() {
  const [settings, setSettings] = useState(null);
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`).then(res => res.json()).then(setSettings);
    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`).then(res => res.json()).then(setMenu);
  }, []);

  if (!settings) return <div className="h-screen flex items-center justify-center bg-[#1A1C23] text-white font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F7F7F7] font-['Source_Sans_Pro',sans-serif]">
      {settings.promo_banner_text && (
        <div className="bg-[#2B4FB9] text-white text-center py-2 px-4 text-sm font-bold tracking-wide z-50 relative">{settings.promo_banner_text}</div>
      )}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/90 border-b border-[#E5E7EB] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {settings.logo_url ? <img src={settings.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover shadow-md border-2 border-white" /> : <div className="w-12 h-12 rounded-full bg-[#2B4FB9] flex items-center justify-center text-white shadow-md"><Utensils size={24} strokeWidth={2.5} /></div>}
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#1A1C23]">{settings.restaurant_name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-sm font-bold text-[#6B7280] hover:text-[#1A1C23] transition hidden md:flex items-center gap-2"><Store size={16} /> Merchant Portal</Link>
            <Link to="/store" className="bg-[#2B4FB9] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#1E3A8A] transition shadow-lg flex items-center gap-2">Order Now <ArrowRight size={16} /></Link>
          </div>
        </div>
      </nav>
      <header className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {settings.hero_image_url ? <img src={settings.hero_image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 bg-[#1A1C23]"></div>}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#F7F7F7]"></div>
        <div className="relative z-10 px-6 text-center max-w-4xl mx-auto mt-16">
          <p className="text-[#FE9339] font-bold tracking-[0.2em] uppercase text-sm mb-4">{settings.tagline}</p>
          <h2 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight drop-shadow-2xl">{settings.hero_title}</h2>
          <p className="text-lg md:text-2xl text-gray-300 mb-10 font-medium max-w-2xl mx-auto">{settings.hero_subtitle}</p>
          <Link to="/store" className="bg-[#2B4FB9] text-white text-lg font-black px-10 py-4 rounded-full shadow-xl hover:bg-[#1E3A8A] hover:scale-105 transition-all inline-flex items-center gap-2">Start Your Order <ArrowRight size={20} /></Link>
        </div>
      </header>
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10 -mt-20">
        <div className="flex justify-between items-end mb-12">
          <div><h3 className="text-4xl font-black text-[#1A1C23] mb-2">Fan Favorites</h3><p className="text-[#6B7280] text-lg">Log in to see live stock and unlock ordering.</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {menu.slice(0, 3).map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group border border-[#E5E7EB]">
              <div className="h-64 overflow-hidden relative">
                {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full bg-[#F7F7F7] flex items-center justify-center"><Utensils size={48} opacity={0.2} /></div>}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-black text-[#1A1C23] shadow-sm uppercase">{item.category}</div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-2xl font-bold text-[#1A1C23]">{item.name}</h4>
                  <p className="text-[#2B4FB9] font-black text-xl">₱{item.price}</p>
                </div>
                <Link to="/store" className="mt-4 block text-center w-full bg-[#F7F7F7] hover:bg-[#E5E7EB] text-[#1A1C23] font-bold py-3 rounded-lg transition border border-[#E5E7EB]">Order to View</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="about" className="py-24 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="w-16 h-1 bg-[#2B4FB9] rounded-full mb-8"></div>
            <h3 className="text-4xl md:text-5xl font-black text-[#1A1C23]">The Story Behind {settings.restaurant_name}</h3>
            <p className="text-lg text-[#6B7280] leading-relaxed">{settings.about_text || "We serve the best burgers in town."}</p>
          </div>
          <div className="bg-[#F7F7F7] p-10 rounded-3xl border border-[#E5E7EB] shadow-lg">
            <h3 className="text-2xl font-black text-[#1A1C23] mb-6 flex items-center gap-2"><ShieldCheck size={24} className="text-[#2B4FB9]" /> Get in Touch</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-[#2B4FB9]"><MapPin size={20} /></div>
              <div><p className="text-sm font-bold text-[#6B7280] uppercase">Location</p><p className="text-lg font-bold text-[#1A1C23]">123 Burger St, Manila</p></div>
            </div>
          </div>
        </div>
      </section>
      <footer className="bg-[#1A1C23] text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#2B4FB9] flex items-center justify-center text-white"><Utensils size={14} /></div><p className="text-white font-bold text-xl">{settings.restaurant_name}</p></div>
          <p className="text-sm">© {new Date().getFullYear()} {settings.restaurant_name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}