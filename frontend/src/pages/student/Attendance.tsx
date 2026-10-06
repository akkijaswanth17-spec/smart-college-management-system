import { useEffect, useState, FormEvent } from "react";
import { CalendarX2, Send, ClipboardList, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/FormField";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList, SkeletonCard } from "../../components/ui/Skeleton";
import { ProgressRing } from "../../components/charts/ProgressRing";
import { attendanceService } from "../../services/attendance.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { formatDate } from "../../utils/format";
import { MyAttendanceResponse, AttendanceAbsence, LeaveRequest, LeaveStatus } from "../../types";

type Tab = "attendance" | "absences" | "leave";

const STATUS_TONE: Record<LeaveStatus, "amber" | "green" | "red"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

export default function StudentAttendance() {
  const [tab, setTab] = useState<Tab>("attendance");
  const [summary, setSummary] = useState<MyAttendanceResponse | null>(null);
  const [absences, setAbsences] = useState<AttendanceAbsence[] | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [leaveDate, setLeaveDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function loadAll() {
    setLoading(true);
    try {
      const [s, a, l] = await Promise.all([
        attendanceService.myAttendance(),
        attendanceService.myAbsences(),
        attendanceService.myLeaveRequests(),
      ]);
      setSummary(s);
      setAbsences(a);
      setLeaveRequests(l);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmitLeave(e: FormEvent) {
    e.preventDefault();
    if (!leaveDate || !reason.trim()) return;
    setSubmitting(true);
    try {
      await attendanceService.submitLeave({ leaveDate, reason: reason.trim() });
      toast.success("Leave request submitted");
      setLeaveDate("");
      setReason("");
      const l = await attendanceService.myLeaveRequests();
      setLeaveRequests(l);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Attendance</h1>
        <p className="text-sm text-slate-500">Your period-wise attendance, absences and leave requests.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: "attendance" as Tab, label: "Attendance", icon: ClipboardList },
          { key: "absences" as Tab, label: "Absent Periods", icon: CalendarX2 },
          { key: "leave" as Tab, label: "Leave Request", icon: Send },
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

      {tab === "attendance" &&
        (loading ? (
          <SkeletonCard />
        ) : !summary ? null : (
          <div className="space-y-5">
            <Card>
              <CardBody className="flex flex-wrap items-center gap-8">
                <ProgressRing
                  value={summary.percentage}
                  max={100}
                  label={`${summary.percentage}%`}
                  sublabel="Overall"
                  color={summary.lowAttendance ? "#dc2626" : "#123b70"}
                />
                <div className="space-y-1 text-sm">
                  <p>
                    Present: <span className="font-bold text-emerald-600">{summary.present}</span>
                  </p>
                  <p>
                    Absent: <span className="font-bold text-red-600">{summary.absent}</span>
                  </p>
                  <p>
                    Total Classes: <span className="font-bold">{summary.total}</span>
                  </p>
                  {summary.lowAttendance && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Your attendance is below the required {summary.threshold}%.
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-slate-800">Subject-wise Attendance</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                {summary.subjects.length === 0 ? (
                  <EmptyState icon={ClipboardList} title="No attendance recorded yet" description="Check back once your faculty start taking attendance." />
                ) : (
                  summary.subjects.map((s) => (
                    <div key={s.subjectCode}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{s.subjectName}</span>
                        <span className="font-bold text-slate-800">{s.percentage}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${s.percentage < summary.threshold ? "bg-red-500" : "bg-brand-600"}`}
                          style={{ width: `${s.percentage}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {s.present} present / {s.absent} absent / {s.total} total
                      </p>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </div>
        ))}

      {tab === "absences" && (
        <Card>
          <CardBody>
            {loading ? (
              <SkeletonList rows={4} />
            ) : !absences || absences.length === 0 ? (
              <EmptyState icon={CalendarX2} title="No absences" description="You have not been marked absent for any period." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Time</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Subject</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Faculty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absences.map((a, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-slate-700">{formatDate(a.date)}</td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {a.startTime} – {a.endTime}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {a.subjectName} ({a.subjectCode})
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{a.facultyName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "leave" && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-800">Submit Leave Request</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmitLeave} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Leave Date</label>
                  <input
                    type="date"
                    required
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <Textarea
                  label="Reason / Situation"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. I am unwell and unable to attend classes."
                />
                <Button type="submit" loading={submitting}>
                  <Send className="h-4 w-4" /> Submit Leave Request
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-800">My Leave Requests</h2>
            </CardHeader>
            <CardBody>
              {loading ? (
                <SkeletonList rows={3} />
              ) : !leaveRequests || leaveRequests.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No leave requests yet" description="Your submitted leave requests will appear here." />
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Reason</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Status</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaveRequests.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2.5 text-slate-700">{formatDate(r.leaveDate)}</td>
                          <td className="max-w-xs truncate px-4 py-2.5 text-slate-600" title={r.reason}>
                            {r.reason}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{r.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
