import { api } from "./api";
import { TimetableEntry } from "../types";

export const timetableService = {
  async list(params?: Record<string, unknown>) {
    const res = await api.get<{ data: TimetableEntry[] }>("/timetable", { params });
    return res.data.data;
  },
  async my() {
    const res = await api.get<{ data: TimetableEntry[] }>("/timetable/my");
    return res.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const res = await api.post<{ data: TimetableEntry }>("/timetable", payload);
    return res.data.data;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const res = await api.put<{ data: TimetableEntry }>(`/timetable/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string) {
    await api.delete(`/timetable/${id}`);
  },
};
