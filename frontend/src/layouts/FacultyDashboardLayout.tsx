import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Bell,
  Megaphone,
  BookOpen,
  Search,
  Users,
  User,
} from "lucide-react";
import { DashboardLayout, NavItem } from "./DashboardLayout";

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/faculty/dashboard", icon: LayoutDashboard, end: true },
  { label: "My Timetable", to: "/faculty/timetable", icon: CalendarDays },
  { label: "Next Class", to: "/faculty/next-class", icon: CalendarClock },
  { label: "Notifications", to: "/faculty/notifications", icon: Bell },
  { label: "Notices", to: "/faculty/notices", icon: Megaphone },
  { label: "Academic Updates", to: "/faculty/academic-updates", icon: BookOpen },
  { label: "Lost & Found", to: "/faculty/lost-found", icon: Search },
  { label: "Students", to: "/faculty/students", icon: Users },
  { label: "Profile", to: "/faculty/profile", icon: User },
];

export default function FacultyDashboardLayout() {
  return (
    <DashboardLayout navItems={navItems} roleLabel="Faculty" loginPath="/faculty/login">
      <Outlet />
    </DashboardLayout>
  );
}
