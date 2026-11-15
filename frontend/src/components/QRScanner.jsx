// frontend/src/components/QRScanner.jsx
import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const containerId = 'qr-scanner-container';

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        scanner.stop().then(() => onScan(decodedText)).catch(() => {});
      },
      () => {} 
    ).catch((err) => {
      console.error('[qr] failed to start camera', err);
    });

    return () => {
      scanner.stop().catch(() => {});
      scanner.clear().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl overflow-hidden w-full max-w-md shadow-2xl border border-border">
        <div className="p-4 flex justify-between items-center border-b border-border">
          <h2 className="font-bold text-text">Scan Kiosk QR</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background text-text-muted">
            <X size={20} />
          </button>
        </div>
        <div id={containerId} className="w-full aspect-square bg-black" />
        <p className="p-4 text-sm text-center text-text-muted">
          Point the camera at the customer's QR code
        </p>
      </div>
    </div>
  );
}