// frontend/src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import POS from './components/POS';
import KitchenDisplay from './components/KitchenDisplay';
import CustomerStore from './components/CustomerStore';
import AdminDashboard from './components/AdminDashboard';
import RiderSimulator from './components/RiderSimulator';
import CustomerTracker from './components/CustomerTracker';
import Kiosk from './components/Kiosk';
import AdminLogin from './components/AdminLogin';
import VerifyEmail from './components/VerifyEmail';
import CustomerProfile from './components/CustomerProfile';
import LocalOnlyGuard from './components/LocalOnlyGuard';
import RoleGuard from './components/RoleGuard';
import { ToastProvider } from './components/ui/Toast';
import { refreshMenuFromBackend } from './db';

export default function App() {
  useEffect(() => {
    refreshMenuFromBackend();
    
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (!data) return;
        document.documentElement.style.setProperty('--theme-primary', data.theme_primary_color || '#EA580C');
        document.documentElement.style.setProperty('--theme-bg', data.theme_bg_color || '#FDFBF7');
        document.documentElement.style.setProperty('--theme-text', data.theme_text_color || '#1A1C23');
        document.documentElement.style.setProperty('--theme-card', data.theme_card_color || '#FFFFFF');
        if (data.site_title) document.title = data.site_title;
        if (data.favicon_url) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = data.favicon_url;
        }
      })
      .catch(err => console.error("Settings load failed", err));
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* ===== PUBLIC CUSTOMER PAGES (accessible anywhere) ===== */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/store" element={<CustomerStore />} />
          <Route path="/track/:orderId" element={<CustomerTracker />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/profile" element={<CustomerProfile />} />
          
          {/* ===== STAFF LOGIN (accessible anywhere) ===== */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* ===== RIDER (accessible anywhere — uses 4G) ===== */}
          <Route path="/rider" element={<RiderSimulator />} />
          
          {/* ===== ADMIN DASHBOARD (anywhere, requires login + role) ===== */}
          <Route 
            path="/admin" 
            element={
              <RoleGuard requiredPage="/admin">
                <AdminDashboard />
              </RoleGuard>
            } 
          />
          
          {/* ===== POS (local network only + role) ===== */}
          <Route 
            path="/pos" 
            element={
              <LocalOnlyGuard pageName="POS Terminal">
                <RoleGuard requiredPage="/pos">
                  <POS />
                </RoleGuard>
              </LocalOnlyGuard>
            } 
          />
          
          {/* ===== KITCHEN (local network only + role) ===== */}
          <Route 
            path="/kitchen" 
            element={
              <LocalOnlyGuard pageName="Kitchen Display">
                <RoleGuard requiredPage="/kitchen">
                  <KitchenDisplay />
                </RoleGuard>
              </LocalOnlyGuard>
            } 
          />
          
          {/* ===== KIOSK (local network only, no login) ===== */}
          <Route 
            path="/kiosk" 
            element={
              <LocalOnlyGuard pageName="Self-Service Kiosk">
                <Kiosk />
              </LocalOnlyGuard>
            } 
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}