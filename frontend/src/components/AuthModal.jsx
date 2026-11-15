// frontend/src/components/AuthModal.jsx
import { useState } from 'react';
import { useToast } from './ui/Toast';
import { X, Eye, EyeOff } from 'lucide-react';

export default function AuthModal({ onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', name: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      if (isLogin) {
        addToast('Welcome back!', 'success');
        onLogin(data.user, data.token);
      } else {
        addToast('Account created! Check your email.', 'success');
        setTimeout(() => { setIsLogin(true); setError(''); }, 3000);
      }
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-slate-900 text-white p-6 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
          <h2 className="text-2xl font-black">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold text-center">{error}</div>}
          
          {!isLogin && (
            <>
              <input required type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-orange-500 transition" />
              <input type="text" placeholder="Phone (optional)" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-orange-500 transition" />
            </>
          )}

          <input required type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-orange-500 transition" />
          
          <div className="relative">
            <input required type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-orange-500 transition pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {!isLogin && (
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} placeholder="Confirm Password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-orange-500 transition pr-12" />
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white font-black text-lg py-4 rounded-xl hover:bg-orange-600 transition shadow-lg disabled:opacity-50">
            {loading ? 'Processing...' : isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div className="bg-slate-50 p-4 text-center border-t border-slate-200">
          <p className="text-sm text-slate-600 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-orange-600 font-bold hover:underline">
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}