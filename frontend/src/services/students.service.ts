import { StudentProfile, PaginationMeta } from "../types";
import { api } from "./api";

export const studentsService = {
  async create(payload: Record<string, unknown>) {
    const res = await api.post<{ data: { student: StudentProfile; tempPassword: string } }>("/students", payload);
    return res.data.data;
  },
  async list(params?: Record<string, unknown>) {
    const res = await api.get<{ data: StudentProfile[]; meta: PaginationMeta }>("/students", { params });
    return res.data;
  },
  async get(id: string) {
    const res = await api.get<{ data: StudentProfile }>(`/students/${id}`);
    return res.data.data;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const res = await api.put<{ data: StudentProfile }>(`/students/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string) {
    await api.delete(`/students/${id}`);
  },
  async setActive(id: string, isActive: boolean) {
    await api.patch(`/students/${id}/status`, { isActive });
  },
};
