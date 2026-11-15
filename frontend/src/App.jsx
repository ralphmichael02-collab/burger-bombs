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
import { refreshMenuFromBackend } from './db';

export default function App() {
  useEffect(() => { 
    refreshMenuFromBackend(); 
    
    fetch(`${import.meta.env.VITE_API_BASE}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          document.documentElement.style.setProperty('--theme-primary', data.theme_primary_color || '#ea580c');
          document.documentElement.style.setProperty('--theme-bg', data.theme_bg_color || '#f8fafc');
        }
      })
      .catch(err => console.error("Could not load theme settings", err));
  }, []);

  const isAdminAuthenticated = localStorage.getItem('burger_admin_auth') === 'true';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/store" element={<CustomerStore />} />
        <Route path="/track/:orderId" element={<CustomerTracker />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/profile" element={<CustomerProfile />} />
        
        <Route path="/pos" element={<POS />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/rider" element={<RiderSimulator />} />
        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route 
          path="/admin" 
          element={
            isAdminAuthenticated 
              ? <AdminDashboard /> 
              : <Navigate to="/admin/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}