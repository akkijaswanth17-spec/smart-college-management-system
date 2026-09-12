import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Megaphone,
  BookOpen,
  Search,
  CreditCard,
  GraduationCap,
  MessageCircle,
  ArrowRight,
  CalendarDays,
  Clock,
  Radio,
} from "lucide-react";
import { CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { StatCard } from "../../components/ui/StatCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PersonAvatar } from "../../components/ui/Avatar";
import { SkeletonList, SkeletonStatGrid, SkeletonCardGrid } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { ScheduleStrip } from "../../components/ScheduleStrip";
import { BarChart } from "../../components/charts/BarChart";
import { ProgressRing } from "../../components/charts/ProgressRing";
import { useAuth } from "../../context/AuthContext";
import { useStudentSchedule } from "../../hooks/useStudentSchedule";
import { useClock } from "../../hooks/useClock";
import { format } from "date-fns";
import { DayOfWeek } from "../../types";
import { noticesService } from "../../services/notices.service";
import { academicUpdatesService } from "../../services/academicUpdates.service";
import { whatsappService } from "../../services/whatsapp.service";
import { formatDate, titleCase } from "../../utils/format";
import { Notice, AcademicUpdate } from "../../types";

const QUICK_LINKS = [
  {
    to: "/student/timetable",
    label: "Full Timetable",
    description: "See your complete weekly class schedule",
    icon: CalendarDays,
    tone: "bg-brand-50 text-brand-600",
  },
  {
    to: "/student/notices",
    label: "Notices",
    description: "Official announcements from the college",
    icon: Megaphone,
    tone: "bg-brand-50 text-brand-600",
  },
  {
    to: "/student/academic-updates",
    label: "Academic Updates",
    description: "Exams, assignments and internal deadlines",
    icon: BookOpen,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    to: "/student/lost-found",
    label: "Lost & Found",
    description: "Report or search items lost on campus",
    icon: Search,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    to: "/student/fees",
    label: "Fee Payment",
    description: "Pay your fees on the official portal",
    icon: CreditCard,
    tone: "bg-gold-50 text-gold-600",
  },
  {
    to: "/student/results",
    label: "Results",
    description: "Check your semester results",
    icon: GraduationCap,
    tone: "bg-brand-50 text-brand-600",
  },
  {
    to: "/student/whatsapp",
    label: "WhatsApp Groups",
    description: "Request to join subject & section groups",
    icon: MessageCircle,
    tone: "bg-green-50 text-green-600",
  },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const WEEK_DAYS: { day: DayOfWeek; label: string }[] = [
  { day: "MONDAY", label: "Mon" },
  { day: "TUESDAY", label: "Tue" },
  { day: "WEDNESDAY", label: "Wed" },
  { day: "THURSDAY", label: "Thu" },
  { day: "FRIDAY", label: "Fri" },
  { day: "SATURDAY", label: "Sat" },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const student = user?.student;
  const [notices, setNotices] = useState<Notice[]>([]);
  const [updates, setUpdates] = useState<AcademicUpdate[]>([]);
  const [noticesTotal, setNoticesTotal] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const { entries, todaysSchedule, liveClass, nextClass, loading: scheduleLoading } = useStudentSchedule(student);
  const now = useClock(1000);
  const todayDayIndex = now.getDay();
  const todayName = (["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as DayOfWeek[])[todayDayIndex];
  const weeklyLoad = WEEK_DAYS.map(({ day, label }) => ({
    label,
    value: entries.filter((e) => e.day === day).length,
    highlighted: day === todayName,
  }));
  const classesDoneToday = todaysSchedule.filter((e) => e.status === "done").length;

  useEffect(() => {
    Promise.all([
      noticesService.list({ pageSize: 5 }),
      academicUpdatesService.list({ pageSize: 5, departmentId: student?.departmentId }),
      whatsappService.myRequests(),
    ])
      .then(([n, u, r]) => {
        setNotices(n.data);
        setNoticesTotal(n.meta.total);
        setUpdates(u.data);
        setPendingRequests(r.filter((req) => req.status === "PENDING").length);
      })
      .finally(() => setLoading(false));
  }, [student?.departmentId]);

  const firstName = student?.fullName?.split(" ")[0] ?? "";
  const feed = [
    ...notices.map((n) => ({ kind: "notice" as const, id: n.id, title: n.title, category: n.category, date: n.publishedDate ?? n.createdAt })),
    ...updates.map((u) => ({ kind: "update" as const, id: u.id, title: u.title, category: u.category, date: u.date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      {/* Hero — a boarding-pass shaped card: greeting on top, live class status below the perforation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-8 shadow-lg sm:px-10 sm:py-10"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <PersonAvatar tone="gold" className="h-16 w-16 sm:h-20 sm:w-20" ringed src={user?.avatarUrl} />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-300">{greeting()}</p>
              <h1 className="mt-1 font-serif text-3xl font-extrabold text-white sm:text-4xl">{firstName} 👋</h1>
              <p className="mt-2 text-sm text-white/70">
                {student?.department?.name} &middot; Year {student?.year} &middot; Section {student?.section} &middot; Roll No.{" "}
                {student?.studentId}
              </p>
            </div>
          </div>
          <div className="hidden text-right text-white/80 sm:block">
            <p className="font-mono text-2xl font-bold tabular-nums text-white">{format(now, "hh:mm:ss a")}</p>
            <p className="text-xs text-white/60">{format(now, "EEEE, d MMMM yyyy")}</p>
          </div>
        </div>

        {/* Perforation with punched notches, boarding-pass style */}
        <div className="relative -mx-6 mt-7 border-t border-dashed border-white/25 pt-5 sm:-mx-10">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
          <div className="px-6 sm:px-10">
            {liveClass || nextClass ? (
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-950 ${
                    liveClass ? "bg-emerald-400" : "bg-gold-400"
                  }`}
                >
                  {liveClass ? <Radio className="h-3 w-3 animate-pulse" /> : <Clock className="h-3 w-3" />}
                  {liveClass ? "In Progress" : "Up Next"}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {(liveClass ?? nextClass)?.subject?.name}
                  <span className="font-normal text-white/60">
                    {" "}
                    &middot; {(liveClass ?? nextClass)?.faculty?.fullName} &middot; Room {(liveClass ?? nextClass)?.room?.number}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-white/60">No more classes today — enjoy the rest of your day.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main + sidebar: what to DO on the left, what to KNOW on the right */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Today's schedule strip */}
          <div>
            <SectionHeader
              title="Today's Schedule"
              action={
                <Link to="/student/timetable" className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
                  Full timetable <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            {scheduleLoading ? (
              <SkeletonList rows={1} />
            ) : todaysSchedule.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No classes today" description="Enjoy your day off — check back tomorrow." />
            ) : (
              <ScheduleStrip entries={todaysSchedule} />
            )}
          </div>

          {/* Weekly class load */}
          {!scheduleLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif font-semibold text-brand-950">Weekly Class Load</h3>
                <span className="text-xs text-slate-400">{entries.length} classes this week</span>
              </div>
              <BarChart data={weeklyLoad} />
            </div>
          )}

          {/* Quick actions */}
          <div>
            <SectionHeader title="Quick Actions" />
            {loading ? (
              <SkeletonCardGrid count={4} />
            ) : (
              <StaggerContainer className="grid gap-4 sm:grid-cols-2">
                {QUICK_LINKS.map((link) => (
                  <StaggerItem key={link.to}>
                    <Link
                      to={link.to}
                      className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gold-300 hover:shadow-lg hover:ring-1 hover:ring-gold-200"
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${link.tone}`}>
                        <link.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800">{link.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{link.description}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-brand-600" />
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </div>

        {/* Sidebar: at-a-glance */}
        <div className="space-y-6 lg:col-span-4">
          {!scheduleLoading && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ProgressRing
                value={classesDoneToday}
                max={todaysSchedule.length || 1}
                label={`${classesDoneToday}/${todaysSchedule.length}`}
                sublabel="Done Today"
              />
              <p className="text-center text-xs text-slate-400">Classes completed so far today</p>
            </div>
          )}

          {loading ? (
            <SkeletonStatGrid count={4} />
          ) : (
            <StaggerContainer className="grid grid-cols-2 gap-3">
              <StaggerItem>
                <StatCard label="Active Notices" value={noticesTotal} icon={Megaphone} tone="gold" />
              </StaggerItem>
              <StaggerItem>
                <StatCard label="Updates" value={updates.length} icon={BookOpen} tone="green" />
              </StaggerItem>
              <StaggerItem>
                <StatCard label="WhatsApp Pending" value={pendingRequests} icon={MessageCircle} tone="red" />
              </StaggerItem>
              <StaggerItem>
                <StatCard label="Classes Today" value={todaysSchedule.length} icon={CalendarDays} tone="brand" />
              </StaggerItem>
            </StaggerContainer>
          )}

          <div>
            <SectionHeader title="Campus Feed" />
            {loading ? (
              <SkeletonList rows={4} />
            ) : feed.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <CardBody>
                  <EmptyState icon={Megaphone} title="Nothing new yet" description="Notices and academic updates will appear here." />
                </CardBody>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <StaggerContainer className="divide-y divide-slate-100">
                  {feed.slice(0, 6).map((item) => (
                    <StaggerItem
                      key={`${item.kind}-${item.id}`}
                      className="flex items-start gap-3 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div
                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          item.kind === "notice" ? "bg-brand-50 text-brand-600" : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {item.kind === "notice" ? <Megaphone className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge tone={item.kind === "notice" ? "brand" : "green"}>{titleCase(item.category)}</Badge>
                          <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
