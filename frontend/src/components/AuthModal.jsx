// frontend/src/components/AuthModal.jsx
import { useState } from 'react';
import { useToast } from './ui/Toast';
import { X, Eye, EyeOff, Mail, Lock, User, Utensils } from 'lucide-react';

export default function AuthModal({ onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', name: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!isLogin && formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    const url = isLogin ? '/api/auth/login' : '/api/auth/register'; // 👈 Relative path
    
    try {
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
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
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-surface font-['Source_Sans_Pro',sans-serif]">
      
      {/* LEFT SIDE - FORM */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 relative overflow-y-auto">
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-background border border-border rounded-full text-text-muted hover:text-text transition">
          <X size={20} />
        </button>

        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
              <Utensils size={18} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-black text-text uppercase tracking-wide">Burger Bombs</span>
          </div>

          <h2 className="text-4xl font-black text-text mb-3">
            {isLogin ? 'Good Morning!' : 'Create an Account'}
          </h2>
          <p className="text-text-muted font-medium mb-8">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }} 
              className="text-primary font-bold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-danger/10 text-danger p-3 rounded-xl text-sm font-bold border border-danger/20">{error}</div>}
            
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-text mb-2">Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input required type="text" placeholder="Type your full name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-border p-3.5 pl-12 rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition font-medium text-text" />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-text mb-2">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input required type="email" placeholder="Type your email address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-border p-3.5 pl-12 rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition font-medium text-text" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-text mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input required type={showPassword ? "text" : "password"} placeholder="Type your password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-border p-3.5 pl-12 pr-12 rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition font-medium text-text" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-text mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input required type={showPassword ? "text" : "password"} placeholder="Confirm your password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full border border-border p-3.5 pl-12 rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition font-medium text-text" />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold text-lg py-4 rounded-xl hover:bg-primary-hover transition shadow-lg disabled:opacity-50 mt-4">
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <p className="text-xs text-text-muted text-center mt-8 font-medium">
            By clicking {isLogin ? 'Sign In' : 'Sign Up'}, you agree to accept Burger Bombs' <a href="#" className="font-bold text-text hover:underline">Terms of Service</a>
          </p>
        </div>
      </div>

      <div className="hidden md:block w-1/2 relative bg-gray-900">
        <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop" alt="Restaurant Interior" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      </div>

    </div>
  );
}