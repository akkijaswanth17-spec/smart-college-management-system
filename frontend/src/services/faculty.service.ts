import { FacultyProfile, PaginationMeta } from "../types";
import { api } from "./api";

export const facultyService = {
  async list(params?: Record<string, unknown>) {
    const res = await api.get<{ data: FacultyProfile[]; meta: PaginationMeta }>("/faculty", { params });
    return res.data;
  },
  async get(id: string) {
    const res = await api.get<{ data: FacultyProfile }>(`/faculty/${id}`);
    return res.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const res = await api.post<{ data: { faculty: FacultyProfile; tempPassword: string } }>("/faculty", payload);
    return res.data.data;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const res = await api.put<{ data: FacultyProfile }>(`/faculty/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string) {
    await api.delete(`/faculty/${id}`);
  },
  async setActive(id: string, isActive: boolean) {
    await api.patch(`/faculty/${id}/status`, { isActive });
  },
  async resetPassword(id: string) {
    const res = await api.post<{ data: { temporaryPassword: string } }>(`/faculty/${id}/reset-password`, {});
    return res.data.data.temporaryPassword;
  },
};
