import { useEffect, useRef, useState } from "react";
import { FileDown, BarChart3 } from "lucide-react";
import { Card, CardHeader, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { Select } from "../ui/FormField";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonTable } from "../ui/Skeleton";
import { attendanceService } from "../../services/attendance.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { Department, AttendanceClassReportRow } from "../../types";
import { CLASS_OPTIONS, SECTION_OPTIONS } from "../../constants/academicClass";

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function AttendanceReportPanel({
  departments,
  lockDepartment,
}: {
  /** Pass [] to hide the department picker entirely (e.g. Faculty, who is always scoped server-side). */
  departments: Department[];
  lockDepartment?: boolean;
}) {
  const [departmentId, setDepartmentId] = useState("");
  const [classKey, setClassKey] = useState(CLASS_OPTIONS[0].key);
  const year = CLASS_OPTIONS.find((o) => o.key === classKey)!.year;
  const [section, setSection] = useState(SECTION_OPTIONS[0]);
  const range = defaultDateRange();
  const [dateFrom, setDateFrom] = useState(range.from);
  const [dateTo, setDateTo] = useState(range.to);

  const [rows, setRows] = useState<AttendanceClassReportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (departments.length >= 1 && !departmentId) setDepartmentId(departments[0].id);
  }, [departments, departmentId]);

  const canLoad = (departments.length === 0 || departmentId) && year && section.trim() && dateFrom && dateTo;

  async function loadReport() {
    if (!canLoad) return;
    setLoading(true);
    setRows(null);
    try {
      const data = await attendanceService.classReport({
        departmentId: departmentId || undefined,
        year,
        section: section.trim().toUpperCase(),
        dateFrom,
        dateTo,
      });
      setRows(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function exportPdf() {
    if (!exportRef.current || !rows) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      const canvas = await html2canvas(exportRef.current, { backgroundColor: "#ffffff", scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const margin = 24;
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const availableWidth = pageWidth - margin * 2;
      const scale = availableWidth / canvas.width;
      pdf.addImage(imgData, "PNG", margin, margin, availableWidth, canvas.height * scale);
      pdf.save(`attendance-report-${section}-${dateFrom}-to-${dateTo}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't export the report as a PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-slate-800">Attendance Report</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Select a class and date range — attendance percentage is calculated from actual period records, never
          hard-coded.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {departments.length > 0 && (
            <Select
              label="Department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={lockDepartment && departments.length === 1}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        <Button onClick={loadReport} disabled={!canLoad} loading={loading}>
          Load Report
        </Button>

        {loading && <SkeletonTable cols={5} />}

        {!loading && rows && rows.length === 0 && (
          <EmptyState icon={BarChart3} title="No students found" description="No students match that class." />
        )}

        {!loading && rows && rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportPdf} loading={exporting}>
                <FileDown className="h-3.5 w-3.5" /> Download PDF
              </Button>
            </div>
            <div ref={exportRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="bg-brand-950 px-5 py-3">
                <p className="font-serif text-sm font-bold text-white">
                  {departments.find((d) => d.id === departmentId)?.name ?? "Attendance Report"}
                </p>
                <p className="text-xs text-gold-300">
                  {CLASS_OPTIONS.find((o) => o.key === classKey)?.label} - {section} &middot; {dateFrom} to {dateTo}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Roll No.</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Name</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold uppercase text-slate-500">Present</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold uppercase text-slate-500">Absent</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold uppercase text-slate-500">Total</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold uppercase text-slate-500">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.studentId}>
                        <td className="px-4 py-2.5 text-slate-500">{r.studentId}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{r.fullName}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">{r.present}</td>
                        <td className="px-4 py-2.5 text-right text-red-600">{r.absent}</td>
                        <td className="px-4 py-2.5 text-right">{r.total}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{r.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
