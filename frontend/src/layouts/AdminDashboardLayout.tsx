import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  Upload,
  Megaphone,
  BookOpen,
  Search,
  MessageCircle,
  MessagesSquare,
  Link2,
  Database,
  ClipboardList,
  FileSpreadsheet,
  Building2,
  BarChart3,
  User,
  TrendingUp,
} from "lucide-react";
import { DashboardLayout, NavItem } from "./DashboardLayout";

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard, end: true },
  { label: "Students", to: "/admin/students", icon: Users },
  { label: "Faculty", to: "/admin/faculty", icon: GraduationCap },
  {
    label: "Timetable",
    to: "/admin/timetable",
    icon: CalendarDays,
    children: [{ label: "Timetable Import", to: "/admin/timetable/import", icon: Upload }],
  },
  { label: "Notices", to: "/admin/notices", icon: Megaphone },
  { label: "Academic Updates", to: "/admin/academic-updates", icon: BookOpen },
  { label: "Lost & Found", to: "/admin/lost-found", icon: Search },
  {
    label: "WhatsApp",
    to: "/admin/whatsapp-groups",
    icon: MessageCircle,
    children: [{ label: "WhatsApp Requests", to: "/admin/whatsapp-requests", icon: MessagesSquare }],
  },
  { label: "Links & Settings", to: "/admin/settings", icon: Link2 },
  { label: "Data Import", to: "/admin/import", icon: Database },
  { label: "Marks", to: "/admin/marks", icon: FileSpreadsheet },
  { label: "Promotions", to: "/admin/promotions", icon: TrendingUp },
  { label: "Branch Accounts", to: "/admin/branch-accounts", icon: Building2 },
  { label: "Reports", to: "/admin/reports", icon: BarChart3 },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ClipboardList },
  { label: "Profile", to: "/admin/profile", icon: User },
];

export default function AdminDashboardLayout() {
  return (
    <DashboardLayout navItems={navItems} roleLabel="Administrator" loginPath="/admin/login">
      <Outlet />
    </DashboardLayout>
  );
}
