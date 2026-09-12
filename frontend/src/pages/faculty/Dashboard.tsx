import { CalendarClock, BellRing } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { DashboardHero, HeroStatusBadge } from "../../components/dashboard/DashboardHero";
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
      <DashboardHero
        eyebrow={greeting()}
        title={user?.faculty?.fullName ?? ""}
        subtitle={
          <>
            {user?.faculty?.department?.name} &middot; {user?.faculty?.designation}
          </>
        }
        avatarTone="gold"
        avatarSrc={user?.avatarUrl}
        now={now}
        statusContent={
          nextClass ? (
            <div className="flex flex-wrap items-center gap-3">
              <HeroStatusBadge tone={isImminent ? "accent" : "neutral"}>
                <CalendarClock className="h-3 w-3" /> Next Class
              </HeroStatusBadge>
              <p className="min-w-0 flex-1 text-sm font-medium text-slate-700">
                {nextClass.subject?.name}
                <span className="text-slate-400">
                  {" "}
                  &middot; {nextClass.startTime} &middot; Room {nextClass.room?.number}, {nextClass.block?.name}
                </span>
                {minutesUntilNext !== null && (
                  <span className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                    in {minutesUntilNext} min
                  </span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No more classes today.</p>
          )
        }
      />

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
