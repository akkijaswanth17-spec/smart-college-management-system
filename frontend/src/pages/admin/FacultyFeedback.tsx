import { useEffect, useState } from "react";
import { MessageSquareText, FileDown, Download, Send, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { FeedbackDetailReport } from "../../components/feedback/FeedbackDetailReport";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { getDisplayName } from "../../utils/displayName";
import { feedbackService } from "../../services/feedback.service";
import { generateFeedbackClassReportPdf, generateFacultyFeedbackReportPdf } from "../../utils/reportPdf";
import { useDepartmentOptions } from "../../hooks/useDepartmentOptions";
import { CLASS_OPTIONS, SECTION_OPTIONS, ACADEMIC_YEAR_OPTIONS } from "../../constants/academicClass";
import { FeedbackClassReportRow, FeedbackFacultyListRow, FeedbackFacultyDetail, FeedbackPublishStatus } from "../../types";

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

type Tab = "class" | "faculty";

export function FacultyFeedback() {
  const departments = useDepartmentOptions();
  const [departmentId, setDepartmentId] = useState("");
  const [classKey, setClassKey] = useState(CLASS_OPTIONS[0].key);
  const [section, setSection] = useState(SECTION_OPTIONS[0]);
  const [academicYear, setAcademicYear] = useState(
    ACADEMIC_YEAR_OPTIONS.includes(currentAcademicYear) ? currentAcademicYear : ACADEMIC_YEAR_OPTIONS[ACADEMIC_YEAR_OPTIONS.length - 1]
  );
  const [tab, setTab] = useState<Tab>("class");
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (departments.length === 1 && !departmentId) setDepartmentId(departments[0].id);
  }, [departments, departmentId]);

  const year = CLASS_OPTIONS.find((o) => o.key === classKey)!.year;
  const canLoad = !!departmentId && !!section.trim();
  const params = { departmentId, year, section, academicYear };
  const department = departments.find((d) => d.id === departmentId);

  // Tab 1 — Overall Class Report
  const [classReport, setClassReport] = useState<FeedbackClassReportRow[] | null>(null);
  const [loadingClassReport, setLoadingClassReport] = useState(false);
  const [downloadingClass, setDownloadingClass] = useState(false);

  async function loadClassReport() {
    if (!canLoad) return;
    setLoadingClassReport(true);
    setClassReport(null);
    try {
      setClassReport(await feedbackService.classReport(params));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingClassReport(false);
    }
  }

  async function downloadClassReport() {
    if (!classReport || !department) return;
    setDownloadingClass(true);
    try {
      await generateFeedbackClassReportPdf(
        { department: department.name, departmentCode: department.code, year, section, academicYear, rows: classReport },
        getDisplayName(user)
      );
    } catch {
      toast.error("Unable to generate the report. Please try again.");
    } finally {
      setDownloadingClass(false);
    }
  }

  // Tab 2 — Faculty-wise Feedback Analysis
  const [facultyList, setFacultyList] = useState<FeedbackFacultyListRow[] | null>(null);
  const [loadingFacultyList, setLoadingFacultyList] = useState(false);
  const [publishStatus, setPublishStatus] = useState<FeedbackPublishStatus | null>(null);
  const [detail, setDetail] = useState<FeedbackFacultyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [downloadingDetail, setDownloadingDetail] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function loadFacultyList() {
    if (!canLoad) return;
    setLoadingFacultyList(true);
    setFacultyList(null);
    try {
      const [list, status] = await Promise.all([feedbackService.facultyList(params), feedbackService.publishStatus(params)]);
      setFacultyList(list);
      setPublishStatus(status);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingFacultyList(false);
    }
  }

  async function openDetail(row: FeedbackFacultyListRow) {
    setLoadingDetail(`${row.facultyId}:${row.subjectId}`);
    try {
      const d = await feedbackService.facultyDetail({ ...params, facultyId: row.facultyId, subjectId: row.subjectId });
      setDetail(d);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingDetail(null);
    }
  }

  async function downloadDetail() {
    if (!detail) return;
    setDownloadingDetail(true);
    try {
      await generateFacultyFeedbackReportPdf(detail, getDisplayName(user));
    } catch {
      toast.error("Unable to generate the report. Please try again.");
    } finally {
      setDownloadingDetail(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const message = await feedbackService.publish(params);
      toast.success(message);
      setConfirmPublishOpen(false);
      setPublishStatus({ published: true, publishedAt: new Date().toISOString() });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  const filterRow = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
        <option value="">Select</option>
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
      <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
        {ACADEMIC_YEAR_OPTIONS.map((ay) => (
          <option key={ay} value={ay}>
            {ay}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-slate-800">Faculty Feedback</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Review submitted student feedback for a class, drill into a specific faculty/subject, and publish results once
          they're ready for faculty to see.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setTab("class")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === "class" ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Overall Class Report
          </button>
          <button
            onClick={() => setTab("faculty")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === "faculty" ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Faculty-wise Feedback Analysis
          </button>
        </div>

        {filterRow}

        {tab === "class" ? (
          <div className="space-y-4">
            <Button onClick={loadClassReport} disabled={!canLoad} loading={loadingClassReport}>
              Load Report
            </Button>

            {loadingClassReport && <SkeletonTable cols={3} />}

            {!loadingClassReport && classReport && classReport.length === 0 && (
              <EmptyState
                icon={MessageSquareText}
                title="No faculty/subjects found"
                description="No timetable entries match that department, year and section."
              />
            )}

            {!loadingClassReport && classReport && classReport.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={downloadClassReport} loading={downloadingClass}>
                    <FileDown className="h-3.5 w-3.5" /> Download Report
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Faculty Name</th>
                        <th className="px-4 py-3 text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classReport.map((r, i) => (
                        <tr key={`${r.facultyId}-${r.subjectId}`} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-slate-800">{r.subjectName}</p>
                            <p className="text-xs text-slate-400">{r.subjectCode}</p>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">{r.facultyName}</td>
                          <td className="px-4 py-2.5 text-right font-serif font-bold text-brand-950">
                            {r.percentage === null ? <span className="font-sans text-slate-300">No feedback yet</span> : `${r.percentage.toFixed(2)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Button onClick={loadFacultyList} disabled={!canLoad} loading={loadingFacultyList}>
              Load Faculty
            </Button>

            {loadingFacultyList && <SkeletonTable cols={3} />}

            {!loadingFacultyList && facultyList && facultyList.length === 0 && (
              <EmptyState
                icon={MessageSquareText}
                title="No faculty/subjects found"
                description="No timetable entries match that department, year and section."
              />
            )}

            {!loadingFacultyList && facultyList && facultyList.length > 0 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {facultyList.map((r) => {
                    const key = `${r.facultyId}:${r.subjectId}`;
                    return (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{r.facultyName}</p>
                          <p className="truncate text-xs text-slate-400">{r.subjectName}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openDetail(r)} loading={loadingDetail === key}>
                          <Download className="h-3.5 w-3.5" /> Download
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-200 bg-gold-50 px-5 py-4">
                  <div>
                    <p className="font-serif font-semibold text-brand-950">Publish results to Faculty</p>
                    <p className="text-xs text-slate-500">
                      {publishStatus?.published
                        ? `Published on ${new Date(publishStatus.publishedAt!).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
                        : "Feedback stays hidden from faculty until you publish it."}
                    </p>
                  </div>
                  <Button onClick={() => setConfirmPublishOpen(true)} size="lg">
                    {publishStatus?.published ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {publishStatus?.published ? "Re-Publish" : "POST"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardBody>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Feedback Detail" maxWidth="max-w-3xl">
        {detail && (
          <div className="space-y-5">
            <FeedbackDetailReport detail={detail} />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDetail(null)}>
                Close
              </Button>
              <Button onClick={downloadDetail} loading={downloadingDetail}>
                <FileDown className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmPublishOpen}
        title="Publish feedback results?"
        message="Are you sure you want to publish the feedback results to Faculty?"
        confirmLabel="Publish"
        danger={false}
        loading={publishing}
        onConfirm={handlePublish}
        onCancel={() => setConfirmPublishOpen(false)}
      />
    </Card>
  );
}

export default FacultyFeedback;
