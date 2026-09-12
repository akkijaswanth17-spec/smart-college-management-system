import { api } from "./api";
import { AuditLog, PaginationMeta } from "../types";

export const auditService = {
  async list(params?: Record<string, unknown>) {
    const res = await api.get<{ data: AuditLog[]; meta: PaginationMeta }>("/audit-logs", { params });
    return res.data;
  },
};
