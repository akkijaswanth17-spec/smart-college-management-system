import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { ReportSearch } from "./ReportSearch";
import { ReportActions } from "./ReportActions";
import { ReportPreview } from "./ReportPreview";
import { reportsService } from "../../services/reports.service";
import { generateStudentDetailsPdf } from "../../utils/reportPdf";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getDisplayName } from "../../utils/displayName";
import { getErrorMessage } from "../../services/api";
import { StudentDetailsReportData } from "../../types";

function FieldGrid({ data }: { data: StudentDetailsReportData }) {
  const rows: [string, string][] = [
    ["Student ID", data.studentId],
    ["Student Name", data.fullName],
    ["Department", `${data.department} (${data.departmentCode})`],
    ["Year", `Year ${data.year}${data.semester ? ` · Semester ${data.semester}` : ""}`],
    ["Section", data.section],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Account Status", data.accountActive ? "Active" : "Inactive"],
  ];
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 border-b border-dashed border-slate-100 pb-1.5 sm:border-none sm:pb-0">
          <dt className="text-slate-500">{label}</dt>
          <dd className="text-right font-semibold text-brand-950">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StudentDetailsReport() {
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<StudentDetailsReportData | null>(null);
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
      const result = await reportsService.studentDetails(studentId);
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
      await generateStudentDetailsPdf(data, generatedBy);
      toast.success("Report generated successfully.");
    } catch {
      toast.error("Unable to generate the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5">
      <ReportSearch label="Student ID" placeholder="e.g. 24351-CM-001" onSearch={handleSearch} loading={searching} />

      {searching && <p className="text-sm text-slate-400">Searching for student...</p>}
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
          <FieldGrid data={data} />
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
          reportTitle="Student Details Report"
          generatedBy={generatedBy}
          onDownload={handleDownload}
          downloading={downloading}
          autoPrint={autoPrint}
        >
          <FieldGrid data={data} />
        </ReportPreview>
      )}
    </div>
  );
}
