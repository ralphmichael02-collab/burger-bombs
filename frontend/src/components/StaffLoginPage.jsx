// frontend/src/components/StaffLoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, LogIn, ArrowLeft, AlertTriangle } from 'lucide-react';
import { API_BASE, safeFetch } from '../config/api';
import { ROLE_LABELS } from '../utils/roles';

export default function StaffLoginPage({
  requiredRoles = [],
  portalName = 'Staff Portal',
  onAuthorized,
}) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [existingUser, setExistingUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    safeFetch(`${API_BASE}/api/settings`).then(r => r.json()).then(setSettings).catch(console.error);

    try {
      const raw = localStorage.getItem('staff_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        setExistingUser(parsed);
        if (requiredRoles.length === 0 || requiredRoles.includes(parsed.role)) {
          onAuthorized?.(parsed);
        }
      }
    } catch { /* ignore */ }
    setCheckingAuth(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/staff-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (requiredRoles.length > 0 && !requiredRoles.includes(data.user.role)) {
        throw new Error(
          `${ROLE_LABELS[data.user.role] || data.user.role} role is not allowed on this terminal. ` +
          `Allowed: ${requiredRoles.map(r => ROLE_LABELS[r] || r).join(' · ')}`
        );
      }

      localStorage.setItem('staff_token', data.token);
      localStorage.setItem('staff_user', JSON.stringify(data.user));
      onAuthorized?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutExisting = () => {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_user');
    setExistingUser(null);
    setError('');
  };

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-primary font-bold">
        Loading…
      </div>
    );
  }

  const logo = settings?.logo_url;
  const bgImage = settings?.login_hero_image_url || settings?.hero_image_url;
  const welcomeTitle = settings?.login_welcome_title || 'Welcome back';
  const welcomeSubtitle = settings?.login_welcome_subtitle || 'Sign in to continue';
  const restaurantName = settings?.restaurant_name || 'Restaurant';

  return (
    <div className="min-h-screen relative flex flex-col font-['Source_Sans_Pro',sans-serif]">
      {bgImage ? (
        <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-text" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/40" />

      <div className="relative z-10 p-4 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-bold bg-white/10 backdrop-blur px-4 py-2 rounded-full transition"
        >
          <ArrowLeft size={16} /> Home
        </button>
        {existingUser && (
          <div className="bg-white/10 backdrop-blur text-white text-xs rounded-full px-3 py-1.5 flex items-center gap-2">
            <span>Signed in as <b>{existingUser.name}</b></span>
            <button onClick={handleSignOutExisting} className="text-primary font-bold hover:underline">
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-8 border border-border">
          <div className="text-center mb-6">
            {logo ? (
              <img src={logo} alt="Logo" className="w-16 h-16 rounded-full object-cover mx-auto mb-3 shadow-md" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white mx-auto mb-3 shadow-md">
                <Lock size={28} />
              </div>
            )}
            <h1 className="text-2xl font-black text-text">{welcomeTitle}</h1>
            <p className="text-sm text-text-muted mt-1">{welcomeSubtitle}</p>
            <p className="text-xs font-bold text-primary mt-3 uppercase tracking-wider">{portalName}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{restaurantName}</p>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-xl text-sm font-bold mb-4 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-background border border-border p-3 pl-10 rounded-xl text-text outline-none focus:ring-2 focus:ring-primary transition"
                required
                autoComplete="email"
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-background border border-border p-3 pl-10 pr-10 rounded-xl text-text outline-none focus:ring-2 focus:ring-primary transition"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-hover transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in…' : <><LogIn size={18} /> Sign In</>}
            </button>
          </form>

          {requiredRoles.length > 0 && (
            <p className="text-xs text-text-muted text-center mt-4">
              Authorized: <b>{requiredRoles.map(r => ROLE_LABELS[r] || r).join(' · ')}</b>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}