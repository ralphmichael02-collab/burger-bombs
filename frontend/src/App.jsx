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
import { refreshMenuFromBackend } from './db';

export default function App() {
  useEffect(() => { 
    refreshMenuFromBackend(); 
  }, []);

  // Check auth status on every render
  const isAdminAuthenticated = localStorage.getItem('burger_admin_auth') === 'true';

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Storefront */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/store" element={<CustomerStore />} />
        <Route path="/track/:orderId" element={<CustomerTracker />} />
        
        {/* Local Store Apps */}
        <Route path="/pos" element={<POS />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/rider" element={<RiderSimulator />} />
        
        {/* Admin Auth */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Protected Admin Route */}
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