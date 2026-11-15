import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, variant = 'info' }) {
  if (!isOpen) return null;
  const headerColors = {
    danger: 'bg-[#EA001E]/10 text-[#EA001E] border-[#EA001E]/20',
    success: 'bg-[#45C65A]/10 text-[#45C65A] border-[#45C65A]/20',
    warning: 'bg-[#FE9339]/10 text-[#FE9339] border-[#FE9339]/20',
    info: 'bg-gray-50 text-[#1A1C23] border-gray-200',
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className={`px-6 py-4 border-b flex justify-between items-center ${headerColors[variant]}`}>
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}