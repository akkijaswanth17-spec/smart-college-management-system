import { Outlet } from "react-router-dom";
import { Users, GraduationCap, CalendarDays, FileSpreadsheet, BarChart3, TrendingUp } from "lucide-react";
import { DashboardLayout, NavItem } from "./DashboardLayout";

const navItems: NavItem[] = [
  { label: "Students", to: "/branch/students", icon: Users, end: true },
  { label: "Faculty", to: "/branch/faculty", icon: GraduationCap },
  { label: "Timetable", to: "/branch/timetable", icon: CalendarDays },
  { label: "Marks", to: "/branch/marks", icon: FileSpreadsheet },
  { label: "Promotions", to: "/branch/promotions", icon: TrendingUp },
  { label: "Reports", to: "/branch/reports", icon: BarChart3 },
];

export default function BranchDashboardLayout() {
  return (
    <DashboardLayout navItems={navItems} roleLabel="Branch Admin" loginPath="/branch/login">
      <Outlet />
    </DashboardLayout>
  );
}
