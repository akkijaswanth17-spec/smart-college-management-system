import { AuthLayout } from "../../layouts/AuthLayout";
import { LoginForm } from "../../components/LoginForm";

/**
 * Deliberately not linked from the public landing page or header — faculty
 * reach this via a direct URL shared by the college, not a public button.
 */
export default function FacultyLogin() {
  return (
    <AuthLayout title="Faculty Sign In" subtitle="Access your timetable, notices and student records.">
      <LoginForm
        expectedRole="FACULTY"
        dashboardPath="/faculty/dashboard"
        altId={{ label: "Email or Faculty ID", placeholder: "you@college.edu or your Faculty ID" }}
      />
    </AuthLayout>
  );
}
