import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  BookOpen,
  Search,
  CreditCard,
  GraduationCap,
  MessageCircle,
  Bell,
  User,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  Star,
} from "lucide-react";
import { DashboardLayout, NavItem } from "./DashboardLayout";

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard, end: true },
  { label: "Timetable", to: "/student/timetable", icon: CalendarDays },
  { label: "Notices", to: "/student/notices", icon: Megaphone },
  { label: "Academic Updates", to: "/student/academic-updates", icon: BookOpen },
  { label: "Study Materials", to: "/student/study-materials", icon: FolderOpen },
  { label: "Faculty Feedback", to: "/student/feedback", icon: Star },
  { label: "Lost & Found", to: "/student/lost-found", icon: Search },
  { label: "Fee Payment", to: "/student/fees", icon: CreditCard },
  { label: "Results", to: "/student/results", icon: GraduationCap },
  { label: "Marks", to: "/student/marks", icon: ClipboardList },
  { label: "WhatsApp Groups", to: "/student/whatsapp", icon: MessageCircle },
  { label: "Notifications", to: "/student/notifications", icon: Bell },
  { label: "Profile", to: "/student/profile", icon: User },
];

export default function StudentDashboardLayout() {
  return (
    <DashboardLayout navItems={navItems} roleLabel="Student" loginPath="/login">
      <Outlet />
    </DashboardLayout>
  );
}
