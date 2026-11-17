// frontend/src/components/AdminLogin.jsx
import { useNavigate } from 'react-router-dom';
import StaffLoginPage from './StaffLoginPage';

export default function AdminLogin() {
  const navigate = useNavigate();
  return (
    <StaffLoginPage
      requiredRoles={['admin', 'manager', 'supervisor', 'inventory']}
      portalName="Merchant Portal"
      onAuthorized={() => navigate('/admin')}
    />
  );
}