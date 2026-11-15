import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return setStatus('error');
    fetch(`${import.meta.env.VITE_API_BASE}/api/auth/verify?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          localStorage.setItem('burger_user', JSON.stringify(data.user));
          localStorage.setItem('burger_token', data.token);
          setStatus('success');
          setTimeout(() => navigate('/store'), 2000);
        } else { setStatus('error'); }
      }).catch(() => setStatus('error'));
  }, [searchParams, navigate]);

  if (status === 'verifying') return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFBF7] gap-4">
      <Loader size={48} className="text-[#EA580C] animate-spin" />
      <p className="text-xl font-bold text-[#1A1C23]">Verifying your email...</p>
    </div>
  );
  if (status === 'error') return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFBF7] gap-4">
      <XCircle size={64} className="text-[#EA001E]" />
      <p className="text-2xl font-black text-[#EA001E]">Invalid or expired link.</p>
      <button onClick={() => navigate('/store')} className="bg-[#1A1C23] text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition">Back to Store</button>
    </div>
  );
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFBF7] gap-4">
      <CheckCircle size={64} className="text-[#45C65A]" />
      <p className="text-2xl font-black text-[#45C65A]">Email Verified!</p>
      <p className="text-gray-500 font-medium">Redirecting to store...</p>
    </div>
  );
}