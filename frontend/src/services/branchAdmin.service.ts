import { BranchAdminProfile } from "../types";
import { api } from "./api";

export const branchAdminService = {
  async list() {
    const res = await api.get<{ data: BranchAdminProfile[] }>("/branch-admins");
    return res.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const res = await api.post<{ data: { branchAdmin: BranchAdminProfile; tempPassword: string } }>(
      "/branch-admins",
      payload
    );
    return res.data.data;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const res = await api.put<{ data: BranchAdminProfile }>(`/branch-admins/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string) {
    await api.delete(`/branch-admins/${id}`);
  },
  async setActive(id: string, isActive: boolean) {
    await api.patch(`/branch-admins/${id}/status`, { isActive });
  },
  async resetPassword(id: string) {
    const res = await api.post<{ data: { temporaryPassword: string } }>(`/branch-admins/${id}/reset-password`, {});
    return res.data.data.temporaryPassword;
  },
};
