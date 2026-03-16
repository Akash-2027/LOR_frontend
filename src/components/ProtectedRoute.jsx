import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import { getDashboardPath } from '../features/auth/utils/authHelpers.js';

const ProtectedRoute = ({ roles, children }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
