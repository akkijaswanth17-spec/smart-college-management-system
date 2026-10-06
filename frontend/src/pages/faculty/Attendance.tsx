import { useEffect, useState } from "react";
import { CalendarCheck, BarChart3, ClipboardList, Clock } from "lucide-react";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { AttendanceRoster } from "../../components/attendance/AttendanceRoster";
import { AttendanceReportPanel } from "../../components/attendance/AttendanceReportPanel";
import { LeaveRequestsPanel } from "../../components/attendance/LeaveRequestsPanel";
import { attendanceService } from "../../services/attendance.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { MyTodayPeriodsResponse } from "../../types";

type Tab = "today" | "report" | "leave";

export default function FacultyAttendance() {
  const [tab, setTab] = useState<Tab>("today");
  const [data, setData] = useState<MyTodayPeriodsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      setData(await attendanceService.myTodayPeriods());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500">Take period-wise attendance for your classes, straight from your timetable.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: "today" as Tab, label: "Today's Classes", icon: CalendarCheck },
          { key: "report" as Tab, label: "Attendance Report", icon: BarChart3 },
          { key: "leave" as Tab, label: "Leave Requests", icon: ClipboardList },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "today" &&
        (activePeriodId ? (
          <AttendanceRoster
            timetableEntryId={activePeriodId}
            date={data!.date}
            onSaved={load}
            onClose={() => setActivePeriodId(null)}
          />
        ) : (
          <Card>
            <CardBody className="space-y-3">
              {loading ? (
                <SkeletonList rows={4} />
              ) : !data || data.periods.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No classes today"
                  description="You have no timetable periods scheduled for today."
                />
              ) : (
                data.periods.map((p) => (
                  <div
                    key={p.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                      p.id === data.currentPeriodId ? "border-brand-300 bg-brand-50" : "border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={p.id === data.currentPeriodId ? "brand" : "slate"}>Period {p.period}</Badge>
                        {p.id === data.currentPeriodId && <Badge tone="gold">Current</Badge>}
                        {p.alreadyTaken && <Badge tone="green">Taken</Badge>}
                      </div>
                      <p className="mt-1.5 font-semibold text-slate-800">{p.subject.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" /> {p.startTime} – {p.endTime} &middot; {p.section}
                      </p>
                    </div>
                    <Button
                      variant={p.alreadyTaken ? "outline" : "primary"}
                      size="sm"
                      onClick={() => setActivePeriodId(p.id)}
                    >
                      {p.alreadyTaken ? "Update Attendance" : "Take Attendance"}
                    </Button>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        ))}

      {tab === "report" && <AttendanceReportPanel departments={[]} />}
      {tab === "leave" && <LeaveRequestsPanel departments={[]} />}
    </div>
  );
}
