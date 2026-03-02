import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';

/**
 * Route wrapper that only allows Admin users.
 * Non-admin authenticated users are redirected to Dashboard.
 */
export default function AdminRoute() {
  const user = useAuthStore((s) => s.user);

  if (user?.rol !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
