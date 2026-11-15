// frontend/src/components/AdminLogin.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ui/Toast';

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
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/staff-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('staff_token', data.token);
      localStorage.setItem('staff_user', JSON.stringify(data.user));
      localStorage.setItem('burger_admin_auth', 'true');
      
      addToast(`Welcome ${data.user.name}`, 'success');

      // Route based on role
      if (data.user.role === 'cashier') navigate('/pos');
      else if (data.user.role === 'kitchen') navigate('/kitchen');
      else if (data.user.role === 'inventory') navigate('/admin');
      else navigate('/admin');

    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-700 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>
        
        <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">🔐</div>
        <h1 className="text-3xl font-black text-white mb-2">Staff Portal</h1>
        <p className="text-slate-400 mb-8 font-medium">Sign in to your workspace</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm font-bold">{error}</div>}

          <input required type="email" placeholder="Staff Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900 text-white text-center p-4 rounded-xl border border-slate-700 focus:border-orange-500 outline-none transition" />
          
          <div className="relative">
            <input required type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900 text-white text-center p-4 rounded-xl border border-slate-700 focus:border-orange-500 outline-none transition pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-lg">
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-orange-500 text-black font-black text-lg py-4 rounded-xl hover:bg-orange-400 transition shadow-lg disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        <button onClick={() => navigate('/')} className="mt-6 text-slate-500 text-sm font-bold hover:text-white transition">Back to Homepage</button>
      </div>
    </div>
  );
}