import { api } from "./api";
import { AppNotification, PaginationMeta } from "../types";

export const notificationsService = {
  async list(params?: Record<string, unknown>) {
    const res = await api.get<{ data: AppNotification[]; meta: PaginationMeta }>("/notifications", { params });
    return res.data;
  },
  async markRead(id: string) {
    await api.put(`/notifications/${id}/read`);
  },
  async markAllRead() {
    await api.put("/notifications/read-all");
  },
};
