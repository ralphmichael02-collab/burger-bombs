import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, refreshMenuFromBackend } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import QRCode from 'react-qr-code';
import { Beef, List, ScanLine, CheckCircle, RefreshCw, X, ShoppingCart, AlertCircle } from 'lucide-react';
import MenuList from './MenuList';
import Cart from './Cart';

export default function POS() {
  // ... (Keep all state and logic identical)

  return (
    <div className="h-screen flex flex-col bg-[#F7F7F7] font-['Source_Sans_Pro',sans-serif]">
      <header className="bg-white h-16 px-6 flex justify-between items-center shrink-0 border-b border-[#E5E7EB] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2B4FB9] rounded-lg flex items-center justify-center"><Beef size={20} className="text-white" /></div>
          <h1 className="text-lg font-bold text-[#1A1C23] tracking-tight">Terminal</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRecentOrders(true)} className="bg-white border border-[#E5E7EB] text-[#1A1C23] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#F7F7F7] transition flex items-center gap-2 shadow-sm">
            <List size={16} /> Orders
          </button>
          <button onClick={() => setShowScanner(true)} className="bg-white border border-[#E5E7EB] text-[#1A1C23] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#F7F7F7] transition flex items-center gap-2 shadow-sm">
            <ScanLine size={16} /> Scan
          </button>
          <div className="flex items-center gap-2 bg-[#F7F7F7] border border-[#E5E7EB] px-4 py-2 rounded-lg">
            <RefreshCw size={14} className={`text-[#6B7280] ${pendingSync > 0 ? 'animate-spin' : ''}`} />
            <span className="text-sm font-semibold text-[#6B7280]">Queue: {pendingSync ?? '0'}</span>
          </div>
        </div>
      </header>

      {/* INDUSTRY STANDARD 2-PANEL SPLIT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: ORDER / CHECK (30%) */}
        <div className="w-[30%] min-w-[320px] bg-white flex flex-col border-r border-[#E5E7EB] z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <Cart cart={cart} setCart={setCart} onSubmit={placeOrder} submitting={submitting} />
        </div>
        
        {/* RIGHT PANEL: MENU GRID (70%) */}
        <div className="flex-1 bg-[#F7F7F7] overflow-y-auto">
          <MenuList onAdd={addToCart} />
        </div>
      </div>

      {/* Modals (Use new design tokens: bg-white, rounded-xl, shadow-xl) */}
    </div>
  );
}