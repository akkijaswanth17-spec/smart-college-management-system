import { Lock } from "lucide-react";
import { ErrorPage } from "../../components/ErrorPage";

export default function Unauthorized() {
  return (
    <ErrorPage
      code="401"
      icon={Lock}
      title="Sign in required"
      description="Your session has expired or you're not signed in. Please log in to continue."
    />
  );
}
