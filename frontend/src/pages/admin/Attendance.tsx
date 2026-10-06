import { useEffect, useState } from "react";
import { CalendarCheck, BarChart3, ClipboardList, Clock } from "lucide-react";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/FormField";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { AttendanceRoster } from "../../components/attendance/AttendanceRoster";
import { AttendanceReportPanel } from "../../components/attendance/AttendanceReportPanel";
import { LeaveRequestsPanel } from "../../components/attendance/LeaveRequestsPanel";
import { attendanceService } from "../../services/attendance.service";
import { useDepartmentOptions } from "../../hooks/useDepartmentOptions";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { ClassTodayPeriodsResponse } from "../../types";
import { CLASS_OPTIONS, SECTION_OPTIONS } from "../../constants/academicClass";

type Tab = "today" | "report" | "leave";

export default function AdminAttendance() {
  const departments = useDepartmentOptions();
  const [tab, setTab] = useState<Tab>("today");
  const [departmentId, setDepartmentId] = useState("");
  const [classKey, setClassKey] = useState(CLASS_OPTIONS[0].key);
  const year = CLASS_OPTIONS.find((o) => o.key === classKey)!.year;
  const [section, setSection] = useState(SECTION_OPTIONS[0]);

  const [data, setData] = useState<ClassTodayPeriodsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (departments.length >= 1 && !departmentId) setDepartmentId(departments[0].id);
  }, [departments, departmentId]);

  const canLoad = departmentId && year && section.trim();

  async function load() {
    if (!canLoad) return;
    setLoading(true);
    setData(null);
    try {
      const res = await attendanceService.classTodayPeriods({ departmentId, year, section: section.trim().toUpperCase() });
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500">Take attendance for any class period, or review department attendance reports and leave requests.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: "today" as Tab, label: "Take Attendance", icon: CalendarCheck },
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
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
                <Select label="Year" value={classKey} onChange={(e) => setClassKey(e.target.value)}>
                  {CLASS_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Select label="Section" value={section} onChange={(e) => setSection(e.target.value)}>
                  {SECTION_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <div className="flex items-end">
                  <Button onClick={load} disabled={!canLoad} loading={loading} className="w-full">
                    Load Students
                  </Button>
                </div>
              </div>

              {loading ? (
                <SkeletonList rows={4} />
              ) : data && data.periods.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No periods today"
                  description="This class has no timetable periods scheduled for today."
                />
              ) : (
                data?.periods.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone="slate">Period {p.period}</Badge>
                        {p.alreadyTaken && <Badge tone="green">Taken</Badge>}
                      </div>
                      <p className="mt-1.5 font-semibold text-slate-800">{p.subject.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" /> {p.startTime} – {p.endTime} &middot;{" "}
                        {p.faculty?.title ? `${p.faculty.title} ` : ""}
                        {p.faculty?.fullName}
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

      {tab === "report" && <AttendanceReportPanel departments={departments} lockDepartment />}
      {tab === "leave" && <LeaveRequestsPanel departments={departments} />}
    </div>
  );
}
