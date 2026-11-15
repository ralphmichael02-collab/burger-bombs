import { createContext, useContext, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const styles = {
    info: { bg: 'bg-[#1A1C23]', text: 'text-white', icon: <Info size={18} /> },
    success: { bg: 'bg-[#45C65A]', text: 'text-white', icon: <CheckCircle size={18} /> },
    error: { bg: 'bg-[#EA001E]', text: 'text-white', icon: <AlertCircle size={18} /> },
    warning: { bg: 'bg-[#FE9339]', text: 'text-black', icon: <AlertTriangle size={18} /> },
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => {
          const style = styles[toast.type] || styles.info;
          return (
            <div key={toast.id} className={`px-5 py-4 rounded-xl shadow-2xl font-bold text-sm min-w-[280px] flex items-center gap-3 ${style.bg} ${style.text}`} style={{ animation: 'slideIn 0.3s ease-out' }}>
              {style.icon} {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);