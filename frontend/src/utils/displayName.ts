import { AuthUser } from "../types";

/** The best real name available for a logged-in user, across every role — falls back to their email. */
export function getDisplayName(user: AuthUser | null | undefined): string {
  return (
    user?.student?.fullName ??
    user?.faculty?.fullName ??
    user?.admin?.fullName ??
    user?.branchAdmin?.fullName ??
    user?.email ??
    "Unknown"
  );
}
