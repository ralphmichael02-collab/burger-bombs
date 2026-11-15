// frontend/src/components/ManualEntryModal.jsx
import { useState } from 'react';
import { X, KeyRound, AlertCircle } from 'lucide-react';

export default function ManualEntryModal({ onSubmit, onClose, loading, error }) {
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase().replace(/-/g, '');
    if (cleaned.length < 4) return;
    onSubmit(cleaned);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <KeyRound size={20} className="text-primary" />
            <h2 className="font-bold text-text">Enter Order Code</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-text-muted transition"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-text-muted">
            Ask the customer to read the reference code shown under their QR (e.g., <span className="font-mono font-bold text-text">7A3F9B21</span>). 
            You only need the <b>first 4+ characters</b>.
          </p>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase block mb-2">Reference Code</label>
            <input
              autoFocus
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="7A3F9B21"
              maxLength={12}
              className="w-full border-2 border-border p-4 rounded-xl bg-background text-text text-center font-mono text-2xl font-black tracking-widest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
            <p className="text-xs text-text-muted mt-2 text-center">{code.length}/12 characters</p>
          </div>

          {error && <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm font-bold flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{error}</span></div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-background border border-border text-text-muted font-bold rounded-xl hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" disabled={code.length < 4 || loading} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Looking up…' : 'Find Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}