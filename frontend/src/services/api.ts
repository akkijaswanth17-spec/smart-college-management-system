import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Each role has its own session cookie on the server, so a tab says which one
// it is using — this is what lets an admin tab and a student tab stay signed in
// side by side in the same browser. The role comes from the URL section
// (/admin, /faculty, /branch, /student; /login is the student sign-in page) and
// is remembered per tab (sessionStorage) for pages outside those sections.
const SESSION_ROLES = ["admin", "faculty", "branch", "student"];
const TAB_ROLE_KEY = "scms.sessionRole";

export function tabSessionRole(): string | undefined {
  const section = window.location.pathname.split("/")[1]?.toLowerCase() ?? "";
  const fromPath = section === "login" ? "student" : SESSION_ROLES.includes(section) ? section : undefined;
  try {
    if (fromPath) sessionStorage.setItem(TAB_ROLE_KEY, fromPath);
    return fromPath ?? sessionStorage.getItem(TAB_ROLE_KEY) ?? undefined;
  } catch {
    return fromPath;
  }
}

api.interceptors.request.use((config) => {
  const role = tabSessionRole();
  if (role) config.headers.set("X-Session-Role", role);
  return config;
});

export interface ApiErrorShape {
  success: false;
  message: string;
  details?: unknown;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    return data?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
