import { Navigate, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Card, CardBody } from "../../components/ui/Card";
import { ChangePasswordForm } from "../../components/ChangePasswordForm";
import { Logo } from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";
import { PageSpinner } from "../../components/ui/Spinner";

/**
 * Shown when the backend flags mustChangePassword (accounts created by an
 * admin or bulk import get a temporary password and must set their own
 * before they can use the rest of the app). Intentionally not wrapped in
 * ProtectedRoute — that component redirects here, so this page does its
 * own lightweight auth check instead of risking a redirect loop.
 */
export default function ForceChangePassword() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();

  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  async function handleSuccess() {
    await refresh();
    const dashboard =
      user?.role === "ADMIN" ? "/admin/dashboard" : user?.role === "FACULTY" ? "/faculty/dashboard" : "/student/dashboard";
    navigate(dashboard, { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardBody className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-slate-900">Set a New Password</h1>
            <p className="mt-1 text-sm text-slate-500">
              Your account was created with a temporary password. For security, please set your own password before
              continuing.
            </p>
            <div className="mt-6 text-left">
              <ChangePasswordForm onSuccess={handleSuccess} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
