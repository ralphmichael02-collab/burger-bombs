import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ui/Toast';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

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
      if (data.user.role === 'cashier') navigate('/pos');
      else if (data.user.role === 'kitchen') navigate('/kitchen');
      else navigate('/admin');
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-6 font-['Source_Sans_Pro',sans-serif]">
      <div className="bg-white p-10 rounded-xl shadow-[0px_15px_75px_rgba(0,0,0,0.07)] w-full max-w-[400px] border border-[#EBEBEB]">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-[#2B4FB9] rounded-2xl flex items-center justify-center shadow-md">
            <Lock size={28} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1C23] text-center mb-2">Staff Portal</h1>
        <p className="text-[#6B7280] text-center mb-8">Sign in to your workspace</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          {error && <div className="bg-[#EA001E]/10 border border-[#EA001E]/30 text-[#EA001E] p-3 rounded-lg text-sm font-semibold text-center">{error}</div>}
          
          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1.5">Email</label>
            <input 
              required type="email" 
              placeholder="admin@burgerbombs.com" 
              value={email} onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-[#F7F7F7] text-[#1A1C23] p-3 rounded-lg border border-[#E5E7EB] focus:border-[#2B4FB9] focus:ring-1 focus:ring-[#2B4FB9] outline-none transition-all" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1.5">Password</label>
            <div className="relative">
              <input 
                required type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password} onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-[#F7F7F7] text-[#1A1C23] p-3 rounded-lg border border-[#E5E7EB] focus:border-[#2B4FB9] focus:ring-1 focus:ring-[#2B4FB9] outline-none transition-all pr-12" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1C23]">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-[#2B4FB9] text-white font-bold text-base py-3.5 rounded-lg hover:bg-[#1E3A8A] transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
          </button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => navigate('/')} className="text-sm font-semibold text-[#6B7280] hover:text-[#2B4FB9] transition-colors">Back to Homepage</button>
        </div>
      </div>
    </div>
  );
}