import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Users,
  GraduationCap,
  CalendarClock,
  Megaphone,
  BookOpen,
  Search,
  MessageCircle,
  UserPlus,
  Pin,
  MessageSquare,
} from "lucide-react";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { PersonAvatar } from "../../components/ui/Avatar";
import { SkeletonStatGrid, SkeletonList } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ScheduleStrip } from "../../components/ScheduleStrip";
import { BarChart } from "../../components/charts/BarChart";
import { ProgressRing } from "../../components/charts/ProgressRing";
import { useAuth } from "../../context/AuthContext";
import { useClock } from "../../hooks/useClock";
import { adminService, DashboardData } from "../../services/admin.service";
import { timetableService } from "../../services/timetable.service";
import { formatDate, titleCase } from "../../utils/format";
import { classifySchedule } from "../../utils/schedule";
import { DayOfWeek, TimetableEntry } from "../../types";

const WEEK_DAYS: { day: DayOfWeek; label: string }[] = [
  { day: "MONDAY", label: "Mon" },
  { day: "TUESDAY", label: "Tue" },
  { day: "WEDNESDAY", label: "Wed" },
  { day: "THURSDAY", label: "Thu" },
  { day: "FRIDAY", label: "Fri" },
  { day: "SATURDAY", label: "Sat" },
];

const ROLE_DOT: Record<string, string> = {
  STUDENT: "bg-brand-500",
  FACULTY: "bg-gold-500",
  ADMIN: "bg-maroon-500",
};

