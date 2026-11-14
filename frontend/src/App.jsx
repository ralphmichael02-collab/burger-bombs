// frontend/src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import POS from './components/POS';
import KitchenDisplay from './components/KitchenDisplay';
import CustomerStore from './components/CustomerStore';
import AdminDashboard from './components/AdminDashboard';
import RiderSimulator from './components/RiderSimulator';
import CustomerTracker from './components/CustomerTracker';
import { refreshMenuFromBackend } from './db';

export default function App() {
  useEffect(() => { 
    refreshMenuFromBackend(); 
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<POS />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/store" element={<CustomerStore />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/rider" element={<RiderSimulator />} />
        {/* The :orderId parameter allows us to track specific orders */}
        <Route path="/track/:orderId" element={<CustomerTracker />} />
      </Routes>
    </BrowserRouter>
  );
}