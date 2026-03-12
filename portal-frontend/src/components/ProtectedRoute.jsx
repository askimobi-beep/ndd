import { Navigate, useLocation } from "react-router-dom";
import {
  getAuthUser,
  getDefaultRouteForRole,
  hasAnyRole,
  isAuthenticated,
} from "../utils/auth";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const user = getAuthUser();
  if (!hasAnyRole(user?.role, allowedRoles)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return children;
}
