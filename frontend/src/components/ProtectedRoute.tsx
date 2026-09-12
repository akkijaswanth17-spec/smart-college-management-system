import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageSpinner } from "./ui/Spinner";
import { Role } from "../types";

/**
 * Frontend route gating is a UX convenience only — every API call the
 * pages behind this make is independently re-checked by backend RBAC
 * middleware, since a client can always bypass client-side routing.
 */
export function ProtectedRoute({ allowedRoles }: { allowedRoles: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;

  if (!user) {
    const loginPath = allowedRoles.includes("ADMIN")
      ? "/admin/login"
      : allowedRoles.includes("FACULTY")
        ? "/faculty/login"
        : allowedRoles.includes("BRANCH")
          ? "/branch/login"
          : "/login";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
