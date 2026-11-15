// frontend/src/App.jsx
import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import POS from './components/POS';
import CustomerStore from './components/CustomerStore';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import KitchenDisplay from './components/KitchenDisplay';
import Kiosk from './components/Kiosk';
import MobileScanner from './components/MobileScanner';
import MobilePortal from './components/MobilePortal';
import { refreshMenuFromBackend } from './db';

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

export default function App() {
  const location = useLocation();
  const [currentColors, setCurrentColors] = useState(() => {
    const saved = localStorage.getItem('burger-bombs-colors');
    return saved ? JSON.parse(saved) : PRESET_THEMES[0].colors;
  });

  useEffect(() => {
    refreshMenuFromBackend();
  }, []);

  useEffect(() => {
    localStorage.setItem('burger-bombs-colors', JSON.stringify(currentColors));
    const root = document.documentElement;
    const toKebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    Object.entries(currentColors).forEach(([k, v]) => {
      root.style.setProperty(`--color-${toKebab(k)}`, v);
    });
  }, [currentColors]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStandalone = ['/kitchen', '/kiosk', '/scanner', '/mobile'].some(p => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-background text-text">
      {!isAdminRoute && !isStandalone && (
        <nav className="bg-surface border-b border-border p-3 flex gap-4 shadow-sm sticky top-0 z-50">
          <Link to="/pos" className={`capitalize font-bold ${location.pathname === '/pos' ? 'text-primary' : 'text-text-muted hover:text-text'}`}>POS</Link>
          <Link to="/store" className={`capitalize font-bold ${location.pathname === '/store' ? 'text-primary' : 'text-text-muted hover:text-text'}`}>Online Store</Link>
          <Link to="/admin" className={`capitalize font-bold ml-auto ${location.pathname.startsWith('/admin') ? 'text-primary' : 'text-text-muted hover:text-text'}`}>Admin Dashboard</Link>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<POS />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/store" element={<CustomerStore />} />
        <Route path="/admin" element={<AdminDashboard currentColors={currentColors} setCurrentColors={setCurrentColors} />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/scanner" element={<MobileScanner />} />
        <Route path="/mobile" element={<MobilePortal />} />
        <Route path="*" element={<POS />} />
      </Routes>
    </div>
  );
}