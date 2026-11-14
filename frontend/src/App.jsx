// frontend/src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import POS from './components/POS';
import KitchenDisplay from './components/KitchenDisplay';
import CustomerStore from './components/CustomerStore';
import { refreshMenuFromBackend } from './db';

export default function App() {
  useEffect(() => { refreshMenuFromBackend(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<POS />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/store" element={<CustomerStore />} />
      </Routes>
    </BrowserRouter>
  );
}