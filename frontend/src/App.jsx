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

  const isAdminAuthenticated = localStorage.getItem('burger_admin_auth') === 'true';

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC CUSTOMER PAGES */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/store" element={<CustomerStore />} />
          <Route path="/track/:orderId" element={<CustomerTracker />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/profile" element={<CustomerProfile />} />
          
          {/* STAFF LOGIN (accessible from anywhere — auth required) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={isAdminAuthenticated ? <AdminDashboard /> : <Navigate to="/admin/login" replace />} />
          
          {/* RIDER — accessible from anywhere (riders use mobile data on the road) */}
          <Route path="/rider" element={<RiderSimulator />} />
          
          {/* LOCAL-ONLY PAGES — blocked from the cloud */}
          <Route 
            path="/pos" 
            element={
              <LocalOnlyGuard pageName="Point of Sale (POS)">
                <POS />
              </LocalOnlyGuard>
            } 
          />
          <Route 
            path="/kitchen" 
            element={
              <LocalOnlyGuard pageName="Kitchen Display">
                <KitchenDisplay />
              </LocalOnlyGuard>
            } 
          />
          <Route 
            path="/kiosk" 
            element={
              <LocalOnlyGuard pageName="Self-Service Kiosk">
                <Kiosk />
              </LocalOnlyGuard>
            } 
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}