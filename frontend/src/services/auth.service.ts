import { api } from "./api";
import { AuthUser } from "../types";

export async function login(email: string, password: string) {
  const res = await api.post<{ data: { user: AuthUser } }>("/auth/login", { email, password });
  return res.data.data.user;
}

/** `role` signs out that role's session instead of this tab's (used to undo a sign-in on the wrong login page). */
export async function logout(role?: string) {
  await api.post("/auth/logout", role ? { role } : undefined);
}

export async function getMe() {
  const res = await api.get<{ data: AuthUser }>("/auth/me");
  return res.data.data;
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  await api.post("/auth/change-password", { currentPassword, newPassword, confirmPassword });
}

export async function updateEmail(email: string) {
  await api.put("/auth/email", { email });
}

export interface ForgotPasswordResult {
  emailSent: boolean;
  /** Only ever populated in development, when no email provider is configured yet. */
  devCode?: string;
}

export async function forgotPassword(email: string) {
  const res = await api.post<{ data: ForgotPasswordResult }>("/auth/forgot-password", { email });
  return res.data.data;
}

export async function resetPassword(email: string, code: string, newPassword: string, confirmPassword: string) {
  await api.post("/auth/reset-password", { email, code, newPassword, confirmPassword });
}

export async function uploadAvatar(file: Blob) {
  const payload = new FormData();
  payload.append("avatar", file, "avatar.jpg");
  // No explicit Content-Type here — the browser needs to generate the
  // multipart boundary itself from the FormData; overriding it breaks parsing.
  const res = await api.post<{ data: AuthUser }>("/auth/avatar", payload);
  return res.data.data;
}
