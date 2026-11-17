// frontend/src/components/LandingPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Utensils, ShieldCheck, MapPin, ArrowRight, Store, Star, Zap, Clock, Truck, Heart, PlayCircle, Phone, Mail 
} from 'lucide-react';
import { isLocalEnvironment } from '../utils/isLocal';
import { API_BASE, safeFetch } from '../config/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ICON_MAP = { ShieldCheck, MapPin, Zap, Clock, Truck, Star, Heart, Utensils };

const SocialIcon = ({ platform, size = 18 }) => {
  const icons = {
    facebook: (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>),
    instagram: (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>),
    tiktok: (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>),
    twitter: (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>),
  };
  return icons[platform] || null;
};

const SOCIAL_LIST = ['facebook', 'instagram', 'tiktok', 'twitter'];

export default function LandingPage() {
  const [settings, setSettings] = useState(null);
  const [menu, setMenu] = useState([]);
  const isLocal = isLocalEnvironment();

  useEffect(() => {
    safeFetch(`${API_BASE}/api/settings`).then(r => r.json()).then(setSettings).catch(console.error);
    safeFetch(`${API_BASE}/api/menu`).then(r => r.json()).then(setMenu).catch(console.error);
  }, []);

  if (!settings) return <div className="h-screen flex items-center justify-center bg-background text-primary font-bold">Loading...</div>;

  const features = [
    { title: settings.feature_1_title, desc: settings.feature_1_desc, icon: settings.feature_1_icon },
    { title: settings.feature_2_title, desc: settings.feature_2_desc, icon: settings.feature_2_icon },
    { title: settings.feature_3_title, desc: settings.feature_3_desc, icon: settings.feature_3_icon },
  ].filter(f => f.title);

  const socials = SOCIAL_LIST.map(platform => ({ platform, url: settings[`social_${platform}`] })).filter(s => s.url);

  return (
    <div className="min-h-screen bg-background font-['Source_Sans_Pro',sans-serif]">
      {settings.promo_banner_text && (
        <div className="bg-primary text-white text-center py-2 px-4 text-sm font-bold tracking-wide z-50 relative">
          {settings.promo_banner_text}
        </div>
      )}

      <nav className="sticky top-0 z-40 backdrop-blur-lg bg-surface/90 border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md"><Utensils size={20} strokeWidth={2.5} /></div>
            )}
            <h1 className="text-2xl font-black uppercase tracking-tight text-text">{settings.restaurant_name}</h1>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-sm font-bold text-text-muted hover:text-text transition hidden md:flex items-center gap-2"><Store size={16} /> Merchant Portal</Link>
            <Link to={settings.hero_button_link || '/store'} className="bg-primary text-white px-6 py-2.5 rounded-full font-bold hover:bg-primary-hover transition shadow-lg flex items-center gap-2">
              {settings.hero_button_text || 'Order Now'} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      <header className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        {settings.hero_image_url ? (
          <img src={settings.hero_image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-text"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30"></div>
        <div className="relative z-10 px-6 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4"><span className="w-3 h-3 bg-primary rounded-full"></span><p className="text-white font-bold tracking-widest uppercase text-sm">{settings.tagline}</p></div>
            <h2 className="text-6xl md:text-8xl font-black text-white mb-6 leading-[1.1] drop-shadow-lg">{settings.hero_title}</h2>
            <p className="text-lg md:text-xl text-gray-300 mb-10 font-medium max-w-lg">{settings.hero_subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={settings.hero_button_link || '/store'} className="bg-primary text-white text-lg font-black px-10 py-4 rounded-full shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2">
                {settings.hero_button_text || 'Order Now'} <ArrowRight size={20} />
              </Link>
              <a href="#menu" className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-lg font-bold px-10 py-4 rounded-full hover:bg-white/20 transition-all flex items-center justify-center">View Menu</a>
            </div>
          </div>
        </div>
      </header>

      {settings.show_ad_banner && settings.ad_banner_image_url && (
        <section className="py-12 px-6 bg-background border-b border-border">
          <div className="max-w-4xl mx-auto">
            <a href={settings.ad_banner_link || '#'} target="_blank" rel="noreferrer" className="block rounded-3xl overflow-hidden shadow-2xl hover:scale-[1.01] transition-transform duration-300">
              <img src={settings.ad_banner_image_url} alt="Advertisement" className="w-full h-auto object-cover" />
            </a>
          </div>
        </section>
      )}

      {settings.show_features && features.length > 0 && (
        <section className="py-20 bg-surface border-t border-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, idx) => {
                const Icon = ICON_MAP[feature.icon] || ShieldCheck;
                return (
                  <div key={idx} className="text-center p-8 rounded-2xl bg-background border border-border">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><Icon size={32} className="text-primary" /></div>
                    <h3 className="text-xl font-bold text-text mb-2">{feature.title}</h3>
                    <p className="text-text-muted font-medium">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {settings.show_video && settings.video_url && (
        <section className="py-20 px-6 bg-surface border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-4xl font-black text-text mb-8 flex items-center justify-center gap-3">
              <PlayCircle size={36} className="text-primary" /> Watch Our Story
            </h3>
            <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-background">
              <iframe src={settings.video_url} title="Commercial Video" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
            </div>
          </div>
        </section>
      )}

      <section id="menu" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16"><h3 className="text-4xl font-black text-text mb-4">Fan Favorites</h3><p className="text-text-muted text-lg">Our most loved dishes</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {menu.slice(0, 3).map(item => (
            <div key={item.id} className="bg-surface rounded-3xl shadow-sm hover:shadow-xl transition-all overflow-hidden group border border-border flex flex-col">
              <div className="h-64 overflow-hidden relative">
                {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full bg-background flex items-center justify-center"><Utensils size={48} className="text-text-muted opacity-50" /></div>}
                <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur px-3 py-1 rounded-full text-xs font-black text-text shadow-sm uppercase">{item.category}</div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4"><h4 className="text-2xl font-bold text-text">{item.name}</h4><div className="flex items-center gap-1 text-primary font-bold"><Star size={16} fill="currentColor" /> 4.9</div></div>
                <div className="flex items-center justify-between"><p className="text-2xl font-black text-text">₱{item.price}</p><Link to="/store" className="bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold py-2 px-6 rounded-full transition-colors">Add</Link></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {settings.show_about && (
        <section id="about" className="py-24 bg-surface border-t border-border">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-4xl md:text-5xl font-black text-text mb-6">{settings.about_title}</h3>
              <p className="text-lg text-text-muted leading-relaxed mb-8">{settings.about_text}</p>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary"><MapPin size={24} /></div><div><p className="text-xs font-bold text-text-muted uppercase">Phone</p><p className="font-bold text-text">{settings.contact_phone}</p></div></div>
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary"><Utensils size={24} /></div><div><p className="text-xs font-bold text-text-muted uppercase">Email</p><p className="font-bold text-text">{settings.contact_email}</p></div></div>
              </div>
            </div>
            <div>{settings.about_image_url ? <img src={settings.about_image_url} alt="About" className="w-full h-96 object-cover rounded-3xl shadow-xl" /> : <div className="w-full h-96 bg-background rounded-3xl flex items-center justify-center border border-border"><Utensils size={64} className="text-text-muted opacity-50" /></div>}</div>
          </div>
        </section>
      )}

      {settings.show_contact && (
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-black text-text mb-4">Find Us Here</h3>
            <p className="text-text-muted text-lg">Come visit our store or order online</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0"><MapPin size={24} /></div>
                <div><h3 className="font-bold text-text mb-1">Our Location</h3><p className="text-text-muted">{settings?.contact_address}</p></div>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0"><Phone size={24} /></div>
                <div><h3 className="font-bold text-text mb-1">Call Us</h3><p className="text-text-muted">{settings?.contact_phone}</p></div>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0"><Mail size={24} /></div>
                <div><h3 className="font-bold text-text mb-1">Email Us</h3><p className="text-text-muted">{settings?.contact_email}</p></div>
              </div>
            </div>
            <div className="flex-1 bg-surface rounded-3xl border border-border shadow-xl overflow-hidden h-[400px]">
              <MapContainer center={[settings?.contact_lat || 12.4989, settings?.contact_lng || 124.6377]} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[settings?.contact_lat || 12.4989, settings?.contact_lng || 124.6377]}>
                  <Popup>{settings?.restaurant_name}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </section>
      )}

      <footer className="bg-text text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-3">
              {settings.logo_url ? <img src={settings.logo_url} alt="Logo" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white"><Utensils size={14} /></div>}
              <p className="text-white font-bold text-xl">{settings.restaurant_name}</p>
            </div>
            {socials.length > 0 && (
              <div className="flex gap-3">
                {socials.map(({ platform, url }) => (
                  <a key={platform} href={url} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white/10 hover:bg-primary rounded-full flex items-center justify-center text-white transition" aria-label={platform}><SocialIcon platform={platform} size={18} /></a>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-gray-800 pt-6 text-center">
            <p className="text-sm">{settings.footer_text}</p>
            {!isLocal && <p className="text-xs text-gray-600 mt-3">🌐 Cloud Edition — POS, Kitchen & Kiosk are available only on the restaurant's local network.</p>}
          </div>
        </div>
      </footer>
    </div>
  );
}