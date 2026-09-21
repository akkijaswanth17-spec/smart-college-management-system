import { api } from "./api";
import { ImportSummary } from "../types";

export const importService = {
  async students(file: File, defaults?: { departmentId?: string; year?: number; section?: string }) {
    const form = new FormData();
    form.append("file", file);
    if (defaults?.departmentId) form.append("departmentId", defaults.departmentId);
    if (defaults?.year) form.append("year", String(defaults.year));
    if (defaults?.section) form.append("section", defaults.section);
    const res = await api.post<{ data: ImportSummary }>("/import/students", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
  async faculty(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<{ data: ImportSummary }>("/import/faculty", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
  async timetableCsv(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<{ data: ImportSummary }>("/import/timetable", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
  async timetableImage(file: File) {
    const form = new FormData();
    form.append("image", file);
    const res = await api.post<{
      data: { imageUrl: string; rawText: string; rows: Record<string, unknown>[] };
    }>("/import/timetable/image", form, { headers: { "Content-Type": "multipart/form-data" } });
    return res.data.data;
  },
  async confirmTimetableImage(rows: Record<string, unknown>[]) {
    const res = await api.post<{ data: { created: number; failed: number; errors: unknown[] } }>(
      "/import/timetable/image/confirm",
      { rows }
    );
    return res.data.data;
  },
};
