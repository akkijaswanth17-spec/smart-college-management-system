import { ServerCrash } from "lucide-react";
import { ErrorPage } from "../../components/ErrorPage";

export default function ServerError() {
  return (
    <ErrorPage
      code="500"
      icon={ServerCrash}
      title="Something went wrong"
      description="An unexpected error occurred on our end. Please try again in a moment."
    />
  );
}
