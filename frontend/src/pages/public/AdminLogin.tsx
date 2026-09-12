import { AuthLayout } from "../../layouts/AuthLayout";
import { LoginForm } from "../../components/LoginForm";

/**
 * Not linked anywhere in the public UI. Admin accounts are provisioned
 * only via the seed script or an existing admin — never public registration.
 */
export default function AdminLogin() {
  return (
    <AuthLayout title="Administrator Sign In" subtitle="Manage students, faculty, timetables and college-wide settings.">
      <LoginForm expectedRole="ADMIN" dashboardPath="/admin/dashboard" />
    </AuthLayout>
  );
}
