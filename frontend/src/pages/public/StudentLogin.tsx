import { AuthLayout } from "../../layouts/AuthLayout";
import { LoginForm } from "../../components/LoginForm";

export default function StudentLogin() {
  return (
    <AuthLayout title="Student Sign In" subtitle="Access your notices, results, fees and more.">
      <LoginForm
        expectedRole="STUDENT"
        dashboardPath="/student/dashboard"
        altId={{ label: "Email or Roll Number", placeholder: "you@college.edu or STU001" }}
      />
    </AuthLayout>
  );
}
