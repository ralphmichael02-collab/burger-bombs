// frontend/src/components/ScannerPairingPanel.jsx
import QRCode from 'react-qr-code';
import { X, Smartphone, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { SOCKET_URL } from '../config/api';

export default function ScannerPairingPanel({ pairCode, mobileConnected, lastScan, onClose }) {
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const pairingUrl = `${window.location.origin}/mobile?pair=${pairCode}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-4 flex justify-between items-center border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-2">
            <Smartphone size={20} className="text-primary" />
            <h2 className="font-bold text-text">Pair Mobile Scanner</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-text-muted transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {isLocalhost && (
            <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 p-3 rounded-xl text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <b>You're on localhost.</b> Your phone can't reach this URL.
                <p className="mt-1 text-xs">Open POS at your LAN IP instead (e.g., http://192.168.1.2:5175/pos)</p>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-3 p-3 rounded-xl border ${mobileConnected ? 'bg-success/10 border-success/20 text-success' : 'bg-background border-border text-text-muted'}`}>
            {mobileConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
            <div className="flex-1">
              <p className="font-bold text-sm">{mobileConnected ? 'Mobile scanner connected' : 'Waiting for mobile scanner…'}</p>
              <p className="text-xs opacity-80">{mobileConnected ? `You can close this window. The scanner will stay connected.` : 'Scan the QR below to pair.'}</p>
            </div>
            {mobileConnected && <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />}
          </div>

          <div className="bg-white p-4 rounded-xl border-2 border-border flex flex-col items-center">
            <QRCode value={pairingUrl} size={200} />
            <p className="text-xs text-text-muted mt-3 font-mono text-center break-all px-2">{pairingUrl}</p>
          </div>

          <div className="text-center">
            <p className="text-xs text-text-muted uppercase font-bold tracking-wider mb-2">Or enter code manually</p>
            <div className="flex justify-center gap-1.5">
              {pairCode.split('').map((char, i) => (
                <div key={i} className="w-11 h-14 bg-background border-2 border-border rounded-lg flex items-center justify-center font-mono font-black text-2xl text-text">{char}</div>
              ))}
            </div>
          </div>

          {lastScan && (
            <div className="bg-success/10 border border-success/20 text-success p-3 rounded-lg text-sm font-bold flex items-center gap-2">
              <CheckCircle size={16} /><span>Received: {lastScan.slice(0, 8).toUpperCase()}</span>
            </div>
          )}

          <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl text-xs text-primary font-bold text-center">
            Tip: Once connected, you can close this window. The phone will stay paired in the background!
          </div>
        </div>
      </div>
    </div>
  );
}