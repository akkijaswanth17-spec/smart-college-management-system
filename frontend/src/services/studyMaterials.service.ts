import { api } from "./api";
import { StudyMaterial, StudyMaterialType } from "../types";

export const studyMaterialsService = {
  async list(params?: { type?: StudyMaterialType; search?: string }) {
    const res = await api.get<{ data: StudyMaterial[] }>("/study-materials", { params });
    return res.data.data;
  },
  async upload(payload: { title: string; type: StudyMaterialType; file: File; departmentId?: string }) {
    const form = new FormData();
    form.append("title", payload.title);
    form.append("type", payload.type);
    form.append("file", payload.file);
    if (payload.departmentId) form.append("departmentId", payload.departmentId);
    const res = await api.post<{ data: StudyMaterial }>("/study-materials", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
  async remove(id: string) {
    await api.delete(`/study-materials/${id}`);
  },
};
