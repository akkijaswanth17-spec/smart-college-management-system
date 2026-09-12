import { api } from "./api";
import { WhatsAppGroup, WhatsAppRequest, PaginationMeta } from "../types";

export const whatsappService = {
  async listGroups() {
    const res = await api.get<{ data: WhatsAppGroup[] }>("/whatsapp/groups");
    return res.data.data;
  },
  async createGroup(payload: Record<string, unknown>) {
    const res = await api.post<{ data: WhatsAppGroup }>("/whatsapp/groups", payload);
    return res.data.data;
  },
  async createRequest(payload: Record<string, unknown>) {
    const res = await api.post<{ data: WhatsAppRequest }>("/whatsapp/requests", payload);
    return res.data.data;
  },
  async myRequests() {
    const res = await api.get<{ data: WhatsAppRequest[] }>("/whatsapp/requests/my");
    return res.data.data;
  },
  async listRequests(params?: Record<string, unknown>) {
    const res = await api.get<{ data: WhatsAppRequest[]; meta: PaginationMeta }>("/whatsapp/requests", { params });
    return res.data;
  },
  async updateRequestStatus(id: string, status: "APPROVED" | "REJECTED") {
    const res = await api.put<{ data: WhatsAppRequest }>(`/whatsapp/requests/${id}`, { status });
    return res.data.data;
  },
  async deleteRequest(id: string) {
    await api.delete(`/whatsapp/requests/${id}`);
  },
};
