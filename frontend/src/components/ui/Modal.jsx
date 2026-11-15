import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, variant = 'info' }) {
  if (!isOpen) return null;
  const headerColors = {
    danger: 'bg-danger/10 text-danger border-danger/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    info: 'bg-background text-text border-border',
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
        <div className={`px-6 py-4 border-b flex justify-between items-center ${headerColors[variant]}`}>
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition"><X size={20} /></button>
        </div>
        <div className="p-6 text-text">{children}</div>
      </div>
    </div>
  );
}