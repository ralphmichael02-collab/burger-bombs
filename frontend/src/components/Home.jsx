// frontend/src/components/Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Utensils, ArrowRight, ShieldCheck, MapPin, Zap, Clock, 
  Truck, Star, Heart, Phone, Mail, Globe, Camera, MessageCircle, Music, PlayCircle 
} from 'lucide-react';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
        if (data.site_title) document.title = data.site_title;
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
              <span className="text-xl font-black text-text block leading-tight">{settings?.restaurant_name || 'Burger Bombs'}</span>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider hidden sm:block">{settings?.tagline}</span>
            </div>
          </div>
          <button onClick={() => navigate(settings?.hero_button_link || '/store')} className="bg-primary text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-primary-hover transition active:scale-95">
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
            {settings?.hero_title}
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-10 font-medium drop-shadow-md">
            {settings?.hero_subtitle}
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => navigate(settings?.hero_button_link || '/store')} className="bg-primary text-white text-lg font-black py-4 px-10 rounded-2xl shadow-xl hover:bg-primary-hover transition transform hover:scale-105 flex items-center gap-2">
              {settings?.hero_button_text} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── PROMO BANNER TEXT ─── */}
      {settings?.promo_banner_text && (
        <div className="bg-primary text-white py-3 text-center font-bold text-sm md:text-base tracking-wide shadow-inner">
          {settings.promo_banner_text}
        </div>
      )}

      {/* ─── AD BANNER (Advertisements) ─── */}
      {settings?.show_ad_banner && settings?.ad_banner_image_url && (
        <section className="py-12 px-4 bg-background border-b border-border">
          <div className="max-w-4xl mx-auto">
            <a href={settings.ad_banner_link || '#'} target="_blank" rel="noreferrer" className="block rounded-3xl overflow-hidden shadow-2xl hover:scale-[1.01] transition-transform duration-300">
              <img src={settings.ad_banner_image_url} alt="Advertisement" className="w-full h-auto object-cover" />
            </a>
          </div>
        </section>
      )}

      {/* ─── COMMERCIAL VIDEO ─── */}
      {settings?.show_video && settings?.video_url && (
        <section className="py-20 px-4 bg-surface border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-black text-text mb-8 flex items-center justify-center gap-2">
              <PlayCircle size={32} className="text-primary" /> Watch Our Story
            </h2>
            <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-background">
              <iframe 
                src={settings.video_url} 
                title="Commercial Video" 
                className="w-full h-full" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </section>
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
                <h3 className="text-xl font-black text-text mb-3">{settings[`feature_${num}_title`]}</h3>
                <p className="text-text-muted leading-relaxed">{settings[`feature_${num}_desc`]}</p>
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
              <h2 className="text-4xl font-black text-text mb-6">{settings?.about_title}</h2>
              <p className="text-lg text-text-muted leading-relaxed mb-8">{settings?.about_text}</p>
              <button onClick={() => navigate('/store')} className="text-primary font-bold flex items-center gap-2 hover:underline text-lg">
                View our menu <ArrowRight size={18} />
              </button>
            </div>
            {settings?.about_image_url && (
              <div className="flex-1 w-full">
                <img src={settings.about_image_url} alt="About Us" className="w-full h-[400px] object-cover rounded-3xl shadow-xl border-4 border-background" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── CONTACT US SECTION ─── */}
      {settings?.show_contact && (
        <section className="py-20 px-4 max-w-6xl mx-auto">
          <h2 className="text-4xl font-black text-text mb-12 text-center">Find Us Here</h2>
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Contact Details */}
            <div className="flex-1 space-y-6">
              <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0"><MapPin size={24} /></div>
                <div>
                  <h3 className="font-bold text-text mb-1">Our Location</h3>
                  <p className="text-text-muted">{settings?.contact_address}</p>
                </div>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0"><Phone size={24} /></div>
                <div>
                  <h3 className="font-bold text-text mb-1">Call Us</h3>
                  <p className="text-text-muted">{settings?.contact_phone}</p>
                </div>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0"><Mail size={24} /></div>
                <div>
                  <h3 className="font-bold text-text mb-1">Email Us</h3>
                  <p className="text-text-muted">{settings?.contact_email}</p>
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="flex-1 bg-surface rounded-3xl border border-border shadow-xl overflow-hidden h-[400px]">
              <MapContainer 
                center={[settings?.contact_lat || 12.4989, settings?.contact_lng || 124.6377]} 
                zoom={14} 
                style={{ height: '100%', width: '100%', zIndex: 0 }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[settings?.contact_lat || 12.4989, settings?.contact_lng || 124.6377]}>
                  <Popup>{settings?.restaurant_name}</Popup>
                </Marker>
              </MapContainer>
            </div>
            
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="bg-surface py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
              {settings?.logo_url ? <img src={settings.logo_url} alt="Logo" className="w-8 h-8 rounded-md object-cover" /> : <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white"><Utensils size={16} /></div>}
              <span className="text-xl font-black text-text">{settings?.restaurant_name}</span>
            </div>
            <p className="text-text-muted text-sm font-medium">{settings?.footer_text}</p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex gap-4">
              {settings?.social_facebook && <a href={settings.social_facebook} target="_blank" rel="noreferrer" className="p-2 bg-background border border-border rounded-full text-text-muted hover:text-primary transition"><Globe size={18} /></a>}
              {settings?.social_instagram && <a href={settings.social_instagram} target="_blank" rel="noreferrer" className="p-2 bg-background border border-border rounded-full text-text-muted hover:text-primary transition"><Camera size={18} /></a>}
              {settings?.social_tiktok && <a href={settings.social_tiktok} target="_blank" rel="noreferrer" className="p-2 bg-background border border-border rounded-full text-text-muted hover:text-primary transition"><Music size={18} /></a>}
              {settings?.social_twitter && <a href={settings.social_twitter} target="_blank" rel="noreferrer" className="p-2 bg-background border border-border rounded-full text-text-muted hover:text-primary transition"><MessageCircle size={18} /></a>}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}