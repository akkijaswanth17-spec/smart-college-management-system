import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarClock, BellRing } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PersonAvatar } from "../../components/ui/Avatar";
import { SkeletonCard, SkeletonList } from "../../components/ui/Skeleton";
import { ScheduleStrip } from "../../components/ScheduleStrip";
import { BarChart } from "../../components/charts/BarChart";
import { ProgressRing } from "../../components/charts/ProgressRing";
import { EnableNotificationsButton } from "../../components/EnableNotificationsButton";
import { useAuth } from "../../context/AuthContext";
import { useFacultyTimetable } from "../../hooks/useFacultyTimetable";
import { useClock } from "../../hooks/useClock";
import { DayOfWeek } from "../../types";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const WEEK_DAYS: { day: DayOfWeek; label: string }[] = [
  { day: "MONDAY", label: "Mon" },
  { day: "TUESDAY", label: "Tue" },
  { day: "WEDNESDAY", label: "Wed" },
  { day: "THURSDAY", label: "Thu" },
  { day: "FRIDAY", label: "Fri" },
  { day: "SATURDAY", label: "Sat" },
];

export default function FacultyDashboard() {
  const { user } = useAuth();
  const { entries, todaysClasses, todaysWithStatus, nextClass, minutesUntilNext, isImminent, loading } = useFacultyTimetable();
  const now = useClock(1000);
  const todayDayIndex = now.getDay();
  const todayName = (["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as DayOfWeek[])[todayDayIndex];
  const weeklyLoad = WEEK_DAYS.map(({ day, label }) => ({
    label,
    value: entries.filter((e) => e.day === day).length,
    highlighted: day === todayName,
  }));
  const classesDoneToday = todaysWithStatus.filter((e) => e.status === "done").length;

  const sectionCounts = new Map<string, number>();
  entries.forEach((e) => {
    const key = `${e.department?.code ?? ""} Y${e.year}-${e.section}`.trim();
    sectionCounts.set(key, (sectionCounts.get(key) ?? 0) + 1);
  });
  const sections = Array.from(sectionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxSectionCount = Math.max(1, ...sections.map(([, c]) => c));

  return (
    <div className="space-y-8">
      {/* Hero — boarding-pass shaped: greeting on top, next-class status below the perforation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: isImminent ? [1, 1.006, 1] : 1,
        }}
        transition={
          isImminent
            ? { scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.4 }, y: { duration: 0.4 } }
            : { duration: 0.45, ease: "easeOut" }
        }
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-8 shadow-lg sm:px-10 sm:py-10 ${
          isImminent ? "ring-2 ring-gold-400/70" : ""
        }`}
      >
        {isImminent && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            animate={{ boxShadow: ["0 0 0 0 rgba(243,168,36,0.35)", "0 0 0 14px rgba(243,168,36,0)"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <PersonAvatar tone="gold" className="h-16 w-16 sm:h-20 sm:w-20" ringed src={user?.avatarUrl} />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-300">{greeting()}</p>
              <h1 className="mt-1 font-serif text-3xl font-extrabold text-white sm:text-4xl">{user?.faculty?.fullName}</h1>
              <p className="mt-2 text-sm text-white/70">
                {user?.faculty?.department?.name} &middot; {user?.faculty?.designation}
              </p>
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
          <div className="px-6 sm:px-10">
            {nextClass ? (
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-950 ${
                    isImminent ? "bg-gold-400" : "bg-white/15 text-white"
                  }`}
                >
                  <CalendarClock className="h-3 w-3" /> Next Class
                </span>
                <p className="min-w-0 flex-1 text-sm font-semibold text-white">
                  {nextClass.subject?.name}
                  <span className="font-normal text-white/60">
                    {" "}
                    &middot; {nextClass.startTime} &middot; Room {nextClass.room?.number}, {nextClass.block?.name}
                  </span>
                  {minutesUntilNext !== null && (
                    <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-bold ${isImminent ? "bg-gold-400 text-brand-900" : "bg-white/15"}`}>
                      in {minutesUntilNext} min
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-white/60">No more classes today — enjoy the rest of your day!</p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-200 bg-gold-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <BellRing className="h-5 w-5 shrink-0 text-gold-600" />
          <p className="text-sm text-brand-900">
            Get a real phone notification 5 minutes before every class — no need to keep this tab open.
          </p>
        </div>
        <EnableNotificationsButton />
      </div>

      {loading ? (
        <div className="space-y-8">
          <SkeletonCard />
          <SkeletonList rows={4} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main: what to teach today */}
          <div className="space-y-6 lg:col-span-8">
            <div>
              <h2 className="mb-3 font-semibold text-slate-800">Today's Timetable</h2>
              {todaysClasses.length === 0 ? (
                <Card>
                  <div className="p-5">
                    <EmptyState icon={CalendarClock} title="No classes scheduled today" />
                  </div>
                </Card>
              ) : (
                <ScheduleStrip entries={todaysWithStatus} />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Weekly Teaching Load</h3>
                <span className="text-xs text-slate-400">{entries.length} classes this week</span>
              </div>
              <BarChart data={weeklyLoad} />
            </div>
          </div>

          {/* Sidebar: at-a-glance */}
          <div className="space-y-6 lg:col-span-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ProgressRing
                value={classesDoneToday}
                max={todaysClasses.length || 1}
                label={`${classesDoneToday}/${todaysClasses.length}`}
                sublabel="Taught Today"
                color="#c4740a"
                trackColor="#f4efe3"
              />
              <p className="text-center text-xs text-slate-400">Classes completed so far today</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-slate-800">Sections Taught</h3>
              {sections.length === 0 ? (
                <p className="text-sm text-slate-400">No sections assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {sections.map(([label, count]) => (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{label}</span>
                        <span className="text-slate-400">{count} classes/wk</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                          style={{ width: `${(count / maxSectionCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
