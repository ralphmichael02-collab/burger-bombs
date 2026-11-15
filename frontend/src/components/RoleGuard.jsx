// frontend/src/components/RoleGuard.jsx
import { Navigate } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { canAccessPage, getDefaultRoute, ROLE_LABELS } from '../utils/roles';

export default function RoleGuard({ children, requiredPage }) {
  const staffUser = JSON.parse(localStorage.getItem('staff_user') || 'null');

  // Not logged in → redirect to login
  if (!staffUser) {
    return <Navigate to="/admin/login" replace />;
  }

  // Logged in but wrong role → Access Denied screen
  if (!canAccessPage(staffUser.role, requiredPage)) {
    const defaultRoute = getDefaultRoute(staffUser.role);
    return (
      <div className="min-h-screen bg-[#1A1C23] flex items-center justify-center p-6 text-center font-['Source_Sans_Pro',sans-serif]">
        <div className="max-w-md">
          <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldX size={40} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Access Denied</h1>
          <p className="text-gray-400 mb-1">
            Logged in as <b className="text-white">{staffUser.name}</b>
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Role: {ROLE_LABELS[staffUser.role] || staffUser.role}
          </p>
          <p className="text-gray-400 mb-8 text-sm">
            Your role does not have permission to access this page.
          </p>
          <a
            href={defaultRoute}
            className="inline-flex items-center gap-2 bg-[#EA580C] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#C2410C] transition shadow-lg"
          >
            <ArrowLeft size={18} /> Go to my dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}