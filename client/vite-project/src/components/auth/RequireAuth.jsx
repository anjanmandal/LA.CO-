import { Navigate, useLocation } from 'react-router-dom';
import FullPageLoader from '../common/FullPageLoader';
import { useAuth } from '../../context/AuthContext';

export default function RequireAuth({ children, roles }) {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
