// frontend/src/components/LocalOnlyGuard.jsx
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, Wifi } from 'lucide-react';
import { isLocalEnvironment } from '../utils/isLocal';

export default function LocalOnlyGuard({ children, pageName = 'This page' }) {
  const isLocal = isLocalEnvironment();

  // If local, render the protected page normally
  if (isLocal) {
    return children;
  }

  // If online, show the access restricted screen
  return (
    <div className="min-h-screen bg-[#1A1C23] flex flex-col items-center justify-center p-6 font-['Source_Sans_Pro',sans-serif]">
      <div className="max-w-md text-center">
        
        {/* Lock icon */}
        <div className="w-20 h-20 bg-[#EA580C]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock size={40} className="text-[#EA580C]" />
        </div>

        <h1 className="text-3xl font-black text-white mb-3">
          Access Restricted
        </h1>
        
        <p className="text-gray-400 text-base mb-8 leading-relaxed">
          <b className="text-white">{pageName}</b> is only accessible from the restaurant's local network.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-left space-y-3">
          <div className="flex items-start gap-3">
            <Wifi size={18} className="text-[#EA580C] mt-0.5 shrink-0" />
            <p className="text-sm text-gray-300">
              Connect to the restaurant's <b className="text-white">Wi-Fi</b> and use the local URL provided by the owner.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Lock size={18} className="text-[#EA580C] mt-0.5 shrink-0" />
            <p className="text-sm text-gray-300">
              This protects the business from unauthorized staff actions on the public internet.
            </p>
          </div>
        </div>

        <Link 
          to="/" 
          className="inline-flex items-center gap-2 bg-[#EA580C] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#C2410C] transition shadow-lg"
        >
          <ArrowLeft size={18} /> Return to Homepage
        </Link>

        <p className="text-xs text-gray-500 mt-8">
          If you're the restaurant owner and need emergency access, 
          use the local EnvKit URL directly.
        </p>
      </div>
    </div>
  );
}