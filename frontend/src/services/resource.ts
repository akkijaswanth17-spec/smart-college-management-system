import { api } from "./api";
import { ApiItemResponse, ApiListResponse } from "../types";

/** Generic CRUD helper for the many simple REST resources in this app. */
export function createCrudService<T>(basePath: string) {
  return {
    async list(params?: Record<string, unknown>) {
      const res = await api.get<ApiListResponse<T>>(basePath, { params });
      return res.data;
    },
    async get(id: string) {
      const res = await api.get<ApiItemResponse<T>>(`${basePath}/${id}`);
      return res.data.data;
    },
    async create(payload: Record<string, unknown> | FormData) {
      const res = await api.post<ApiItemResponse<T>>(basePath, payload, {
        headers: payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
      });
      return res.data.data;
    },
    async update(id: string, payload: Record<string, unknown> | FormData) {
      const res = await api.put<ApiItemResponse<T>>(`${basePath}/${id}`, payload, {
        headers: payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
      });
      return res.data.data;
    },
    async remove(id: string) {
      await api.delete(`${basePath}/${id}`);
    },
  };
}
