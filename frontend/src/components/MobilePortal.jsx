// frontend/src/components/MobilePortal.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Smartphone, LayoutDashboard, ChefHat, ArrowRight, QrCode, LogOut, Eye, EyeOff } from 'lucide-react';

export default function MobilePortal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlPairCode = searchParams.get('pair')?.toUpperCase() || '';

  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('staff_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('staff_token', data.token);
      localStorage.setItem('staff_user', JSON.stringify(data.user));
      setUser(data.user);
      
      if (urlPairCode) navigate(`/scanner?pair=${urlPairCode}`);
    } catch (err) {
      if (err.message === 'Load failed' || err.message === 'Failed to fetch') {
        setError(`Network error. Check WiFi and Firewall.`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center p-6 font-['Source_Sans_Pro',sans-serif]">
        <div className="w-full max-w-sm mx-auto bg-surface p-6 rounded-2xl shadow-xl border border-border">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mx-auto mb-3">
              <Smartphone size={24} />
            </div>
            <h1 className="text-2xl font-black text-text">Staff Portal</h1>
            <p className="text-sm text-text-muted mt-1">Log in to connect your device</p>
            {urlPairCode && (
              <div className="mt-3 text-xs font-bold text-primary bg-primary/10 p-2 rounded-lg break-all">
                Pairing Code: {urlPairCode}
              </div>
            )}
          </div>

          {error && <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-xl text-sm font-bold mb-4 text-center">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-background border border-border p-3 pl-10 rounded-xl text-text outline-none focus:border-primary" required />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-background border border-border p-3 pl-10 pr-10 rounded-xl text-text outline-none focus:border-primary" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-hover transition">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col font-['Source_Sans_Pro',sans-serif]">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-text">Hello, {user.name}</h1>
          <p className="text-xs text-text-muted">Choose your device mode</p>
        </div>
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="p-2 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition"><LogOut size={20} /></button>
      </header>

      {urlPairCode && (
        <div className="mb-6 bg-primary text-white p-4 rounded-xl shadow-lg animate-pulse cursor-pointer" onClick={() => navigate(`/scanner?pair=${urlPairCode}`)}>
          <p className="font-bold flex items-center gap-2"><QrCode size={20} /> Pairing Requested</p>
          <p className="text-sm mt-1">Tap here to launch the scanner for code <b>{urlPairCode}</b></p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <button onClick={() => navigate(`/scanner${urlPairCode ? `?pair=${urlPairCode}` : ''}`)} className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm active:scale-95 transition text-left">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0"><QrCode size={24} /></div>
          <div className="flex-1"><h2 className="font-bold text-text">Mobile Scanner</h2><p className="text-xs text-text-muted mt-0.5">Use camera to scan kiosk QR codes</p></div>
          <ArrowRight size={20} className="text-text-muted shrink-0" />
        </button>
        <button onClick={() => navigate('/pos')} className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm active:scale-95 transition text-left">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0"><LayoutDashboard size={24} /></div>
          <div className="flex-1"><h2 className="font-bold text-text">POS Terminal</h2><p className="text-xs text-text-muted mt-0.5">Take orders as a cashier</p></div>
          <ArrowRight size={20} className="text-text-muted shrink-0" />
        </button>
        <button onClick={() => navigate('/kitchen')} className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm active:scale-95 transition text-left">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0"><ChefHat size={24} /></div>
          <div className="flex-1"><h2 className="font-bold text-text">Kitchen Display</h2><p className="text-xs text-text-muted mt-0.5">View and complete pending orders</p></div>
          <ArrowRight size={20} className="text-text-muted shrink-0" />
        </button>
      </div>
    </div>
  );
}