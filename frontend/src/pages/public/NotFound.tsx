import { FileQuestion } from "lucide-react";
import { ErrorPage } from "../../components/ErrorPage";

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      icon={FileQuestion}
      title="Page not found"
      description="The page you're looking for doesn't exist or may have been moved."
    />
  );
}
