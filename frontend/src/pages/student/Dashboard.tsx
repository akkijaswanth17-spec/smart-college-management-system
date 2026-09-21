import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  Star,
  CheckCircle2,
} from "lucide-react";
import { CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { StatCard } from "../../components/ui/StatCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { DashboardHero, HeroStatusBadge } from "../../components/dashboard/DashboardHero";
import { SkeletonList, SkeletonStatGrid, SkeletonCardGrid } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { ScheduleStrip } from "../../components/ScheduleStrip";
import { BarChart } from "../../components/charts/BarChart";
import { ProgressRing } from "../../components/charts/ProgressRing";
import { useAuth } from "../../context/AuthContext";
import { useStudentSchedule } from "../../hooks/useStudentSchedule";
import { useClock } from "../../hooks/useClock";
import { DayOfWeek } from "../../types";
import { noticesService } from "../../services/notices.service";
import { academicUpdatesService } from "../../services/academicUpdates.service";
import { whatsappService } from "../../services/whatsapp.service";
import { feedbackService } from "../../services/feedback.service";
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
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [feedbackTargetCount, setFeedbackTargetCount] = useState(0);
  const [feedbackPendingCount, setFeedbackPendingCount] = useState(0);
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
      feedbackService.myTargets(),
      feedbackService.getEnabled(),
    ])
      .then(([n, u, r, f, enabled]) => {
        setNotices(n.data);
        setNoticesTotal(n.meta.total);
        setUpdates(u.data);
        setPendingRequests(r.filter((req) => req.status === "PENDING").length);
        setFeedbackTargetCount(f.targets.length);
        setFeedbackPendingCount(f.pendingCount);
        setFeedbackEnabled(enabled);
      })
      .finally(() => setLoading(false));
  }, [student?.departmentId]);

  const feed = [
    ...notices.map((n) => ({ kind: "notice" as const, id: n.id, title: n.title, category: n.category, date: n.publishedDate ?? n.createdAt })),
    ...updates.map((u) => ({ kind: "update" as const, id: u.id, title: u.title, category: u.category, date: u.date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <DashboardHero
        eyebrow={greeting()}
        title={student?.fullName ?? ""}
        subtitle={
          <>
            {student?.department?.name} &middot; Year {student?.year} &middot; Section {student?.section} &middot; Roll No.{" "}
            {student?.studentId}
          </>
        }
        avatarTone="gold"
        avatarSrc={user?.avatarUrl}
        now={now}
        statusContent={
          liveClass || nextClass ? (
            <div className="flex flex-wrap items-center gap-3">
              <HeroStatusBadge tone={liveClass ? "positive" : "accent"}>
                {liveClass ? <Radio className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {liveClass ? "In Progress" : "Up Next"}
              </HeroStatusBadge>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                {(liveClass ?? nextClass)?.subject?.name}
                <span className="text-slate-400">
                  {" "}
                  &middot; {(liveClass ?? nextClass)?.faculty?.fullName} &middot; Room {(liveClass ?? nextClass)?.room?.number}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No more classes today.</p>
          )
        }
      />

      {/* Main + sidebar: what to DO on the left, what to KNOW on the right */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Faculty Feedback prompt */}
          {!loading && feedbackEnabled && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-200 bg-gold-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gold-600 shadow-sm">
                  <Star className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-serif font-semibold text-brand-950">Faculty Feedback</p>
                  <p className="text-xs text-slate-500">Give feedback for your faculty members based on your timetable.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {feedbackPendingCount > 0 && (
                  <span className="text-xs font-semibold text-brand-700">
                    {feedbackPendingCount} Feedback{feedbackPendingCount === 1 ? "" : "s"} Pending
                  </span>
                )}
                <Link to="/student/feedback">
                  {feedbackPendingCount === 0 && feedbackTargetCount > 0 ? (
                    <Button size="sm" variant="outline">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    </Button>
                  ) : (
                    <Button size="sm">Give Feedback</Button>
                  )}
                </Link>
              </div>
            </div>
          )}

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