const PRIORITY_PIN: Record<string, string> = {
  GENERAL: "bg-slate-400",
  ACADEMIC: "bg-brand-600",
  EXAMINATION: "bg-red-500",
  EVENTS: "bg-emerald-500",
  HOLIDAY: "bg-gold-500",
  PLACEMENT: "bg-brand-600",
  EMERGENCY: "bg-red-600",
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [allEntries, setAllEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const now = useClock(1000);

  useEffect(() => {
    Promise.all([adminService.getDashboard(), timetableService.list()])
      .then(([d, entries]) => {
        setData(d);
        setAllEntries(entries);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
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
            <PersonAvatar tone="maroon" className="h-16 w-16 sm:h-20 sm:w-20" ringed src={user?.avatarUrl} />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-300">Administration Portal</p>
              <h1 className="mt-1 font-serif text-3xl font-extrabold text-white sm:text-4xl">
                Welcome, {user?.admin?.fullName ?? "Administrator"}
              </h1>
              <p className="mt-2 text-sm text-white/70">College-wide overview and quick statistics.</p>
            </div>
          </div>
          <div className="hidden text-right text-white/80 sm:block">
            <p className="font-mono text-2xl font-bold tabular-nums text-white">{format(now, "hh:mm:ss a")}</p>
            <p className="text-xs text-white/60">{format(now, "EEEE, d MMMM yyyy")}</p>
          </div>
        </div>

        <div className="relative -mx-6 mt-7 border-t border-dashed border-white/25 pt-5 sm:-mx-10">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
          <div className="flex flex-wrap gap-x-8 gap-y-2 px-6 text-sm text-white/80 sm:px-10">
            {data ? (
              <>
                <span>
                  <b className="font-mono text-white">{data.stats.totalStudents}</b> students
                </span>
                <span>
                  <b className="font-mono text-white">{data.stats.totalFaculty}</b> faculty
                </span>
                <span>
                  <b className="font-mono text-white">{data.stats.todaysClasses}</b> classes today
                </span>
                <span>
                  <b className="font-mono text-white">{data.stats.pendingWhatsAppRequests}</b> pending requests
                </span>
              </>
            ) : (
              <span className="text-white/50">Loading college-wide statistics&hellip;</span>
            )}
          </div>
        </div>
      </motion.div>

      {loading || !data ? (
        <div className="space-y-8">
          <SkeletonStatGrid count={7} />
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonList rows={4} />
            <SkeletonList rows={4} />
          </div>
        </div>
      ) : (
        <DashboardContent data={data} allEntries={allEntries} />
      )}
    </div>
  );
}

function DashboardContent({ data, allEntries }: { data: DashboardData; allEntries: TimetableEntry[] }) {
  const { stats, recentUsers, recentNotices, upcomingTimetable, pendingRequests } = data;
  const scheduledToday = classifySchedule(upcomingTimetable as any, new Date());
  const classesDoneToday = scheduledToday.filter((e) => e.status === "done").length;

  const todayDayIndex = new Date().getDay();
  const todayName = (["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as DayOfWeek[])[todayDayIndex];
  const weeklyLoad = WEEK_DAYS.map(({ day, label }) => ({
    label,
    value: allEntries.filter((e) => e.day === day).length,
    highlighted: day === todayName,
  }));
  const maxPeople = Math.max(1, stats.totalStudents, stats.totalFaculty);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Students" value={stats.totalStudents} icon={Users} tone="brand" />
        <StatCard label="Total Faculty" value={stats.totalFaculty} icon={GraduationCap} tone="gold" />
        <StatCard label="Today's Classes" value={stats.todaysClasses} icon={CalendarClock} tone="green" />
        <StatCard label="Active Notices" value={stats.activeNotices} icon={Megaphone} tone="brand" />
        <StatCard label="Academic Updates" value={stats.academicUpdatesCount} icon={BookOpen} tone="green" />
        <StatCard label="Pending Lost & Found" value={stats.pendingLostFound} icon={Search} tone="gold" />
        <StatCard label="Pending WhatsApp Requests" value={stats.pendingWhatsAppRequests} icon={MessageCircle} tone="red" />
      </div>

      {/* Main + sidebar: what to look at on the left, what to glance at on the right */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Upcoming timetable — horizontal schedule strip, matches the timetable's own visual language */}
          <div>
            <h2 className="mb-3 font-semibold text-slate-800">Today's Timetable</h2>
            {upcomingTimetable.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <EmptyState icon={CalendarClock} title="No classes today" />
              </div>
            ) : (
              <ScheduleStrip entries={scheduledToday as any} />
            )}
          </div>

          {/* Recent users — vertical activity timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-800">Recent Signups</h2>
            {recentUsers.length === 0 ? (
              <EmptyState icon={Users} title="No users yet" />
            ) : (
              <ul className="relative space-y-5 pl-6">
                <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-200" />
                {recentUsers.map((u, i) => (
                  <motion.li
                    key={u.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    className="relative flex items-center justify-between gap-3"
                  >
                    <span
                      className={`absolute -left-6 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-white ${
                        ROLE_DOT[u.role] ?? "bg-slate-400"
                      }`}
                    >
                      <UserPlus className="h-2 w-2 text-white" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{u.email}</p>
                      <p className="text-xs text-slate-400">{formatDate(u.createdAt)}</p>
                    </div>
                    <Badge tone="slate">{titleCase(u.role)}</Badge>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>

          {/* Pending WhatsApp requests — chat-bubble style */}
          <div>
            <h2 className="mb-3 font-semibold text-slate-800">Pending WhatsApp Requests</h2>
            {pendingRequests.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <EmptyState icon={MessageCircle} title="No pending requests" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pendingRequests.map((r: any, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: i * 0.06 }}
                    className="relative rounded-2xl rounded-tl-sm border border-green-100 bg-green-50 p-4"
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{r.student?.fullName}</p>
                        <p className="truncate text-xs text-slate-500">wants to join {r.group?.name}</p>
                      </div>
                      <Badge tone="amber">Pending</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: at-a-glance insights, all from real college-wide data */}
        <div className="space-y-6 lg:col-span-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <ProgressRing
              value={classesDoneToday}
              max={scheduledToday.length || 1}
              label={`${classesDoneToday}/${scheduledToday.length}`}
              sublabel="Done Today"
              color="#942a21"
              trackColor="#f4efe3"
            />
            <p className="text-center text-xs text-slate-400">College-wide classes completed today</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Weekly Class Load</h3>
              <span className="text-xs text-slate-400">{allEntries.length} total</span>
            </div>
            <BarChart data={weeklyLoad} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-800">Students vs Faculty</h3>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Students</span>
                  <span className="text-slate-400">{stats.totalStudents}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-brand-700 to-brand-400"
                    style={{ width: `${(stats.totalStudents / maxPeople) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Faculty</span>
                  <span className="text-slate-400">{stats.totalFaculty}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-gold-600 to-gold-400"
                    style={{ width: `${(stats.totalFaculty / maxPeople) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recent notices — mini pinned notes, echoing the Notice Board */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-800">Recent Notices</h2>
            {recentNotices.length === 0 ? (
              <EmptyState icon={Megaphone} title="No notices yet" />
            ) : (
              <div className="space-y-3">
                {recentNotices.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    className="relative rounded-lg border border-slate-100 bg-slate-50 p-3 pt-4"
                  >
                    <div
                      className={`absolute -top-1.5 left-3 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-white ${
                        PRIORITY_PIN[n.category] ?? "bg-slate-400"
                      }`}
                    >
                      <Pin className="h-2 w-2 rotate-45 text-white" />
                    </div>
                    <p className="truncate text-sm font-medium text-slate-800">{n.title}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <Badge tone="brand">{titleCase(n.category)}</Badge>
                      <span className="text-[11px] text-slate-400">{formatDate(n.createdAt)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
