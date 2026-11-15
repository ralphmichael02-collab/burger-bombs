// frontend/src/components/LandingPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Utensils, ShieldCheck, MapPin, ArrowRight, Store, LogIn } from 'lucide-react';

export default function LandingPage() {
  const [settings, setSettings] = useState(null);
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`).then(res => res.json()).then(setSettings);
    fetch(`${import.meta.env.VITE_API_BASE}/api/menu`).then(res => res.json()).then(setMenu);
  }, []);

  if (!settings) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-theme-bg font-sans selection:bg-theme-primary selection:text-black">
      
      {/* PROMO BANNER */}
      {settings.promo_banner_text && (
        <div className="bg-theme-primary text-black text-center py-2 px-4 text-sm font-bold tracking-wide z-50 relative">
          {settings.promo_banner_text}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-theme shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover shadow-md border-2 border-white" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-theme-primary flex items-center justify-center text-black shadow-md border-2 border-white">
                <Utensils size={24} strokeWidth={2.5} />
              </div>
            )}
            <h1 className="text-2xl font-black uppercase tracking-tight text-theme-primary">{settings.restaurant_name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-sm font-bold text-theme-secondary hover:text-theme-primary transition hidden md:flex items-center gap-2">
              <Store size={16} /> Merchant Portal
            </Link>
            <Link to="/store" className="bg-theme-primary text-black px-6 py-2.5 rounded-full font-bold hover:opacity-90 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2">
              Order Now <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {settings.hero_image_url ? (
          <img src={settings.hero_image_url} alt="Hero Background" className="absolute inset-0 w-full h-full object-cover animate-pulse-slow" />
        ) : (
          <div className="absolute inset-0 bg-slate-900"></div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-theme-bg"></div>

        <div className="relative z-10 px-6 text-center max-w-4xl mx-auto mt-16">
          <p className="text-theme-primary font-bold tracking-[0.2em] uppercase text-sm md:text-base mb-4 animate-float">
            {settings.tagline}
          </p>
          <h2 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
            {settings.hero_title}
          </h2>
          <p className="text-lg md:text-2xl text-gray-300 mb-10 font-medium max-w-2xl mx-auto drop-shadow-lg">
            {settings.hero_subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/store" className="bg-theme-primary text-black text-lg font-black px-10 py-4 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.6)] hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-2">
              Start Your Order <ArrowRight size={20} />
            </Link>
            <a href="#about" className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-lg font-bold px-10 py-4 rounded-full hover:bg-white/20 transition-all w-full sm:w-auto">
              Learn More
            </a>
          </div>
        </div>
      </header>

      {/* FEATURED MENU */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10 -mt-20">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h3 className="text-4xl font-black text-theme-primary mb-2">Fan Favorites</h3>
            <p className="text-theme-secondary text-lg">Log in to see live stock and unlock ordering.</p>
          </div>
          <Link to="/store" className="text-theme-primary font-bold hover:underline hidden md:flex items-center gap-2">
            View Full Menu <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {menu.slice(0, 3).map(item => (
            <div key={item.id} className="bg-theme-card rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-theme">
              <div className="h-64 overflow-hidden relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-theme-main flex items-center justify-center text-theme-secondary"><Utensils size={48} opacity={0.2} /></div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-black text-slate-800 shadow-sm uppercase tracking-wide">
                  {item.category}
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-2xl font-bold text-theme-primary">{item.name}</h4>
                  <p className="text-theme-primary font-black text-xl">₱{item.price}</p>
                </div>
                <Link to="/store" className="mt-4 block text-center w-full bg-theme-main hover:bg-theme-bg text-theme-primary font-bold py-3 rounded-xl transition border border-theme">
                  Order to View
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT & CONTACT */}
      <section id="about" className="py-24 bg-theme-card relative border-t border-theme">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-6">
            <div className="w-16 h-1 bg-theme-primary rounded-full mb-8"></div>
            <h3 className="text-4xl md:text-5xl font-black text-theme-primary leading-tight">The Story Behind {settings.restaurant_name}</h3>
            <p className="text-lg text-theme-secondary leading-relaxed">
              {settings.about_text || "We are passionate about serving the best food in town. Every ingredient is tracked, every order is cooked to perfection, and every delivery is tracked live to your door."}
            </p>
          </div>

          <div className="bg-theme-main p-10 rounded-3xl border border-theme shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-theme-primary opacity-10 rounded-bl-full"></div>
            <h3 className="text-2xl font-black text-theme-primary mb-6 flex items-center gap-2"><ShieldCheck size={24} className="text-theme-primary" /> Get in Touch</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-theme-card rounded-full flex items-center justify-center shadow-sm text-theme-primary"><MapPin size={20} /></div>
                <div>
                  <p className="text-sm font-bold text-theme-secondary uppercase">Location</p>
                  <p className="text-lg font-bold text-theme-primary">123 Burger St, Manila</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-gray-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-black font-black text-xs">
              <Utensils size={14} />
            </div>
            <p className="text-white font-bold text-xl">{settings.restaurant_name}</p>
          </div>
          <div className="flex gap-6 text-sm font-medium">
            <Link to="/store" className="hover:text-white transition">Order</Link>
            <Link to="/admin/login" className="hover:text-white transition">Merchant Login</Link>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} {settings.restaurant_name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}