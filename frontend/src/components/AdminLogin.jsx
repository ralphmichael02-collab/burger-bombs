// frontend/src/components/AdminLogin.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ui/Toast';
import { Lock, Mail, Eye, EyeOff, ArrowRight, Utensils } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // 👇 Relative path
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('staff_token', data.token);
      localStorage.setItem('staff_user', JSON.stringify(data.user));
      localStorage.setItem('burger_admin_auth', 'true');
      addToast(`Welcome ${data.user.name}`, 'success');
      
      if (data.user.role === 'cashier') navigate('/pos');
      else if (data.user.role === 'kitchen') navigate('/kitchen');
      else navigate('/admin');
    } catch (err) { 
      setError(err.message); 
      addToast(err.message, 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex bg-surface font-['Source_Sans_Pro',sans-serif]">
      
      {/* LEFT SIDE - FORM */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
              <Utensils size={18} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-black text-text uppercase tracking-wide">Burger Bombs</span>
          </div>

          <h2 className="text-4xl font-black text-text mb-3">Staff Portal</h2>
          <p className="text-text-muted font-medium mb-8">Sign in to manage your restaurant</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-xl text-sm font-semibold text-center">{error}</div>}
            
            <div>
              <label className="block text-sm font-bold text-text mb-2">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input required type="email" placeholder="admin@burgerbombs.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-background border border-border p-3.5 pl-12 rounded-xl focus:ring-2 focus:ring-primary outline-none transition font-medium text-text" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-text mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input required type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-background border border-border p-3.5 pl-12 pr-12 rounded-xl focus:ring-2 focus:ring-primary outline-none transition font-medium text-text" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold text-lg py-4 rounded-xl hover:bg-primary-hover transition shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-4">
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => navigate('/')} className="text-sm font-bold text-text-muted hover:text-text transition">Back to Homepage</button>
          </div>
        </div>
      </div>

      <div className="hidden md:block w-1/2 relative bg-gray-900">
        <img src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070&auto=format&fit=crop" alt="Restaurant Kitchen" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      </div>

    </div>
  );
}