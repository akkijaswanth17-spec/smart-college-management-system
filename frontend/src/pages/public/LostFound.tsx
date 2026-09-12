import { PublicLayout } from "../../layouts/PublicLayout";
import { LostFoundPage } from "../shared/LostFoundPage";

/** Public Lost & Found board — anyone on campus can browse it, no account required. */
export default function PublicLostFound() {
  return (
    <PublicLayout>
      <div className="container-page py-10">
        <LostFoundPage />
      </div>
    </PublicLayout>
  );
}
