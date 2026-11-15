// frontend/src/components/AdminLogin.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // For the demo, the PIN is 1234. In production, this would be a real JWT login.
    if (pin === '1234') {
      localStorage.setItem('burger_admin_auth', 'true');
      navigate('/admin');
    } else {
      setError('Invalid PIN. Hint: 1234');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-black text-white mb-2">Admin Access</h1>
        <p className="text-gray-400 mb-6 text-sm">Enter your 4-digit security PIN</p>
        
        <form onSubmit={handleLogin}>
          <input 
            type="password" 
            maxLength="4"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-full bg-gray-700 text-white text-center text-3xl tracking-[1em] font-mono p-4 rounded-xl border border-gray-600 focus:border-yellow-500 outline-none mb-4"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm font-bold mb-4">{error}</p>}
          
          <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition">
            Unlock Dashboard
          </button>
        </form>
        <button onClick={() => navigate('/')} className="mt-6 text-gray-500 text-sm hover:text-white transition">Back to Homepage</button>
      </div>
    </div>
  );
}