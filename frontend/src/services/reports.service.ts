import { api } from "./api";
import { StudentDetailsReportData, StudentMarksReportData, FacultyDetailsReportData } from "../types";

export const reportsService = {
  async studentDetails(studentId: string) {
    const res = await api.get<{ data: StudentDetailsReportData }>(`/reports/student/${encodeURIComponent(studentId)}`);
    return res.data.data;
  },
  async studentMarks(studentId: string) {
    const res = await api.get<{ data: StudentMarksReportData }>(
      `/reports/student/${encodeURIComponent(studentId)}/marks`
    );
    return res.data.data;
  },
  async facultyDetails(facultyId: string) {
    const res = await api.get<{ data: FacultyDetailsReportData }>(`/reports/faculty/${encodeURIComponent(facultyId)}`);
    return res.data.data;
  },
};
