// frontend/src/components/LandingPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`)
      .then(res => res.json())
      .then(data => setSettings(data));
  }, []);

  if (!settings) return <div className="h-screen flex items-center justify-center bg-black text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* NAVBAR */}
      <nav className="flex justify-between items-center p-6 bg-black text-white">
        <div className="flex items-center gap-3">
          {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover" />}
          <h1 className="text-2xl font-black uppercase tracking-widest">{settings.restaurant_name}</h1>
        </div>
        <div className="flex gap-4">
          <Link to="/store" className="bg-yellow-500 text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-400">Order Online</Link>
          <Link to="/admin" className="text-sm font-bold text-gray-400 hover:text-white mt-2">Admin</Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative h-[600px] flex items-center justify-center text-center bg-gray-900">
        {settings.hero_image_url && (
          <img src={settings.hero_image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="relative z-10 px-4">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6 drop-shadow-lg">{settings.hero_title}</h2>
          <p className="text-xl md:text-2xl text-gray-200 mb-8">{settings.hero_subtitle}</p>
          <Link to="/store" className="bg-yellow-500 text-black text-xl font-bold px-10 py-4 rounded-xl shadow-lg hover:bg-yellow-400 transition transform hover:scale-105 inline-block">
            Order Now
          </Link>
        </div>
      </header>

      {/* FEATURES */}
      <section className="py-20 px-6 max-w-6xl mx-auto text-center">
        <p className="text-sm font-bold text-yellow-600 uppercase tracking-widest mb-2">{settings.tagline}</p>
        <h3 className="text-4xl font-black mb-12">Why Choose Us?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-gray-50 rounded-2xl">
            <div className="text-4xl mb-4">🍔</div>
            <h4 className="text-xl font-bold mb-2">Fresh Ingredients</h4>
            <p className="text-gray-500">Real-time inventory tracking ensures every bite is fresh.</p>
          </div>
          <div className="p-8 bg-gray-50 rounded-2xl">
            <div className="text-4xl mb-4">🛵</div>
            <h4 className="text-xl font-bold mb-2">Live GPS Tracking</h4>
            <p className="text-gray-500">Watch your rider on the map from the kitchen to your door.</p>
          </div>
          <div className="p-8 bg-gray-50 rounded-2xl">
            <div className="text-4xl mb-4">⚡</div>
            <h4 className="text-xl font-bold mb-2">Lightning Fast</h4>
            <p className="text-gray-500">Offline-first architecture means your food starts cooking instantly.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-gray-500 p-8 text-center border-t border-gray-800">
        <p className="mb-4 text-white font-bold text-xl">{settings.restaurant_name}</p>
        <p className="text-sm">© {new Date().getFullYear()} {settings.restaurant_name}. All rights reserved.</p>
      </footer>
    </div>
  );
}