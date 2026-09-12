import { api } from "./api";

export interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  todaysClasses: number;
  activeNotices: number;
  academicUpdatesCount: number;
  pendingLostFound: number;
  pendingWhatsAppRequests: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentUsers: { id: string; email: string; role: string; createdAt: string }[];
  recentNotices: { id: string; title: string; category: string; createdAt: string }[];
  upcomingTimetable: Array<Record<string, unknown>>;
  pendingRequests: Array<Record<string, unknown>>;
}

export const adminService = {
  async getDashboard() {
    const res = await api.get<{ data: DashboardData }>("/admin/dashboard");
    return res.data.data;
  },
};
