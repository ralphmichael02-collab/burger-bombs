// frontend/src/components/Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Utensils, ArrowRight, ShieldCheck, MapPin, Zap, Clock, 
  Truck, Star, Heart, Phone, Mail, Globe, Camera, MessageCircle, Music 
} from 'lucide-react';

const ICON_MAP = {
  ShieldCheck: <ShieldCheck size={32} className="text-primary" />,
  MapPin: <MapPin size={32} className="text-primary" />,
  Zap: <Zap size={32} className="text-primary" />,
  Clock: <Clock size={32} className="text-primary" />,
  Truck: <Truck size={32} className="text-primary" />,
  Star: <Star size={32} className="text-primary" />,
  Heart: <Heart size={32} className="text-primary" />,
  Utensils: <Utensils size={32} className="text-primary" />,
};

export default function Home() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background font-['Source_Sans_Pro',sans-serif]">
      
      {/* ─── NAVBAR ─── */}
      <nav className="bg-surface p-4 border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-md">
                <Utensils size={20} />
              </div>
            )}
            <div>
              <span className="text-xl font-black text-text block leading-tight">
                {settings?.restaurant_name || 'Burger Bombs'}
              </span>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider hidden sm:block">
                {settings?.tagline || 'Fresh & Fast'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => navigate(settings?.hero_button_link || '/store')}
            className="bg-primary text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-primary-hover transition active:scale-95"
          >
            Order Now
          </button>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {settings?.hero_image_url ? (
          <img src={settings.hero_image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gray-900" />
        )}
        <div className="absolute inset-0 bg-black/60" />
        
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto mt-16">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight drop-shadow-lg">
            {settings?.hero_title || 'The Best Burgers in Town'}
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-10 font-medium drop-shadow-md">
            {settings?.hero_subtitle || 'Order online and get it delivered hot and fresh.'}
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate(settings?.hero_button_link || '/store')}
              className="bg-primary text-white text-lg font-black py-4 px-10 rounded-2xl shadow-xl hover:bg-primary-hover transition transform hover:scale-105 flex items-center gap-2"
            >
              {settings?.hero_button_text || 'Start Your Order'} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── PROMO BANNER ─── */}
      {settings?.promo_banner_text && (
        <div className="bg-primary text-white py-3 text-center font-bold text-sm md:text-base tracking-wide shadow-inner">
          {settings.promo_banner_text}
        </div>
      )}

      {/* ─── FEATURES SECTION ─── */}
      {settings?.show_features && (
        <section className="py-20 px-4 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="bg-surface p-8 rounded-3xl border border-border shadow-sm text-center flex flex-col items-center hover:shadow-md transition">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  {ICON_MAP[settings[`feature_${num}_icon`]] || <ShieldCheck size={32} className="text-primary" />}
                </div>
                <h3 className="text-xl font-black text-text mb-3">
                  {settings[`feature_${num}_title`] || `Feature ${num}`}
                </h3>
                <p className="text-text-muted leading-relaxed">
                  {settings[`feature_${num}_desc`] || 'Description'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── ABOUT SECTION ─── */}
      {settings?.show_about && (
        <section className="py-20 px-4 bg-surface border-y border-border">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-4xl font-black text-text mb-6">
                {settings?.about_title || 'The Story Behind Our Food'}
              </h2>
              <p className="text-lg text-text-muted leading-relaxed mb-8">
                {settings?.about_text || 'We serve the best burgers in town, made with 100% fresh ingredients.'}
              </p>
              <button 
                onClick={() => navigate('/store')}
                className="text-primary font-bold flex items-center gap-2 hover:underline text-lg"
              >
                View our menu <ArrowRight size={18} />
              </button>
            </div>
            {settings?.about_image_url && (
              <div className="flex-1 w-full">
                <img 
                  src={settings.about_image_url} 
                  alt="About Us" 
                  className="w-full h-[400px] object-cover rounded-3xl shadow-xl border-4 border-background"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="bg-surface py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-8 h-8 rounded-md object-cover" />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <Utensils size={16} />
                </div>
              )}
              <span className="text-xl font-black text-text">{settings?.restaurant_name || 'Burger Bombs'}</span>
            </div>
            <p className="text-text-muted text-sm font-medium">
              {settings?.footer_text || '© 2026 Burger Bombs. All rights reserved.'}
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            {/* Social Links (Using generic icons since brand icons were removed from Lucide) */}
            <div className="flex gap-4">
              {settings?.social_facebook && (
                <a href={settings.social_facebook} target="_blank" rel="noreferrer" className="p-2 bg-background border border-border rounded-full text-text-muted hover:text-primary transition">
                  <Globe size={18} />
                </a>
              )}
              {settings?.social_instagram && (
                <a href={settings.social_instagram} target="_blank" rel="noreferrer" className="p-2 bg-background border border-border rounded-full text-text-muted hover:text-primary transition">
                  <Camera size={18} />
                </a>
              )}
              {settings?.social_tiktok && (
                <a href={settings.social_tiktok} target="_blank" rel="noreferrer" className="p-2 bg-background border border-border rounded-full text-text-muted hover:text-primary transition">
                  <Music size={18} /> 
                </a>
              )}
              {settings?.social_twitter && (
                <a href={settings.social_twitter} target="_blank" rel="noreferrer" className="p-2 bg-background border border-border rounded-full text-text-muted hover:text-primary transition">
                  <MessageCircle size={18} />
                </a>
              )}
            </div>
            
            {/* Contact Info */}
            <div className="flex flex-col md:flex-row gap-4 text-sm font-bold text-text-muted mt-2">
              {settings?.contact_phone && (
                <span className="flex items-center gap-2"><Phone size={14} /> {settings.contact_phone}</span>
              )}
              {settings?.contact_email && (
                <span className="flex items-center gap-2"><Mail size={14} /> {settings.contact_email}</span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}