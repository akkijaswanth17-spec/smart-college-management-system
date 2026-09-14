import { api } from "./api";

export interface PromotionStudentRow {
  id: string;
  studentId: string;
  fullName: string;
  year: number;
  semester: number | null;
}

export interface PromotePayload {
  toYear: number;
  toSemester: number | null;
  academicYear: string;
  promote: string[];
  detain: string[];
  condone: string[];
}

export const promotionService = {
  async getSheet(params: { departmentId: string; year: number; section: string }) {
    const res = await api.get<{ data: PromotionStudentRow[] }>("/promotions/sheet", { params });
    return res.data.data;
  },
  async promote(payload: PromotePayload) {
    const res = await api.post<{ data: { promoted: number; detained: number } }>("/promotions/promote", payload);
    return res.data.data;
  },
};
