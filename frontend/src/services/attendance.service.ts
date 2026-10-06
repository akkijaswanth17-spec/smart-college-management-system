import { api } from "./api";
import {
  MyTodayPeriodsResponse,
  ClassTodayPeriodsResponse,
  AttendanceRosterResponse,
  AttendanceClassReportRow,
  MyAttendanceResponse,
  AttendanceAbsence,
  LeaveRequest,
  AttendanceStatus,
} from "../types";

export interface AttendanceReportParams {
  departmentId?: string;
  year: number;
  section: string;
  subjectId?: string;
  facultyId?: string;
  dateFrom: string;
  dateTo: string;
}

export const attendanceService = {
  // Threshold
  async getThreshold() {
    const res = await api.get<{ data: { percent: number } }>("/attendance/threshold");
    return res.data.data.percent;
  },
  async setThreshold(percent: number) {
    const res = await api.put<{ data: { percent: number } }>("/attendance/threshold", { percent });
    return res.data.data.percent;
  },

  // Faculty
  async myTodayPeriods() {
    const res = await api.get<{ data: MyTodayPeriodsResponse }>("/attendance/faculty/today");
    return res.data.data;
  },

  // Branch / Admin
  async classTodayPeriods(params: { departmentId?: string; year: number; section: string }) {
    const res = await api.get<{ data: ClassTodayPeriodsResponse }>("/attendance/class/today", { params });
    return res.data.data;
  },

  // Shared take/update
  async roster(timetableEntryId: string, date: string) {
    const res = await api.get<{ data: AttendanceRosterResponse }>(`/attendance/roster/${timetableEntryId}`, {
      params: { date },
    });
    return res.data.data;
  },
  async save(payload: { timetableEntryId: string; date: string; records: { studentId: string; status: AttendanceStatus }[] }) {
    const res = await api.post<{ data: { saved: number; present: number; absent: number } }>(
      "/attendance/save",
      payload
    );
    return res.data.data;
  },

  // Reports
  async classReport(params: AttendanceReportParams) {
    const res = await api.get<{ data: AttendanceClassReportRow[] }>("/attendance/report", { params });
    return res.data.data;
  },

  // Student
  async myAttendance() {
    const res = await api.get<{ data: MyAttendanceResponse }>("/attendance/me");
    return res.data.data;
  },
  async myAbsences() {
    const res = await api.get<{ data: AttendanceAbsence[] }>("/attendance/me/absences");
    return res.data.data;
  },

  // Leave requests
  async submitLeave(payload: { leaveDate: string; reason: string }) {
    const res = await api.post<{ data: LeaveRequest }>("/attendance/leave", payload);
    return res.data.data;
  },
  async myLeaveRequests() {
    const res = await api.get<{ data: LeaveRequest[] }>("/attendance/leave/mine");
    return res.data.data;
  },
  async listLeaveRequests(params: { departmentId?: string; year?: number; section?: string; status?: string }) {
    const res = await api.get<{ data: LeaveRequest[] }>("/attendance/leave/requests", { params });
    return res.data.data;
  },
  async reviewLeave(id: string, payload: { status: "APPROVED" | "REJECTED"; remarks?: string }) {
    const res = await api.put<{ data: LeaveRequest }>(`/attendance/leave/${id}/review`, payload);
    return res.data.data;
  },
};
