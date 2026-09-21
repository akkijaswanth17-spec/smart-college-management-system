import { useEffect, useState } from "react";
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
import { feedbackService } from "../services/feedback.service";

const BASE_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard, end: true },
  { label: "Timetable", to: "/student/timetable", icon: CalendarDays },
  { label: "Notices", to: "/student/notices", icon: Megaphone },
  { label: "Academic Updates", to: "/student/academic-updates", icon: BookOpen },
  { label: "Study Materials", to: "/student/study-materials", icon: FolderOpen },
  { label: "Lost & Found", to: "/student/lost-found", icon: Search },
  { label: "Fee Payment", to: "/student/fees", icon: CreditCard },
  { label: "Results", to: "/student/results", icon: GraduationCap },
  { label: "Marks", to: "/student/marks", icon: ClipboardList },
  { label: "WhatsApp Groups", to: "/student/whatsapp", icon: MessageCircle },
  { label: "Notifications", to: "/student/notifications", icon: Bell },
  { label: "Profile", to: "/student/profile", icon: User },
];

const FEEDBACK_NAV_ITEM: NavItem = { label: "Faculty Feedback", to: "/student/feedback", icon: Star };

export default function StudentDashboardLayout() {
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);

  useEffect(() => {
    feedbackService
      .getEnabled()
      .then(setFeedbackEnabled)
      .catch(() => setFeedbackEnabled(false));
  }, []);

  const navItems = feedbackEnabled
    ? [...BASE_NAV_ITEMS.slice(0, 5), FEEDBACK_NAV_ITEM, ...BASE_NAV_ITEMS.slice(5)]
    : BASE_NAV_ITEMS;

  return (
    <DashboardLayout navItems={navItems} roleLabel="Student" loginPath="/login">
      <Outlet />
    </DashboardLayout>
  );
}
