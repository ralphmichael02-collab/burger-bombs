import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
      })
      .catch(() => setStatus('error'));
  }, [searchParams, navigate]);

  if (status === 'verifying') return <div className="h-screen flex items-center justify-center text-xl">Verifying your email...</div>;
  if (status === 'error') return <div className="h-screen flex items-center justify-center text-red-500 text-xl">Invalid or expired link.</div>;

  return (
    <div className="h-screen flex items-center justify-center text-green-600 text-xl font-bold">
      ✅ Email Verified! Redirecting to store...
    </div>
  );
}