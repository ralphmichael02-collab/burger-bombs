// frontend/src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import POS from './components/POS';
import KitchenDisplay from './components/KitchenDisplay';
import CustomerStore from './components/CustomerStore';
import AdminDashboard from './components/AdminDashboard';
import RiderSimulator from './components/RiderSimulator';
import CustomerTracker from './components/CustomerTracker';
import Kiosk from './components/Kiosk';
import { refreshMenuFromBackend } from './db';
import AdminLogin from './components/AdminLogin';

export default function App() {
  useEffect(() => { 
    refreshMenuFromBackend(); 
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/store" element={<CustomerStore />} />
        <Route path="/rider" element={<RiderSimulator />} />
        <Route path="/track/:orderId" element={<CustomerTracker />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          localStorage.getItem('burger_admin_auth') === 'true' 
            ? <AdminDashboard /> 
            : <AdminLogin />
        } />
      </Routes>
    </BrowserRouter>
  );
}