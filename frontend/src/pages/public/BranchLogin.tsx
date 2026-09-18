import { AuthLayout } from "../../layouts/AuthLayout";
import { LoginForm } from "../../components/LoginForm";

/**
 * Deliberately not linked from the public landing page or header — branch
 * (HOD/coordinator) accounts reach this via a direct URL shared by the
 * college, not a public button.
 */
export default function BranchLogin() {
  return (
    <AuthLayout title="Branch Sign In" subtitle="Manage students, faculty, timetable and marks for your department.">
      <LoginForm
        expectedRole="BRANCH"
        dashboardPath="/branch/students"
        altId={{ label: "Email or Branch ID", placeholder: "you@college.edu or your Branch ID" }}
      />
    </AuthLayout>
  );
}
