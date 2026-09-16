import { api } from "./api";
import { ImportSummary, MyMark, AdminMark, MarksSheet, ExamType } from "../types";

export const marksService = {
  async import(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<{ data: ImportSummary }>("/marks/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
  async importWide(
    file: File,
    params: { departmentId: string; year: number; section: string; examType: ExamType; academicYear: string }
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("departmentId", params.departmentId);
    form.append("year", String(params.year));
    form.append("section", params.section);
    form.append("examType", params.examType);
    form.append("academicYear", params.academicYear);
    const res = await api.post<{ data: ImportSummary }>("/marks/import-sheet", form);
    return res.data.data;
  },
  async getMine() {
    const res = await api.get<{ data: MyMark[] }>("/marks/me");
    return res.data.data;
  },
  async list(params?: { search?: string; subjectId?: string; departmentId?: string; year?: number; section?: string }) {
    const res = await api.get<{ data: AdminMark[] }>("/marks", { params });
    return res.data.data;
  },
  async remove(id: string) {
    await api.delete(`/marks/${id}`);
  },
  async getSheet(params: { departmentId: string; year: number; section: string; examType: ExamType; academicYear?: string }) {
    const res = await api.get<{ data: MarksSheet }>("/marks/sheet", { params });
    return res.data.data;
  },
  async saveSheet(payload: {
    examType: ExamType;
    academicYear: string;
    entries: { studentId: string; subjectId: string; value: number | null }[];
  }) {
    const res = await api.post<{ data: { saved: number } }>("/marks/sheet", payload);
    return res.data.data;
  },
};
