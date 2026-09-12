import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { ReportSearch } from "./ReportSearch";
import { ReportActions } from "./ReportActions";
import { ReportPreview } from "./ReportPreview";
import { reportsService } from "../../services/reports.service";
import { generateStudentMarksPdf } from "../../utils/reportPdf";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getDisplayName } from "../../utils/displayName";
import { getErrorMessage } from "../../services/api";
import { shortAcademicYear } from "../../utils/format";
import { StudentMarksReportData } from "../../types";

function MarksBody({ data }: { data: StudentMarksReportData }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {(
          [
            ["Student Name", data.fullName],
            ["Roll Number", data.studentId],
            ["Department", `${data.department} (${data.departmentCode})`],
            ["Year", `Year ${data.year}${data.semester ? ` · Semester ${data.semester}` : ""}`],
            ["Section", data.section],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-dashed border-slate-100 pb-1.5 sm:border-none sm:pb-0">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-semibold text-brand-950">{value}</dd>
          </div>
        ))}
      </dl>

      {data.subjects.length === 0 ? (
        <p className="text-sm text-slate-400">No marks are available for this student.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Mid 1</th>
                <th className="px-3 py-2">Mid 2</th>
                <th className="px-3 py-2">Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.subjects.map((s) => (
                <tr key={s.code}>
                  <td className="px-3 py-2 font-medium text-brand-950">{s.subject}</td>
                  <td className="px-3 py-2">{s.mid1 ?? "—"}</td>
                  <td className="px-3 py-2">{s.mid2 ?? "—"}</td>
                  <td className="px-3 py-2">{s.semester ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function StudentMarksReport() {
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<StudentMarksReportData | null>(null);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const generatedBy = getDisplayName(user);

  async function handleSearch(studentId: string) {
    setSearching(true);
    setError("");
    setData(null);
    try {
      const result = await reportsService.studentMarks(studentId);
      setData(result);
      toast.success("Record found");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  async function handleDownload() {
    if (!data) return;
    setDownloading(true);
    try {
      await generateStudentMarksPdf(data, generatedBy);
      toast.success("Report generated successfully.");
    } catch {
      toast.error("Unable to generate the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5">
      <ReportSearch label="Student Roll Number" placeholder="e.g. 24351-CM-001" onSearch={handleSearch} loading={searching} />

      {searching && <p className="text-sm text-slate-400">Searching for marks...</p>}
      {!searching && error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {!searching && data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Record found
          </p>
          <MarksBody data={data} />
          <ReportActions
            onPreview={() => {
              setAutoPrint(false);
              setPreviewOpen(true);
            }}
            onDownload={handleDownload}
            onPrint={() => {
              setAutoPrint(true);
              setPreviewOpen(true);
            }}
            downloading={downloading}
          />
        </motion.div>
      )}

      {data && (
        <ReportPreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          reportTitle="Student Marks Report"
          titleBadge={data.subjects[0] ? shortAcademicYear(data.subjects[0].academicYear) : undefined}
          generatedBy={generatedBy}
          onDownload={handleDownload}
          downloading={downloading}
          autoPrint={autoPrint}
        >
          <MarksBody data={data} />
        </ReportPreview>
      )}
    </div>
  );
}
