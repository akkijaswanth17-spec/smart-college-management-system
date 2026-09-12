import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { ReportSearch } from "./ReportSearch";
import { ReportActions } from "./ReportActions";
import { ReportPreview } from "./ReportPreview";
import { reportsService } from "../../services/reports.service";
import { generateFacultyDetailsPdf } from "../../utils/reportPdf";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getDisplayName } from "../../utils/displayName";
import { getErrorMessage } from "../../services/api";
import { FacultyDetailsReportData } from "../../types";

function FacultyBody({ data }: { data: FacultyDetailsReportData }) {
  const name = data.title ? `${data.title} ${data.fullName}` : data.fullName;
  const rows: [string, string][] = [
    ["Faculty ID", data.facultyId],
    ["Faculty Name", name],
    ["Department", `${data.department} (${data.departmentCode})`],
    ["Designation", data.designation],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Status", data.status === "ACTIVE" ? "Active" : "Inactive"],
    ["Added to System", new Date(data.addedToSystemAt).toLocaleDateString("en-IN", { dateStyle: "medium" })],
  ];

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-dashed border-slate-100 pb-1.5 sm:border-none sm:pb-0">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-semibold text-brand-950">{value}</dd>
          </div>
        ))}
      </dl>

      {(data.assignedSubjects.length > 0 || data.assignedSections.length > 0) && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm">
          {[
            ["Assigned Subjects", data.assignedSubjects.join(", ") || "—"],
            ["Assigned Sections", data.assignedSections.join(", ") || "—"],
            ["Assigned Rooms", data.assignedRooms.join(", ") || "—"],
            ["Assigned Blocks", data.assignedBlocks.join(", ") || "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-b border-dashed border-slate-100 pb-1.5">
              <dt className="shrink-0 text-slate-500">{label}</dt>
              <dd className="text-right font-semibold text-brand-950">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {data.timetable.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Block</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.timetable.map((t, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-medium text-brand-950">{t.day}</td>
                  <td className="px-3 py-2">
                    {t.startTime} – {t.endTime}
                  </td>
                  <td className="px-3 py-2">{t.subject}</td>
                  <td className="px-3 py-2">
                    Year {t.year} - {t.section}
                  </td>
                  <td className="px-3 py-2">{t.room}</td>
                  <td className="px-3 py-2">{t.block}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function FacultyDetailsReport() {
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<FacultyDetailsReportData | null>(null);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const generatedBy = getDisplayName(user);

  async function handleSearch(facultyId: string) {
    setSearching(true);
    setError("");
    setData(null);
    try {
      const result = await reportsService.facultyDetails(facultyId);
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
      await generateFacultyDetailsPdf(data, generatedBy);
      toast.success("Report generated successfully.");
    } catch {
      toast.error("Unable to generate the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5">
      <ReportSearch label="Faculty ID" placeholder="e.g. 12345" onSearch={handleSearch} loading={searching} />

      {searching && <p className="text-sm text-slate-400">Searching for faculty...</p>}
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
          <FacultyBody data={data} />
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
          reportTitle="Faculty Details Report"
          generatedBy={generatedBy}
          onDownload={handleDownload}
          downloading={downloading}
          autoPrint={autoPrint}
        >
          <FacultyBody data={data} />
        </ReportPreview>
      )}
    </div>
  );
}
