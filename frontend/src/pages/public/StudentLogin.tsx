import { AuthLayout } from "../../layouts/AuthLayout";
import { LoginForm } from "../../components/LoginForm";

export default function StudentLogin() {
  return (
    <AuthLayout title="Student Sign In" subtitle="Access your notices, results, fees and more.">
      <LoginForm expectedRole="STUDENT" dashboardPath="/student/dashboard" allowRollNumber />
    </AuthLayout>
  );
}
