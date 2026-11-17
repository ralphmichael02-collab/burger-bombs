// frontend/src/components/StaffGuard.jsx
import { useState, useEffect } from 'react';
import StaffLoginPage from './StaffLoginPage';

export default function StaffGuard({ children, requiredRoles = [], portalName = 'Staff Portal' }) {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('staff_user');
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }
    setChecked(true);
  }, []);

  if (!checked) {
    return <div className="h-screen flex items-center justify-center bg-background text-primary font-bold">Loading…</div>;
  }

  const isAuthorized = user && (requiredRoles.length === 0 || requiredRoles.includes(user.role));
  if (isAuthorized) return children;

  return (
    <StaffLoginPage
      requiredRoles={requiredRoles}
      portalName={portalName}
      onAuthorized={(newUser) => setUser(newUser)}
    />
  );
}