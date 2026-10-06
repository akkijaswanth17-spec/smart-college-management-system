import { useEffect, useState } from "react";
import { Check, X, Users } from "lucide-react";
import { Card, CardHeader, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { SkeletonList } from "../ui/Skeleton";
import { attendanceService } from "../../services/attendance.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { AttendanceRosterResponse, AttendanceStatus } from "../../types";

export function AttendanceRoster({
  timetableEntryId,
  date,
  onSaved,
  onClose,
}: {
  timetableEntryId: string;
  date: string;
  onSaved?: () => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<AttendanceRosterResponse | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    attendanceService
      .roster(timetableEntryId, date)
      .then((res) => {
        setData(res);
        setStatuses(Object.fromEntries(res.students.map((s) => [s.studentId, s.status])));
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableEntryId, date]);

  function toggle(studentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }));
      const result = await attendanceService.save({ timetableEntryId, date, records });
      toast.success(`Attendance saved — ${result.present} present, ${result.absent} absent`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const presentCount = Object.values(statuses).filter((s) => s === "PRESENT").length;
  const totalCount = Object.values(statuses).length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {data ? (
            <>
              <h2 className="font-semibold text-slate-800">
                {data.period.subject.name} &middot; {data.period.department.code} {data.period.year}
                {typeof data.period.year === "number" ? "" : ""} - {data.period.section}
              </h2>
              <p className="text-xs text-slate-500">
                {data.period.startTime} – {data.period.endTime} &middot;{" "}
                {data.period.faculty.title ? `${data.period.faculty.title} ` : ""}
                {data.period.faculty.fullName} &middot; {date}
              </p>
            </>
          ) : (
            <h2 className="font-semibold text-slate-800">Loading period...</h2>
          )}
        </div>
        {data?.alreadyTaken && <Badge tone="amber">Already taken — editing will update it</Badge>}
      </CardHeader>
      <CardBody className="space-y-4">
        {loading ? (
          <SkeletonList rows={5} />
        ) : !data || data.students.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No students found for this class.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="h-4 w-4" />
              Present: <span className="font-bold text-emerald-600">{presentCount}</span> &middot; Absent:{" "}
              <span className="font-bold text-red-600">{totalCount - presentCount}</span> &middot; Total:{" "}
              <span className="font-bold">{totalCount}</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Roll No.
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Name
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.students.map((s) => (
                    <tr key={s.studentId}>
                      <td className="px-4 py-2.5 text-slate-500">{s.rollNumber}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{s.fullName}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggle(s.studentId, "PRESENT")}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              statuses[s.studentId] === "PRESENT"
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-500 hover:bg-emerald-50"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" /> Present
                          </button>
                          <button
                            onClick={() => toggle(s.studentId, "ABSENT")}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              statuses[s.studentId] === "ABSENT"
                                ? "bg-red-600 text-white"
                                : "bg-slate-100 text-slate-500 hover:bg-red-50"
                            }`}
                          >
                            <X className="h-3.5 w-3.5" /> Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Save Attendance
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
