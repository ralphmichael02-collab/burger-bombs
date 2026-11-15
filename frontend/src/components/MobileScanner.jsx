// frontend/src/components/MobileScanner.jsx
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';
import { Camera, CheckCircle, Wifi, WifiOff, ArrowLeft } from 'lucide-react';

// 👇 Stable Socket.IO Config
const socket = io(window.location.origin, { 
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

const SCAN_COOLDOWN_MS = 2000;

export default function MobileScanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlPairCode = searchParams.get('pair')?.toUpperCase() || '';

  const [pairCode, setPairCode] = useState(urlPairCode);
  const [paired, setPaired] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [coolingDown, setCoolingDown] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const canUseLiveCamera = typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('staff_user');
    if (!saved) {
      navigate(`/mobile${urlPairCode ? `?pair=${urlPairCode}` : ''}`);
      return;
    }

    if (!pairCode) return;
    
    socket.on('connect', () => { setConnected(true); socket.emit('scanner:pair', { pairCode }); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('scanner:paired', () => setPaired(true));
    socket.on('scanner:session-ended', () => { setPaired(false); setPairCode(''); });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('scanner:paired');
      socket.off('scanner:session-ended');
    };
  }, [pairCode, navigate, urlPairCode]);

  useEffect(() => {
    if (!paired || !canUseLiveCamera) return;
    const scanner = new Html5Qrcode('mobile-scanner-view');
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 15, qrbox: { width: 260, height: 260 } },
      (decodedText) => handleScanSuccess(decodedText),
      () => {}
    ).catch((err) => console.error('[scanner] live camera failed', err));

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [paired, canUseLiveCamera]);

  const handleScanSuccess = (decodedText) => {
    if (coolingDown) return;
    const syncId = decodedText.trim();
    if (!syncId || syncId.length < 10) return;

    setCoolingDown(true);
    setLastScan(syncId);
    socket.emit('scanner:result', { pairCode, syncId });
    if ('vibrate' in navigator) navigator.vibrate(100);
    setTimeout(() => setCoolingDown(false), SCAN_COOLDOWN_MS);
  };

  const handleFileCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDecoding(true);
    setCameraError(null);

    try {
      const imageData = await loadImageToImageData(file);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) {
        handleScanSuccess(code.data);
      } else {
        setCameraError('No QR code found in that photo. Try again.');
      }
    } catch (err) {
      setCameraError('Could not read that photo.');
    } finally {
      setIsDecoding(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadImageToImageData = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1200;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.getContext('2d').getImageData(0, 0, width, height));
    };
    img.onerror = reject;
    img.src = url;
  });

  if (!paired) {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6 font-['Source_Sans_Pro',sans-serif]">
        <button onClick={() => navigate('/mobile')} className="self-start p-2 bg-surface border border-border rounded-lg text-text-muted mb-8 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center text-text shadow-sm border border-border mb-4">
            <WifiOff size={32} />
          </div>
          <h1 className="text-2xl font-black text-text mb-2">Not Paired</h1>
          <p className="text-text-muted mb-6">Please scan the pairing QR code on the POS terminal to connect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-['Source_Sans_Pro',sans-serif]">
      <header className="bg-surface border-b border-border p-3 flex items-center justify-between shadow-sm z-10">
        <button onClick={() => navigate('/mobile')} className="p-2 bg-background rounded-lg hover:bg-gray-100 text-text-muted transition">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          {connected ? <Wifi size={18} className="text-success" /> : <WifiOff size={18} className="text-danger" />}
          <span className="font-bold text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="w-9"></div>
      </header>

      <div className="flex-1 relative bg-black">
        {canUseLiveCamera ? (
          <>
            <div id="mobile-scanner-view" className="w-full h-full" />
            {coolingDown && (
              <div className="absolute inset-0 flex items-center justify-center bg-success/30 backdrop-blur-sm">
                <CheckCircle size={64} className="text-white animate-scale-in" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-background">
            <Camera size={64} className="text-primary mb-4" />
            <h2 className="text-2xl font-black mb-2 text-text">Take Photo of QR</h2>
            <p className="text-text-muted text-sm mb-6 max-w-xs">Since you are on local WiFi (HTTP), tap below to open the camera and snap a photo of the customer's QR.</p>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileCapture} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isDecoding || coolingDown} className="w-full max-w-xs bg-primary text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
              {isDecoding ? 'Reading...' : coolingDown ? 'Sent to POS!' : 'Open Camera'}
            </button>
            {cameraError && <div className="mt-4 text-danger font-bold text-sm">{cameraError}</div>}
          </div>
        )}
      </div>

      <footer className="bg-surface border-t border-border p-4 shadow-sm z-10">
        <div className="text-center">
          <p className="font-bold text-sm mb-1">{coolingDown ? '✓ Order sent to POS!' : lastScan ? 'Ready for next scan' : 'Point at customer QR'}</p>
          {lastScan && <p className="text-xs text-text-muted font-mono">Last: {lastScan.slice(0, 8).toUpperCase()}</p>}
        </div>
      </footer>
    </div>
  );
}