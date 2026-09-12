import { ShieldAlert } from "lucide-react";
import { ErrorPage } from "../../components/ErrorPage";

export default function Forbidden() {
  return (
    <ErrorPage
      code="403"
      icon={ShieldAlert}
      title="Access denied"
      description="You don't have permission to access this page."
    />
  );
}
