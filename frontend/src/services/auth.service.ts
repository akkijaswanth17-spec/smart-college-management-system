import { api } from "./api";
import { AuthUser } from "../types";

export async function login(email: string, password: string) {
  const res = await api.post<{ data: { user: AuthUser } }>("/auth/login", { email, password });
  return res.data.data.user;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function getMe() {
  const res = await api.get<{ data: AuthUser }>("/auth/me");
  return res.data.data;
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  await api.post("/auth/change-password", { currentPassword, newPassword, confirmPassword });
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

export async function uploadAvatar(file: File) {
  const payload = new FormData();
  payload.append("avatar", file);
  const res = await api.post<{ data: AuthUser }>("/auth/avatar", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}
